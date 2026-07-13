#!/usr/bin/env node
import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

function workspaceRoot() {
  let current = process.cwd();
  while (!existsSync(path.join(current, 'pnpm-workspace.yaml'))) {
    const parent = path.dirname(current);
    if (parent === current) throw new Error('workspaceなし');
    current = parent;
  }
  return current;
}

const root = workspaceRoot();
const evalRoot = path.join(root, 'evals', 'clip_composition');
const experimentRoot = path.join(evalRoot, 'outputs', 'candidate-ranking', '20260713-title-reason-run1-v001');
const manifestPath = path.join(experimentRoot, 'run-manifest.json');
const deskResultPath = path.join(evalRoot, 'outputs', 'candidate-ranking', '20260713-signal-desk-check-v001', 'result.json');
const resultPath = path.join(experimentRoot, 'result.json');
const reportPath = path.join(evalRoot, 'reports', 'candidate-ranking', 'candidate-ranking-v001-title-reason-run1-result-20260713.md');
const readJson = async (file) => JSON.parse(await readFile(file, 'utf8'));

function formatValidation(output, candidates) {
  const errors = [];
  if (output.model !== 'gemini-web-flash') errors.push(`model不一致: ${output.model}`);
  if (!Array.isArray(output.rankedCandidates)) errors.push('rankedCandidatesなし');
  const ranked = Array.isArray(output.rankedCandidates) ? output.rankedCandidates : [];
  if (ranked.length !== 5) errors.push(`件数が5ではない: ${ranked.length}`);
  const candidateIds = new Set(candidates.map((item) => item.candidateId));
  const ranks = [];
  const selectedIds = [];
  for (let index = 0; index < ranked.length; index += 1) {
    const item = ranked[index];
    const keys = item && typeof item === 'object' ? Object.keys(item).sort() : [];
    if (JSON.stringify(keys) !== JSON.stringify(['candidateId', 'rank', 'reason'])) errors.push(`rankedCandidates[${index}] field不正: ${keys.join(',')}`);
    if (!Number.isInteger(item?.rank)) errors.push(`rankedCandidates[${index}] rank不正`);
    if (!Number.isInteger(item?.candidateId)) errors.push(`rankedCandidates[${index}] candidateId不正`);
    if (typeof item?.reason !== 'string' || !item.reason.trim()) {
      errors.push(`rankedCandidates[${index}] reasonなし`);
    } else {
      const reason = item.reason.trim();
      const sentenceEndCount = (reason.match(/[。！？!?]/g) ?? []).length;
      if (reason.includes('\n') || sentenceEndCount !== 1 || !/[。！？!?]$/.test(reason)) {
        errors.push(`rankedCandidates[${index}] reasonが1文ではない`);
      }
    }
    ranks.push(item?.rank);
    selectedIds.push(item?.candidateId);
    if (!candidateIds.has(item?.candidateId)) errors.push(`存在しないcandidateId: ${item?.candidateId}`);
  }
  if (JSON.stringify(ranks) !== JSON.stringify([1, 2, 3, 4, 5])) errors.push(`順位の欠落・順序不正: ${ranks.join(',')}`);
  if (new Set(ranks).size !== ranks.length) errors.push('順位重複');
  if (new Set(selectedIds).size !== selectedIds.length) errors.push('candidateId重複');
  return { passed: errors.length === 0, errors };
}

function rankingRow(name, ranking) {
  return {
    name,
    hitCandidateCountAt5: ranking.hitCandidateCountAt5,
    expectedCoveredCount: ranking.allExpected.coveredCount,
    expectedDenominator: ranking.allExpected.denominator
  };
}

