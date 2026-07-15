#!/usr/bin/env node
import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

function workspaceRoot() {
  let current = process.cwd();
  while (!existsSync(path.join(current, 'pnpm-workspace.yaml'))) {
    const parent = path.dirname(current);
    if (parent === current) throw new Error('pnpm-workspace.yaml が見つかりません');
    current = parent;
  }
  return current;
}

const root = workspaceRoot();
const evalRoot = path.join(root, 'evals', 'clip_composition');
const experimentRoot = path.join(evalRoot, 'outputs', 'candidate-ranking', '20260716-third-material-run1-v002');
const fixtureId = 'nE_bNeBNp4E_multiblock_material_v001';
const fixtureRoot = path.join(experimentRoot, fixtureId);
const formalScorePath = path.join(
  evalRoot,
  'outputs',
  'theme-generation',
  'theme-llm-v002-20260715-chat-velocity-top100-third-material-v001-formal-score.json'
);
const resultPath = path.join(experimentRoot, 'result.json');
const reportPath = path.join(evalRoot, 'reports', 'candidate-ranking', 'candidate-ranking-v002-third-material-run1-result-20260716.md');
const readJson = async (filePath) => JSON.parse(await readFile(filePath, 'utf8'));

function validateOutput(output, input) {
  const errors = [];
  if (output.model !== 'gemini-web-flash') errors.push(`モデル不一致: ${output.model}`);
  if (output.params?.generationSystem !== 'candidate-ranking-v002@gemini-web-flash') errors.push('生成系統不一致');
  const ranked = Array.isArray(output.rankedCandidates) ? output.rankedCandidates : [];
  if (ranked.length !== 5) errors.push(`候補数が5件ではない: ${ranked.length}`);
  const validIds = new Set(input.candidates.map((candidate) => candidate.candidateId));
  const ranks = [];
  const ids = [];
  for (const [offset, item] of ranked.entries()) {
    const keys = item && typeof item === 'object' ? Object.keys(item).sort() : [];
    if (JSON.stringify(keys) !== JSON.stringify(['candidateId', 'rank', 'reason'])) errors.push(`${offset + 1}件目の出力欄が契約外`);
    if (!Number.isInteger(item?.rank)) errors.push(`${offset + 1}件目の順位が整数ではない`);
    if (!Number.isInteger(item?.candidateId) || !validIds.has(item.candidateId)) errors.push(`${offset + 1}件目の候補IDが入力にない`);
    if (!isSingleSentence(item?.reason)) {
      errors.push(`${offset + 1}件目の選定理由が1文ではない`);
    }
    ranks.push(item?.rank);
    ids.push(item?.candidateId);
  }
  if (JSON.stringify(ranks) !== JSON.stringify([1, 2, 3, 4, 5])) errors.push('順位が1〜5の連番ではない');
  if (new Set(ids).size !== ids.length) errors.push('候補IDが重複している');
  return { passed: errors.length === 0, errors };
}

function isSingleSentence(value) {
  if (typeof value !== 'string' || !value.trim() || value.includes('\n')) return false;
  const text = value.trim();
  if (!/[。！？!?]$/.test(text)) return false;
  const closingByOpening = new Map([['「', '」'], ['『', '』'], ['“', '”']]);
  const closing = new Set(closingByOpening.values());
  const stack = [];
  let asciiQuoteOpen = false;
  let sentenceEndCount = 0;
  for (const character of text) {
    if (closingByOpening.has(character)) {
      stack.push(closingByOpening.get(character));
      continue;
    }
    if (closing.has(character)) {
      if (stack.at(-1) === character) stack.pop();
      continue;
    }
    if (character === '"') {
      asciiQuoteOpen = !asciiQuoteOpen;
      continue;
    }
    if (stack.length === 0 && !asciiQuoteOpen && /[。！？!?]/.test(character)) sentenceEndCount += 1;
  }
  return stack.length === 0 && !asciiQuoteOpen && sentenceEndCount === 1;
}

