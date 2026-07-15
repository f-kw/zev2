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
const fixtureId = 'nE_bNeBNp4E_multiblock_material_v001';
const experimentId = '20260716-third-material-run1-v002';
const sourceOutputPath = path.join(
  evalRoot,
  'outputs',
  'theme-generation',
  'nE_bNeBNp4E_chat_velocity_top100_input_selection_v004',
  'theme-llm-v002',
  '20260715-chat-velocity-top100-third-material-v001',
  'run-01-gemini-output.json'
);
const formalScorePath = path.join(
  evalRoot,
  'outputs',
  'theme-generation',
  'theme-llm-v002-20260715-chat-velocity-top100-third-material-v001-formal-score.json'
);
const promptTemplatePath = path.join(evalRoot, 'prompts', 'candidate_ranking_prompt_v002.md');
const outputRoot = path.join(evalRoot, 'outputs', 'candidate-ranking', experimentId);
const fixtureRoot = path.join(outputRoot, fixtureId);

const readJson = async (filePath) => JSON.parse(await readFile(filePath, 'utf8'));

function leakCheck(input) {
  const serialized = JSON.stringify(input);
  const forbidden = [
    'sourceStartMs',
    'sourceEndMs',
    'sourceVideoId',
    'evidenceRanges',
    'supportingSpeechIds',
    'transcript',
    'segments',
    'expected',
    'hitExpectedIndexes',
    'chatPeak',
    'chatMean',
    'laughter',
    'sourcePositionStartMs',
    'sourcePositionRatio',
    'answer',
    'answerLabel',
    'publish',
    'boring'
  ];
  const foundForbiddenFields = forbidden.filter((field) => serialized.includes(`"${field}"`));
  return {
    passed: foundForbiddenFields.length === 0,
    allowedCandidateFields: ['candidateId', 'title', 'reason'],
    foundForbiddenFields,
    candidateCount: input.candidates.length,
    note: '第三素材でも既存v002と同じく、候補ID・題名・理由だけを渡す。時刻、本文、チャット、expected、範囲hit、人間ラベルは渡さない。'
  };
}

async function main() {
  const [source, formalScore, promptTemplate] = await Promise.all([
    readJson(sourceOutputPath),
    readJson(formalScorePath),
    readFile(promptTemplatePath, 'utf8')
  ]);
  if (source.model !== 'gemini-web-flash' || !Array.isArray(source.themes) || source.themes.length === 0) {
    throw new Error('第三素材のテーマ生成結果が不正です');
  }
  if (formalScore.fixtureId !== fixtureId
    || formalScore.generationSystem !== 'theme-llm-v002@gemini-web-flash'
    || formalScore.summary.candidateCount !== source.themes.length) {
    throw new Error('第三素材の正式採点とテーマ候補が一致しません');
  }
  const input = {
    candidates: source.themes.map((theme, index) => ({
      candidateId: index + 1,
      title: theme.title,
      reason: theme.reason
    }))
  };
  for (const [index, candidate] of input.candidates.entries()) {
    if (JSON.stringify(Object.keys(candidate).sort()) !== JSON.stringify(['candidateId', 'reason', 'title'])
      || candidate.candidateId !== index + 1
      || candidate.title !== source.themes[index].title
      || candidate.reason !== source.themes[index].reason) {
      throw new Error(`candidate ${index + 1} の入力契約が不正です`);
    }
  }
  const leakage = leakCheck(input);
  if (!leakage.passed) throw new Error(`ランキング入力へ禁止情報が混入: ${leakage.foundForbiddenFields.join(', ')}`);

  const promptInputPath = path.join(fixtureRoot, 'prompt-input.json');
  const promptPath = path.join(fixtureRoot, 'prompt.txt');
  const leakCheckPath = path.join(fixtureRoot, 'leak-check.json');
  const outputPath = path.join(fixtureRoot, 'run-01-gemini-output.json');
  await mkdir(fixtureRoot, { recursive: true });
  await Promise.all([
    writeFile(promptInputPath, `${JSON.stringify(input, null, 2)}\n`),
    writeFile(promptPath, `${promptTemplate.trim()}\n\n## 入力JSON\n\n${JSON.stringify(input, null, 2)}\n`),
    writeFile(leakCheckPath, `${JSON.stringify(leakage, null, 2)}\n`)
  ]);

  const hitCandidateIds = formalScore.candidateAssessments
    .filter((candidate) => candidate.hitExpectedIndexes.length > 0)
    .map((candidate) => candidate.candidateIndex);
  const manifest = {
    kind: 'candidate_ranking_third_material_run_manifest',
    experimentId,
    preparedAt: new Date().toISOString(),
    fixtureId,
    generationSystem: 'candidate-ranking-v002@gemini-web-flash',
    promptVersion: 'candidate-ranking-v002',
    promptTemplatePath: path.relative(root, promptTemplatePath),
    model: 'gemini-web-flash',
    runCount: 1,
    inputPolicy: 'candidateId+title+reason only',
    fixedCondition: '第三素材だけを変更し、入力、v002プロンプト、モデル、出力契約、形式検査を既存2素材から変更しない。',
    sourceThemeGeneration: {
      path: path.relative(root, sourceOutputPath),
      generationSystem: formalScore.generationSystem,
      candidateCount: source.themes.length
    },
    scoringReferenceOnlyNotModelInput: {
      path: path.relative(root, formalScorePath),
      expectedCount: formalScore.summary.allExpected.expectedCount,
      hitExpectedCount: formalScore.summary.allExpected.hitCount,
      hitCandidateIds
    },
    fixture: {
      fixtureId,
      candidateCount: input.candidates.length,
      promptInputPath: path.relative(root, promptInputPath),
      promptPath: path.relative(root, promptPath),
      leakCheckPath: path.relative(root, leakCheckPath),
      outputPath: path.relative(root, outputPath)
    },
    humanReviewAfterRanking: {
      thirdMaterialTaskCount: 5,
      thirdMaterialTimeLimitMinutes: 15,
      session1: '第三素材の順位1〜3と既判定候補2件を無印で混ぜる。既判定候補は再現性だけを別集計する。',
      session2: '第三素材の順位4〜5だけを提示する。',
      maximumDecisionsPerSession: 5
    },
    fixtureAndExpectedChanges: false
  };
  await writeFile(path.join(outputRoot, 'run-manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
  console.log(JSON.stringify({
    status: 'prepared',
    experimentId,
    fixtureId,
    candidateCount: input.candidates.length,
    leakCheck: leakage.passed,
    promptPath: path.relative(root, promptPath),
    outputPath: path.relative(root, outputPath)
  }, null, 2));
}

main().catch((error) => {
  console.error(error.stack ?? error.message);
  process.exitCode = 1;
});
