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
const experimentId = '20260713-character-context-run1-v002';
const outputRoot = path.join(evalRoot, 'outputs', 'candidate-ranking', experimentId);
const generationSystem = 'candidate-ranking-v002@gemini-web-flash';
const promptVersion = 'candidate-ranking-v002';
const promptTemplatePath = path.join(evalRoot, 'prompts', 'candidate_ranking_prompt_v002.md');
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

function assertInput(input, sourceThemes, fixtureId) {
  if (Object.keys(input).join(',') !== 'candidates' || input.candidates.length !== sourceThemes.length) throw new Error(`${fixtureId} 入力schema不正`);
  for (let index = 0; index < input.candidates.length; index += 1) {
    const candidate = input.candidates[index];
    const source = sourceThemes[index];
    if (JSON.stringify(Object.keys(candidate).sort()) !== JSON.stringify(['candidateId', 'reason', 'title'])) throw new Error(`${fixtureId} candidate ${index + 1} 許可外field`);
    if (candidate.candidateId !== index + 1 || candidate.title !== source.title || candidate.reason !== source.reason) throw new Error(`${fixtureId} candidate ${index + 1} 元候補と不一致`);
  }
}

function leakCheck(input) {
  const serialized = JSON.stringify(input);
  const forbidden = ['sourceStartMs', 'sourceEndMs', 'sourceVideoId', 'evidenceRanges', 'supportingSpeechIds', 'transcript', 'segments', 'expected', 'hitExpectedIndexes', 'chatPeak', 'chatMean', 'laughter', 'sourcePositionStartMs', 'sourcePositionRatio', 'answer', 'answerLabel', 'publish', 'boring'];
  const foundForbiddenFields = forbidden.filter((field) => serialized.includes(`"${field}"`));
  return {
    passed: foundForbiddenFields.length === 0,
    allowedCandidateFields: ['candidateId', 'title', 'reason'],
    foundForbiddenFields,
    candidateCount: input.candidates.length,
    note: '具体候補の人間三択、時刻、transcript、根拠範囲、expected、照合結果、機械信号を入力しない。人間知見はv002プロンプトの抽象原則だけ。'
  };
}

async function main() {
  const template = await readFile(promptTemplatePath, 'utf8');
  const fixtures = [];
  await mkdir(outputRoot, { recursive: true });
  for (const config of configs) {
    const source = await readJson(path.join(evalRoot, config.sourceOutputPath));
    if (!Array.isArray(source.themes) || source.themes.length === 0) throw new Error(`${config.fixtureId} themesなし`);
    const input = { candidates: source.themes.map((theme, index) => ({ candidateId: index + 1, title: theme.title, reason: theme.reason })) };
    assertInput(input, source.themes, config.fixtureId);
    const leakage = leakCheck(input);
    if (!leakage.passed) throw new Error(`${config.fixtureId} リーク: ${leakage.foundForbiddenFields.join(',')}`);
    const fixtureRoot = path.join(outputRoot, config.fixtureId);
    await mkdir(fixtureRoot, { recursive: true });
    const promptInputPath = path.join(fixtureRoot, 'prompt-input.json');
    const promptPath = path.join(fixtureRoot, 'prompt.txt');
    const leakCheckPath = path.join(fixtureRoot, 'leak-check.json');
    const outputPath = path.join(fixtureRoot, 'run-01-gemini-output.json');
    await Promise.all([
      writeFile(promptInputPath, `${JSON.stringify(input, null, 2)}\n`),
      writeFile(promptPath, `${template.trim()}\n\n## 入力JSON\n\n${JSON.stringify(input, null, 2)}\n`),
      writeFile(leakCheckPath, `${JSON.stringify(leakage, null, 2)}\n`)
    ]);
    fixtures.push({
      fixtureId: config.fixtureId,
      sourceOutputPath: config.sourceOutputPath,
      candidateCount: input.candidates.length,
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
    singleVariable: 'ranking criterion: game event as trigger, performer-specific action/reaction/relationship as value signal',
    fixedBaselineBeforeRun: {
      generationOrder: { strong: 3, reviewWorthy: 6, denominator: 10 },
      candidateRankingV001: { strong: 5, reviewWorthy: 6, denominator: 10 }
    },
    scoringPolicy: {
      layers: ['known-hit recall', 'strong candidate rate after human labels', 'generation-order/v001/v002 comparison'],
      nonHitTreatment: 'unlabeled discovery; not an automatic error',
      knownHitDropDiagnosis: 'quote title/reason and judge whether the reason describes performer-specific reaction'
    },
    humanWork: { exactItemCount: 'after-output', maximumItemCount: 10, maximumEstimatedMinutes: 10 },
    fixtures
  };
  const manifestPath = path.join(outputRoot, 'run-manifest.json');
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  console.log(JSON.stringify({ status: 'prepared', manifestPath: path.relative(root, manifestPath), fixtures }, null, 2));
}

main().catch((error) => { console.error(error.stack ?? error.message); process.exitCode = 1; });
