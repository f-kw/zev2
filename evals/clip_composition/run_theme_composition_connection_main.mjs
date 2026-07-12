#!/usr/bin/env node
import { existsSync } from 'node:fs';
import { readFile, writeFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import path from 'node:path';

function rootDir() { let current = process.cwd(); while (!existsSync(path.join(current, 'pnpm-workspace.yaml'))) { const parent = path.dirname(current); if (parent === current) throw new Error('workspaceなし'); current = parent; } return current; }
const root = rootDir();
const outputRoot = path.join(root, 'evals', 'clip_composition', 'outputs', 'theme-composition-connection', '20260712-connection-main-v001');
const readJson = async (file) => JSON.parse(await readFile(file, 'utf8'));

async function run(command, args) {
  await new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd: root, stdio: 'inherit' });
    child.once('error', reject);
    child.once('exit', (code) => code === 0 ? resolve() : reject(new Error(`exit ${code}`)));
  });
}

async function main() {
  const manifest = await readJson(path.join(outputRoot, 'input-manifest.json'));
  if (manifest.candidateCount !== 25 || manifest.totalOutputCount !== 75 || manifest.plannedNewGeminiCallCount !== 66) throw new Error('本走manifest不一致');
  const completed = [];
  const reused = [];
  for (const input of manifest.inputs) {
    const inspection = await readJson(path.join(root, input.leakageInspectionPath));
    if (!inspection.passed || inspection.containsExpectedData !== false || !inspection.closeTabAfterRunRequired) throw new Error(`漏洩検査不合格 ${input.fixtureId} ${input.candidateIndex}`);
    const outputDir = path.join(root, input.outputDir);
    for (let runIndex = 1; runIndex <= 3; runIndex += 1) {
      const outputPath = path.join(outputDir, `run-${String(runIndex).padStart(2, '0')}-gemini-output.json`);
      if (existsSync(outputPath)) {
        const existing = await readJson(outputPath);
        if (existing.model !== 'gemini-web-flash' || !Array.isArray(existing.selectedCuts)) throw new Error(`既存出力不正 ${outputPath}`);
        reused.push(path.relative(root, outputPath));
        continue;
      }
      const params = { temperature: 'web-default', source: 'gemini-web', manualRun: false, runner: 'edge-cdp-text-prompt', generationSystem: 'llm-v012@gemini-web-flash', upstreamGenerationSystem: 'theme-llm-v002@gemini-web-flash', resultRole: 'connected-composition-eval-main', conditionalOnUpstreamRangeHit: true, promptVersion: 'clip_composition_prompt_v012', contextCondition: 'theme-window-plus-minus-5m', fixtureId: input.fixtureId, candidateIndex: input.candidateIndex, runs: 3, runIndex, inputPromptSha256: input.promptSha256 };
      await run('pnpm', ['--filter', '@zev2/agent-runner', 'exec', 'tsx', '../evals/clip_composition/run_web_gemini_prompt.ts', '--prompt', path.join(root, input.promptPath), '--output', outputPath, '--model', 'gemini-web-flash', '--params', JSON.stringify(params), '--timeoutMs', '240000', '--rejectPartialExtraction', '--closeTabAfterRun']);
      completed.push(path.relative(root, outputPath));
      await writeFile(path.join(outputRoot, 'execution-progress.json'), `${JSON.stringify({ kind: 'theme_composition_connection_main_progress', updatedAt: new Date().toISOString(), completed, reused, status: 'running', closeTabAfterRun: true }, null, 2)}\n`);
    }
  }
  await writeFile(path.join(outputRoot, 'execution-progress.json'), `${JSON.stringify({ kind: 'theme_composition_connection_main_progress', updatedAt: new Date().toISOString(), completed, reused, totalOutputCount: completed.length + reused.length, status: 'complete', closeTabAfterRun: true }, null, 2)}\n`);
  console.log(JSON.stringify({ completed: completed.length, reused: reused.length, total: completed.length + reused.length }, null, 2));
}

main().catch((error) => { console.error(error.stack ?? error.message); process.exitCode = 1; });