async function main() {
  const [manifest, input, leakage, output, formalScore] = await Promise.all([
    readJson(path.join(experimentRoot, 'run-manifest.json')),
    readJson(path.join(fixtureRoot, 'prompt-input.json')),
    readJson(path.join(fixtureRoot, 'leak-check.json')),
    readJson(path.join(fixtureRoot, 'run-01-gemini-output.json')),
    readJson(formalScorePath)
  ]);
  if (manifest.fixtureId !== fixtureId
    || manifest.promptVersion !== 'candidate-ranking-v002'
    || manifest.runCount !== 1
    || !leakage.passed) {
    throw new Error('実走前に固定したランキング条件またはリーク検査が不正です');
  }
  const validation = validateOutput(output, input);
  if (!validation.passed) throw new Error(`ランキング出力が形式不成立: ${validation.errors.join(' / ')}`);
  if (formalScore.fixtureId !== fixtureId || formalScore.summary.candidateCount !== input.candidates.length) {
    throw new Error('正式採点とランキング入力の候補数が一致しません');
  }
  const assessmentById = new Map(formalScore.candidateAssessments.map((candidate) => [candidate.candidateIndex, candidate]));
  const rankedCandidates = output.rankedCandidates.map((selection) => {
    const source = input.candidates[selection.candidateId - 1];
    const assessment = assessmentById.get(selection.candidateId);
    if (!source || !assessment) throw new Error(`candidate ${selection.candidateId} の元候補がありません`);
    return {
      rank: selection.rank,
      candidateId: selection.candidateId,
      title: source.title,
      sourceReason: source.reason,
      selectionReason: selection.reason,
      isKnownHit: assessment.hitExpectedIndexes.length > 0,
      hitExpectedIndexes: assessment.hitExpectedIndexes,
      labelStatus: assessment.hitExpectedIndexes.length > 0 ? 'known-hit' : 'unlabeled-not-an-automatic-error'
    };
  });
  const generationOrderCandidates = input.candidates.slice(0, 5).map((candidate) => ({
    candidateId: candidate.candidateId,
    isKnownHit: assessmentById.get(candidate.candidateId).hitExpectedIndexes.length > 0
  }));
  const result = {
    kind: 'candidate_ranking_v002_third_material_run1_result',
    scoredAt: new Date().toISOString(),
    fixtureId,
    generationSystem: manifest.generationSystem,
    model: output.model,
    runCount: 1,
    inputPolicy: manifest.inputPolicy,
    formatValidation: validation,
    leakCheck: leakage,
    sourceCandidateCount: input.candidates.length,
    sourceThemeScore: {
      inputVisibleExpected: formalScore.summary.inputVisible,
      allExpected: formalScore.summary.allExpected,
      hitCandidateCount: formalScore.candidateAssessments.filter((candidate) => candidate.hitExpectedIndexes.length > 0).length
    },
    rankedCandidates,
    knownHitComparison: {
      generationOrderTop5: generationOrderCandidates.filter((candidate) => candidate.isKnownHit).length,
      candidateRankingV002Top5: rankedCandidates.filter((candidate) => candidate.isKnownHit).length,
      note: '非hit候補は未ラベルであり誤りと決めない。公開価値は次の手直し試験で人間が判定する。'
    },
    nextHumanReview: manifest.humanReviewAfterRanking,
    scoringStatus: 'known-hit-scored; publish-value-awaiting-human-trim-trial',
    fixtureAndExpectedChanges: false
  };
  const rows = rankedCandidates.map((candidate) => `| ${candidate.rank} | ${candidate.candidateId} | ${candidate.isKnownHit ? `既知hit（expected ${candidate.hitExpectedIndexes.join(', ')}）` : '未ラベル'} | ${candidate.title.replace(/\|/g, '｜')} |`);
  const report = `# candidate-ranking-v002 第三素材 run 1 結果\n\n- 素材: \`${fixtureId}\`\n- 生成系統: \`${result.generationSystem}\`\n- 入力: 67候補のcandidateId・題名・理由だけ\n- 固定条件: v002プロンプト、モデル、出力契約、run 1を既存2素材から変更なし\n- 形式検査: pass\n- リーク検査: pass\n- Gemini処理タブ: 結果保存後に閉鎖確認\n- 人間作業: 現段階は0件・0分\n\n## 上位5\n\n| 順位 | candidate | 既知実績との重なり | 題名 |\n| ---: | ---: | --- | --- |\n${rows.join('\n')}\n\n## 機械採点\n\n- 生成順上位5の既知hit: ${result.knownHitComparison.generationOrderTop5}/5\n- candidate-ranking-v002上位5の既知hit: ${result.knownHitComparison.candidateRankingV002Top5}/5\n- テーマ生成が到達した正解: ${formalScore.summary.allExpected.hitCount}/${formalScore.summary.allExpected.expectedCount}\n- 範囲hit候補: ${result.sourceThemeScore.hitCandidateCount}/${result.sourceCandidateCount}\n\n非hitは「実在切り抜きと重ならなかった」だけで、公開価値のない誤りとは扱わない。第三素材の上位5を同じ手直し試験へ出し、公開する・選ばない・文脈不明と境界選択で判定する。\n\n## 次の人間確認\n\n- セッション1: 第三素材の上位1〜3位と、過去に判定済みの再現性確認2件をラベルなしで混ぜる（合計5件）。\n- セッション2: 第三素材の上位4〜5位だけ（合計2件）。\n- 第三素材の判定は2セッション合計5件、15分上限。再現性確認2件は第三素材の本数・時間から分離する。\n`;
  await mkdir(path.dirname(reportPath), { recursive: true });
  await Promise.all([
    writeFile(resultPath, `${JSON.stringify(result, null, 2)}\n`),
    writeFile(reportPath, report)
  ]);
  console.log(JSON.stringify({
    status: 'scored',
    resultPath: path.relative(root, resultPath),
    reportPath: path.relative(root, reportPath),
    generationOrderKnownHitAt5: result.knownHitComparison.generationOrderTop5,
    rankingV002KnownHitAt5: result.knownHitComparison.candidateRankingV002Top5,
    rankedCandidates: rankedCandidates.map((candidate) => ({ rank: candidate.rank, candidateId: candidate.candidateId, knownHit: candidate.isKnownHit }))
  }, null, 2));
}

main().catch((error) => {
  console.error(error.stack ?? error.message);
  process.exitCode = 1;
});
