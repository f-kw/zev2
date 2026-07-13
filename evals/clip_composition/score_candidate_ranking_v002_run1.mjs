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
const experimentRoot = path.join(evalRoot, 'outputs', 'candidate-ranking', '20260713-character-context-run1-v002');
const oldRoot = path.join(evalRoot, 'outputs', 'candidate-ranking', '20260713-title-reason-run1-v001');
const paths = {
  manifest: path.join(experimentRoot, 'run-manifest.json'),
  desk: path.join(evalRoot, 'outputs', 'candidate-ranking', '20260713-signal-desk-check-v001', 'result.json'),
  v001: path.join(oldRoot, 'result.json'),
  v001Human: path.join(oldRoot, 'human-review-unlabeled-v001', 'human-review-result.json'),
  generationHuman: path.join(oldRoot, 'human-review-generation-order-v001', 'human-review-result.json'),
  result: path.join(experimentRoot, 'result.json'),
  report: path.join(evalRoot, 'reports', 'candidate-ranking', 'candidate-ranking-v002-run1-preaudit-result-20260713.md')
};
const readJson = async (file) => JSON.parse(await readFile(file, 'utf8'));

function formatValidation(output, candidates) {
  const errors = [];
  if (output.model !== 'gemini-web-flash') errors.push(`model不一致: ${output.model}`);
  const ranked = Array.isArray(output.rankedCandidates) ? output.rankedCandidates : [];
  if (ranked.length !== 5) errors.push(`件数不正: ${ranked.length}`);
  const validIds = new Set(candidates.map((candidate) => candidate.candidateId));
  const ranks = [];
  const ids = [];
  for (const [index, item] of ranked.entries()) {
    const keys = item && typeof item === 'object' ? Object.keys(item).sort() : [];
    if (JSON.stringify(keys) !== JSON.stringify(['candidateId', 'rank', 'reason'])) errors.push(`item ${index + 1} field不正`);
    if (!Number.isInteger(item?.rank)) errors.push(`item ${index + 1} rank不正`);
    if (!Number.isInteger(item?.candidateId) || !validIds.has(item?.candidateId)) errors.push(`item ${index + 1} candidateId不正`);
    if (typeof item?.reason !== 'string' || !item.reason.trim() || item.reason.includes('\n') || (item.reason.match(/[。！？!?]/g) ?? []).length !== 1 || !/[。！？!?]$/.test(item.reason.trim())) errors.push(`item ${index + 1} reason一文制約違反`);
    ranks.push(item?.rank);
    ids.push(item?.candidateId);
  }
  if (JSON.stringify(ranks) !== JSON.stringify([1, 2, 3, 4, 5])) errors.push('rank 1〜5不成立');
  if (new Set(ids).size !== ids.length) errors.push('candidateId重複');
  return { passed: errors.length === 0, errors };
}

function addHumanLabels(map, result) {
  const items = [...(result.items ?? []), ...(result.newItems ?? []), ...(result.reusedAnswers ?? [])];
  for (const item of items) {
    const key = `${item.fixtureId}:${item.candidateId}`;
    const existing = map.get(key);
    if (existing && existing.answer !== item.answer) throw new Error(`人間ラベル矛盾: ${key}`);
    map.set(key, { answer: item.answer, answerLabel: item.answerLabel, sourceReviewId: result.reviewId });
  }
}

