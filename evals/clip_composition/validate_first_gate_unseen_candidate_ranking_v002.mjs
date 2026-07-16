#!/usr/bin/env node
import { existsSync } from 'node:fs';
import { readFile, writeFile } from 'node:fs/promises';
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
const experimentRoot = path.join(root, 'evals', 'clip_composition', 'outputs', 'candidate-ranking', '20260716-first-gate-unseen-run1-v002');
const readJson = async (filePath) => JSON.parse(await readFile(filePath, 'utf8'));

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
    if (!isSingleSentence(item?.reason)) errors.push(`${offset + 1}件目の選定理由が1文ではない`);
    ranks.push(item?.rank);
    ids.push(item?.candidateId);
  }
  if (JSON.stringify(ranks) !== JSON.stringify([1, 2, 3, 4, 5])) errors.push('順位が1〜5の連番ではない');
  if (new Set(ids).size !== ids.length) errors.push('候補IDが重複している');
  return { passed: errors.length === 0, errors };
}

async function main() {
  const manifest = await readJson(path.join(experimentRoot, 'run-manifest.json'));
  const sourceRoot = path.join(experimentRoot, manifest.sourceId);
  const [input, leakage, output, sourceThemes] = await Promise.all([
    readJson(path.join(sourceRoot, 'prompt-input.json')),
    readJson(path.join(sourceRoot, 'leak-check.json')),
    readJson(path.join(sourceRoot, 'run-01-gemini-output.json')),
    readJson(path.join(root, manifest.sourceThemeGeneration.path))
  ]);
  if (manifest.promptVersion !== 'candidate-ranking-v002'
    || manifest.runCount !== 1
    || !leakage.passed
    || sourceThemes.themes.length !== input.candidates.length) {
    throw new Error('実走前に固定したランキング条件または入力が不正です');
  }
  const validation = validateOutput(output, input);
  if (!validation.passed) throw new Error(`ランキング出力が形式不成立: ${validation.errors.join(' / ')}`);

  const rankedCandidates = output.rankedCandidates.map((selection) => {
    const candidate = input.candidates[selection.candidateId - 1];
    const sourceTheme = sourceThemes.themes[selection.candidateId - 1];
    if (!candidate || !sourceTheme) throw new Error(`candidate ${selection.candidateId} の元候補がありません`);
    return {
      rank: selection.rank,
      candidateId: selection.candidateId,
      title: candidate.title,
      sourceReason: candidate.reason,
      selectionReason: selection.reason,
      evidenceRanges: sourceTheme.evidenceRanges,
      labelStatus: 'formal-unseen-unlabeled-human-judgment-required'
    };
  });
  const result = {
    kind: 'candidate_ranking_v002_first_gate_unseen_run1_result',
    validatedAt: new Date().toISOString(),
    sourceId: manifest.sourceId,
    generationSystem: manifest.generationSystem,
    model: output.model,
    runCount: 1,
    inputPolicy: manifest.inputPolicy,
    formatValidation: validation,
    leakCheck: leakage,
    sourceCandidateCount: input.candidates.length,
    rankedCandidates,
    scoringStatus: 'formal-unseen-no-teacher-score; awaiting-human-edit-instruction-trial',
    nextHumanTrial: manifest.formalHumanTrialAfterRanking,
    fixtureAndExpectedChanges: false
  };
  const resultPath = path.join(experimentRoot, 'result.json');
  await writeFile(resultPath, `${JSON.stringify(result, null, 2)}\n`);
  console.log(JSON.stringify({
    status: 'validated',
    resultPath: path.relative(root, resultPath),
    sourceCandidateCount: result.sourceCandidateCount,
    top5: rankedCandidates.map(({ rank, candidateId, title }) => ({ rank, candidateId, title }))
  }, null, 2));
}

main().catch((error) => {
  console.error(error.stack ?? error.message);
  process.exitCode = 1;
});
