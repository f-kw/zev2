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
const experimentId = '20260716-first-gate-unseen-run1-v002';
const sourceId = 'DmWu0jVQfTE';
const sourceOutputPath = path.join(
  evalRoot,
  'outputs',
  'theme-generation',
  'DmWu0jVQfTE_chat_velocity_top100_input_selection_v004',
  'theme-llm-v002',
  '20260716-first-gate-unseen-v001',
  'run-01-gemini-output.json'
);
const promptTemplatePath = path.join(evalRoot, 'prompts', 'candidate_ranking_prompt_v002.md');
const outputRoot = path.join(evalRoot, 'outputs', 'candidate-ranking', experimentId);
const sourceRoot = path.join(outputRoot, sourceId);
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
    note: '正式初見素材でも固定済みv002と同じく、候補ID・題名・理由だけを渡す。時刻、本文、チャット、正解、人間ラベルは渡さない。'
  };
}

async function main() {
  const [source, promptTemplate] = await Promise.all([
    readJson(sourceOutputPath),
    readFile(promptTemplatePath, 'utf8')
  ]);
  if (source.model !== 'gemini-web-flash' || !Array.isArray(source.themes) || source.themes.length < 5) {
    throw new Error('正式初見素材のテーマ生成結果が不正です');
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

  const promptInputPath = path.join(sourceRoot, 'prompt-input.json');
  const promptPath = path.join(sourceRoot, 'prompt.txt');
  const leakCheckPath = path.join(sourceRoot, 'leak-check.json');
  const outputPath = path.join(sourceRoot, 'run-01-gemini-output.json');
  await mkdir(sourceRoot, { recursive: true });
  await Promise.all([
    writeFile(promptInputPath, `${JSON.stringify(input, null, 2)}\n`),
    writeFile(promptPath, `${promptTemplate.trim()}\n\n## 入力JSON\n\n${JSON.stringify(input, null, 2)}\n`),
    writeFile(leakCheckPath, `${JSON.stringify(leakage, null, 2)}\n`)
  ]);

  const manifest = {
    kind: 'candidate_ranking_first_gate_unseen_run_manifest',
    experimentId,
    preparedAt: new Date().toISOString(),
    sourceId,
    generationSystem: 'candidate-ranking-v002@gemini-web-flash',
    promptVersion: 'candidate-ranking-v002',
    promptTemplatePath: path.relative(root, promptTemplatePath),
    model: 'gemini-web-flash',
    runCount: 1,
    inputPolicy: 'candidateId+title+reason only',
    fixedCondition: '正式初見素材だけを変更し、入力、v002プロンプト、モデル、出力契約、形式検査を第三素材から変更しない。',
    sourceThemeGeneration: {
      path: path.relative(root, sourceOutputPath),
      generationSystem: 'theme-llm-v002@gemini-web-flash',
      candidateCount: input.candidates.length
    },
    source: {
      sourceId,
      candidateCount: input.candidates.length,
      promptInputPath: path.relative(root, promptInputPath),
      promptPath: path.relative(root, promptPath),
      leakCheckPath: path.relative(root, leakCheckPath),
      outputPath: path.relative(root, outputPath)
    },
    formalHumanTrialAfterRanking: {
      taskCount: 5,
      sessionCount: 1,
      timeLimitMinutes: 15,
      finishDefinition: '公開候補3〜5本について、採否・外側境界・区間内カットまたは無音除去の編集指示を保存する。動画書き出しは含めない。',
      maximumDecisionsPerSession: 5
    },
    expectedOrTeacherDataAvailable: false,
    fixtureAndExpectedChanges: false
  };
  await writeFile(path.join(outputRoot, 'run-manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
  console.log(JSON.stringify({
    status: 'prepared',
    experimentId,
    sourceId,
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
