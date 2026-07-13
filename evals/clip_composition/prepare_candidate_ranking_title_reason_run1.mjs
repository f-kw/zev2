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
const experimentId = '20260713-title-reason-run1-v001';
const outputRoot = path.join(evalRoot, 'outputs', 'candidate-ranking', experimentId);
const generationSystem = 'candidate-ranking-v001@gemini-web-flash';
const promptVersion = 'candidate-ranking-v001';
const promptTemplatePath = path.join(evalRoot, 'prompts', 'candidate_ranking_prompt_v001.md');

const configs = [
  {
    fixtureId: 'nOEWCNc77MI_multiblock_material_v001',
    sourceOutputPath: 'outputs/theme-generation/nOEWCNc77MI_chat_velocity_top100_input_selection_v004/theme-llm-v002/20260711-chat-velocity-top100-v001/run-01-gemini-output.json'
  },
  {
    fixtureId: '9dtwF5Exu5w_multiblock_material_v001',
    sourceOutputPath: 'outputs/theme-generation/9dtwF5Exu5w_chat_velocity_top100_input_selection_v004/theme-llm-v002/20260712-chat-velocity-top100-generalization-v001/run-01-gemini-output.json'
  }
];

const readJson = async (file) => JSON.parse(await readFile(file, 'utf8'));

function assertAllowedInput(input, sourceThemes, fixtureId) {
  if (!input || Object.keys(input).join(',') !== 'candidates' || !Array.isArray(input.candidates)) {
    throw new Error(`${fixtureId} 入力の最上位schema不正`);
  }
  if (input.candidates.length !== sourceThemes.length) throw new Error(`${fixtureId} 候補件数不一致`);
  for (let index = 0; index < input.candidates.length; index += 1) {
    const candidate = input.candidates[index];
    const source = sourceThemes[index];
    const keys = Object.keys(candidate).sort();
    if (JSON.stringify(keys) !== JSON.stringify(['candidateId', 'reason', 'title'])) {
      throw new Error(`${fixtureId} candidate ${index + 1} に許可外field: ${keys.join(',')}`);
    }
    if (candidate.candidateId !== index + 1 || candidate.title !== source.title || candidate.reason !== source.reason) {
      throw new Error(`${fixtureId} candidate ${index + 1} が元のtitle/reasonと一致しない`);
    }
    if (typeof candidate.title !== 'string' || !candidate.title.trim() || typeof candidate.reason !== 'string' || !candidate.reason.trim()) {
      throw new Error(`${fixtureId} candidate ${index + 1} のtitle/reasonが空`);
    }
  }
}

function leakCheck(promptInput) {
  const serialized = JSON.stringify(promptInput);
  const forbiddenFields = [
    'sourceStartMs', 'sourceEndMs', 'sourceVideoId', 'evidenceRanges', 'supportingSpeechIds',
    'transcript', 'segments', 'expected', 'hitExpectedIndexes', 'chatPeak', 'chatMean',
    'laughter', 'sourcePositionStartMs', 'sourcePositionRatio'
  ];
  const foundForbiddenFields = forbiddenFields.filter((field) => serialized.includes(`"${field}"`));
  return {
    passed: foundForbiddenFields.length === 0,
    allowedCandidateFields: ['candidateId', 'title', 'reason'],
    foundForbiddenFields,
    candidateCount: promptInput.candidates.length,
    note: '候補IDは出力参照用。モデルへ渡す候補内容はtitle/reasonのみ。時刻・transcript・根拠範囲・expected・照合結果・機械信号は含めない。'
  };
}

async function main() {
  const template = await readFile(promptTemplatePath, 'utf8');
  const fixtures = [];
  await mkdir(outputRoot, { recursive: true });
  for (const config of configs) {
    const sourceOutput = await readJson(path.join(evalRoot, config.sourceOutputPath));
    if (!Array.isArray(sourceOutput.themes) || sourceOutput.themes.length === 0) throw new Error(`${config.fixtureId} themesなし`);
    const promptInput = {
      candidates: sourceOutput.themes.map((theme, index) => ({
        candidateId: index + 1,
        title: theme.title,
        reason: theme.reason
      }))
    };
    assertAllowedInput(promptInput, sourceOutput.themes, config.fixtureId);
    const leakage = leakCheck(promptInput);
    if (!leakage.passed) throw new Error(`${config.fixtureId} リーク検査失敗: ${leakage.foundForbiddenFields.join(',')}`);
    const fixtureRoot = path.join(outputRoot, config.fixtureId);
    await mkdir(fixtureRoot, { recursive: true });
    const promptInputPath = path.join(fixtureRoot, 'prompt-input.json');
    const promptPath = path.join(fixtureRoot, 'prompt.txt');
    const leakCheckPath = path.join(fixtureRoot, 'leak-check.json');
    const outputPath = path.join(fixtureRoot, 'run-01-gemini-output.json');
    await Promise.all([
      writeFile(promptInputPath, `${JSON.stringify(promptInput, null, 2)}\n`),
      writeFile(promptPath, `${template.trim()}\n\n## 入力JSON\n\n${JSON.stringify(promptInput, null, 2)}\n`),
      writeFile(leakCheckPath, `${JSON.stringify(leakage, null, 2)}\n`)
    ]);
    fixtures.push({
      fixtureId: config.fixtureId,
      sourceOutputPath: config.sourceOutputPath,
      candidateCount: promptInput.candidates.length,
      promptInputPath: path.relative(root, promptInputPath),
      promptPath: path.relative(root, promptPath),
      leakCheckPath: path.relative(root, leakCheckPath),
      outputPath: path.relative(root, outputPath)
    });
  }
  const manifest = {
    kind: 'candidate_ranking_run_manifest',
    experimentId,
    preparedAt: new Date().toISOString(),
    generationSystem,
    promptVersion,
    model: 'gemini-web-flash',
    runCount: 1,
    inputPolicy: 'candidateId+title+reason only',
    scoringPolicy: {
      primary: 'hit candidate count in top 5',
      nonHitTreatment: 'unlabeled discovery; not an automatic error',
      comparisons: 'generation order and every precomputed mechanical single-signal ranking'
    },
    humanWork: { itemCount: 0, estimatedMinutes: 0 },
    fixtures
  };
  const manifestPath = path.join(outputRoot, 'run-manifest.json');
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  console.log(JSON.stringify({ status: 'prepared', manifestPath: path.relative(root, manifestPath), fixtures }, null, 2));
}

main().catch((error) => {
  console.error(error.stack ?? error.message);
  process.exitCode = 1;
});