async function main() {
  const [manifest, desk, v001, v001Human, generationHuman] = await Promise.all([
    readJson(paths.manifest), readJson(paths.desk), readJson(paths.v001), readJson(paths.v001Human), readJson(paths.generationHuman)
  ]);
  const humanLabels = new Map();
  addHumanLabels(humanLabels, v001Human);
  addHumanLabels(humanLabels, generationHuman);
  const fixtures = [];
  for (const fixtureManifest of manifest.fixtures) {
    const deskFixture = desk.fixtures.find((fixture) => fixture.fixtureId === fixtureManifest.fixtureId);
    const v001Fixture = v001.fixtures.find((fixture) => fixture.fixtureId === fixtureManifest.fixtureId);
    if (!deskFixture || !v001Fixture) throw new Error(`${fixtureManifest.fixtureId} 比較元なし`);
    const [input, output, leakage] = await Promise.all([
      readJson(path.join(root, fixtureManifest.promptInputPath)), readJson(path.join(root, fixtureManifest.outputPath)), readJson(path.join(root, fixtureManifest.leakCheckPath))
    ]);
    if (!leakage.passed) throw new Error(`${fixtureManifest.fixtureId} リーク検査失敗`);
    const validation = formatValidation(output, input.candidates);
    if (!validation.passed) throw new Error(`${fixtureManifest.fixtureId} 形式不成立: ${validation.errors.join(' / ')}`);
    const sourceById = new Map(deskFixture.candidates.map((candidate) => [candidate.candidateIndex, candidate]));
    const rankedCandidates = [...output.rankedCandidates].sort((a, b) => a.rank - b.rank).map((selection) => {
      const source = sourceById.get(selection.candidateId);
      const isKnownHit = source.hitExpectedIndexes.length > 0;
      const human = isKnownHit ? null : humanLabels.get(`${fixtureManifest.fixtureId}:${selection.candidateId}`) ?? null;
      return {
        rank: selection.rank,
        candidateId: selection.candidateId,
        title: source.title,
        sourceReason: source.reason,
        selectionReason: selection.reason,
        isKnownHit,
        hitExpectedIndexes: source.hitExpectedIndexes,
        humanLabel: human,
        labelStatus: isKnownHit ? 'known-hit' : human ? 'human-reviewed' : 'unlabeled-needs-human-review',
        countsAsStrong: isKnownHit || human?.answer === 'publish',
        countsAsReviewWorthy: isKnownHit || human?.answer === 'publish' || human?.answer === 'okay_skip'
      };
    });
    const selectedIds = new Set(rankedCandidates.map((candidate) => candidate.candidateId));
    const droppedKnownHitsFromV001 = v001Fixture.rankedCandidates.filter((candidate) => candidate.isKnownHit && !selectedIds.has(candidate.candidateId)).map((candidate) => ({
      candidateId: candidate.candidateId,
      title: candidate.title,
      sourceReason: candidate.sourceReason,
      v001Rank: candidate.rank,
      reasonReactionDiagnosis: 'pending-manual-diagnosis'
    }));
    const knownHitCount = rankedCandidates.filter((candidate) => candidate.isKnownHit).length;
    const knownLabels = rankedCandidates.filter((candidate) => candidate.isKnownHit || candidate.humanLabel);
    const unreviewedCandidates = rankedCandidates.filter((candidate) => candidate.labelStatus === 'unlabeled-needs-human-review');
    fixtures.push({
      fixtureId: fixtureManifest.fixtureId,
      candidateCount: input.candidates.length,
      generationSystem: manifest.generationSystem,
      model: output.model,
      run: 1,
      formatValidation: validation,
      leakCheck: leakage,
      knownHit: { candidateCountAt5: knownHitCount, expectedIndexes: [...new Set(rankedCandidates.flatMap((candidate) => candidate.hitExpectedIndexes))].sort((a, b) => a - b) },
      currentlyKnownMixedScore: {
        strongLowerBound: knownLabels.filter((candidate) => candidate.countsAsStrong).length,
        reviewWorthyLowerBound: knownLabels.filter((candidate) => candidate.countsAsReviewWorthy).length,
        unlabeledCount: unreviewedCandidates.length,
        denominator: 5,
        finalAfterHumanReview: unreviewedCandidates.length === 0
      },
      rankedCandidates,
      unreviewedCandidates,
      droppedKnownHitsFromV001
    });
  }
  const exactHumanReviewCount = fixtures.reduce((sum, fixture) => sum + fixture.unreviewedCandidates.length, 0);
  const result = {
    kind: 'candidate_ranking_v002_run1_preaudit_result',
    scoredAt: new Date().toISOString(),
    generationSystem: manifest.generationSystem,
    model: manifest.model,
    runCount: 1,
    inputPolicy: manifest.inputPolicy,
    fixedBaselineBeforeRun: manifest.fixedBaselineBeforeRun,
    scoringStatus: exactHumanReviewCount === 0 ? 'final' : 'awaiting-human-review-for-strong-candidate-rate',
    humanWork: { exactNewItemCount: exactHumanReviewCount, estimatedMinutesPerItemUpperBound: 1, estimatedTotalMinutes: exactHumanReviewCount },
    fixtures
  };
  const lines = [
    '# candidate-ranking-v002 run 1 監査前結果', '',
    `- 生成系統: ${result.generationSystem}`,
    '- 入力: candidateId / title / reasonのみ。具体候補の三択ラベル、時刻、transcript、expectedは未入力。',
    '- 形式検査・リーク検査: 2素材ともpass。',
    `- 新規人間監査: ${exactHumanReviewCount}件、上限1分/件、合計約${exactHumanReviewCount}分。`, '',
    '| 素材 | 既知hit/5 | 既ラベルだけの強い候補下限 | 確認価値あり下限 | 新規監査 |',
    '| --- | ---: | ---: | ---: | ---: |'
  ];
  for (const fixture of fixtures) lines.push(`| ${fixture.fixtureId} | ${fixture.knownHit.candidateCountAt5}/5 | ${fixture.currentlyKnownMixedScore.strongLowerBound}/5 | ${fixture.currentlyKnownMixedScore.reviewWorthyLowerBound}/5 | ${fixture.currentlyKnownMixedScore.unlabeledCount}件 |`);
  for (const fixture of fixtures) {
    lines.push('', `## ${fixture.fixtureId} 上位5`, '', '| rank | candidate | ラベル | title |', '| ---: | ---: | --- | --- |');
    for (const candidate of fixture.rankedCandidates) lines.push(`| ${candidate.rank} | ${candidate.candidateId} | ${candidate.labelStatus}${candidate.humanLabel ? `: ${candidate.humanLabel.answerLabel}` : ''} | ${candidate.title.replace(/\|/g, '｜')} |`);
    lines.push('', '### v001から落ちた既知hit');
    if (fixture.droppedKnownHitsFromV001.length === 0) lines.push('', '- なし');
    for (const candidate of fixture.droppedKnownHitsFromV001) lines.push('', `- candidate ${candidate.candidateId}: ${candidate.title}`, `  - reason: ${candidate.sourceReason}`, '  - 演者反応の記述判定: 実走後の手動診断待ち');
  }
  lines.push('', '強い候補率の最終値とv002採否は、新規未ラベルの三択監査後に確定する。', '');
  await mkdir(path.dirname(paths.report), { recursive: true });
  await Promise.all([writeFile(paths.result, `${JSON.stringify(result, null, 2)}\n`), writeFile(paths.report, `${lines.join('\n').trimEnd()}\n`)]);
  console.log(JSON.stringify({ status: 'complete', resultPath: path.relative(root, paths.result), reportPath: path.relative(root, paths.report), exactHumanReviewCount, fixtures: fixtures.map((fixture) => ({ fixtureId: fixture.fixtureId, knownHit: fixture.knownHit.candidateCountAt5, unlabeled: fixture.currentlyKnownMixedScore.unlabeledCount, droppedKnownHits: fixture.droppedKnownHitsFromV001.map((candidate) => candidate.candidateId) })) }, null, 2));
}

main().catch((error) => { console.error(error.stack ?? error.message); process.exitCode = 1; });