async function main() {
  const [manifest, desk] = await Promise.all([readJson(manifestPath), readJson(deskResultPath)]);
  const fixtures = [];
  for (const fixtureManifest of manifest.fixtures) {
    const deskFixture = desk.fixtures.find((item) => item.fixtureId === fixtureManifest.fixtureId);
    if (!deskFixture) throw new Error(`${fixtureManifest.fixtureId} 机上結果なし`);
    const [promptInput, output, leakage] = await Promise.all([
      readJson(path.join(root, fixtureManifest.promptInputPath)),
      readJson(path.join(root, fixtureManifest.outputPath)),
      readJson(path.join(root, fixtureManifest.leakCheckPath))
    ]);
    if (!leakage.passed) throw new Error(`${fixtureManifest.fixtureId} リーク検査失敗`);
    const validation = formatValidation(output, promptInput.candidates);
    if (!validation.passed) throw new Error(`${fixtureManifest.fixtureId} 形式不成立: ${validation.errors.join(' / ')}`);
    const sourceById = new Map(deskFixture.candidates.map((item) => [item.candidateIndex, item]));
    const ranked = [...output.rankedCandidates].sort((a, b) => a.rank - b.rank).map((selection) => {
      const source = sourceById.get(selection.candidateId);
      const isHit = source.hitExpectedIndexes.length > 0;
      return {
        rank: selection.rank,
        candidateId: selection.candidateId,
        title: source.title,
        sourceReason: source.reason,
        selectionReason: selection.reason,
        isKnownHit: isHit,
        hitExpectedIndexes: source.hitExpectedIndexes,
        assessment: isHit ? 'known-hit' : 'unlabeled-discovery-needs-human-review-not-error'
      };
    });
    const hitCandidateCountAt5 = ranked.filter((item) => item.isKnownHit).length;
    const coveredExpectedIndexes = [...new Set(ranked.flatMap((item) => item.hitExpectedIndexes))].sort((a, b) => a - b);
    const semantic = {
      name: 'title_reason_semantic',
      hitCandidateCountAt5,
      expectedCoveredCount: coveredExpectedIndexes.length,
      expectedDenominator: deskFixture.expectedCount
    };
    fixtures.push({
      fixtureId: fixtureManifest.fixtureId,
      candidateCount: promptInput.candidates.length,
      generationSystem: manifest.generationSystem,
      model: output.model,
      run: 1,
      formatValidation: validation,
      leakCheck: leakage,
      primaryMetric: { hitCandidateCountAt5 },
      secondaryMetric: { coveredExpectedIndexes, coveredCount: coveredExpectedIndexes.length, denominator: deskFixture.expectedCount },
      rankedCandidates: ranked,
      nonHitDiscoveries: ranked.filter((item) => !item.isKnownHit),
      comparisonRows: [...deskFixture.rankings.map((item) => rankingRow(item.name, item)), semantic]
    });
  }
  const result = {
    kind: 'candidate_ranking_title_reason_run1_result',
    scoredAt: new Date().toISOString(),
    generationSystem: manifest.generationSystem,
    model: manifest.model,
    runCount: 1,
    inputPolicy: manifest.inputPolicy,
    primaryMetric: 'known hit candidates in top 5',
    nonHitPolicy: 'not an error; list as unlabeled discoveries requiring optional human review',
    humanReviewPerformed: false,
    fixtures
  };
  const lines = [
    '# candidate-ranking-v001 title/reason run 1 結果', '',
    `- 生成系統: ${result.generationSystem}`,
    '- 入力: candidateId + title + reasonのみ。時刻・transcript・根拠範囲・expected・機械信号なし。',
    '- 主指標: 既知hit候補が上位5へ入った数。',
    '- 非hit: 誤りにせず、未ラベルの発見として一覧化。人間意味監査は未実施。', '',
    '## 比較', '',
    '| fixture | 系統 | hit候補/5 | expected被覆 |',
    '| --- | --- | ---: | ---: |'
  ];
  for (const fixture of fixtures) {
    for (const row of fixture.comparisonRows) {
      lines.push(`| ${fixture.fixtureId} | ${row.name} | ${row.hitCandidateCountAt5}/5 | ${row.expectedCoveredCount}/${row.expectedDenominator} |`);
    }
  }
  for (const fixture of fixtures) {
    lines.push('', `## ${fixture.fixtureId} 上位5`, '', '| rank | candidate | known hit | title | 選定理由 |', '| ---: | ---: | --- | --- | --- |');
    for (const item of fixture.rankedCandidates) {
      lines.push(`| ${item.rank} | ${item.candidateId} | ${item.isKnownHit ? `yes (${item.hitExpectedIndexes.join(',')})` : '非hit・未ラベル'} | ${item.title.replace(/\|/g, '｜')} | ${item.selectionReason.replace(/\|/g, '｜')} |`);
    }
    lines.push('', '### 上位5の非hit候補（発見一覧）', '');
    if (fixture.nonHitDiscoveries.length === 0) lines.push('- なし');
    for (const item of fixture.nonHitDiscoveries) {
      lines.push(`- rank ${item.rank} / candidate ${item.candidateId} / ${item.title}`);
      lines.push(`  - 元のreason: ${item.sourceReason}`);
      lines.push(`  - 順位選定理由: ${item.selectionReason}`);
      lines.push('  - 扱い: 誤りではなく、要目視の未ラベル発見。');
    }
  }
  lines.push('', '## 形式・制約', '', '- 2素材とも上位5件、順位1〜5、候補ID重複なし、存在しないIDなし。', '- リーク検査pass。', '- 追加の人間作業0件・0分。', '');
  await mkdir(path.dirname(reportPath), { recursive: true });
  await Promise.all([
    writeFile(resultPath, `${JSON.stringify(result, null, 2)}\n`),
    writeFile(reportPath, `${lines.join('\n').trimEnd()}\n`)
  ]);
  console.log(JSON.stringify({ status: 'complete', resultPath: path.relative(root, resultPath), reportPath: path.relative(root, reportPath), fixtures: fixtures.map((item) => ({ fixtureId: item.fixtureId, primaryMetric: item.primaryMetric, nonHitDiscoveryCount: item.nonHitDiscoveries.length })) }, null, 2));
}

main().catch((error) => {
  console.error(error.stack ?? error.message);
  process.exitCode = 1;
});
