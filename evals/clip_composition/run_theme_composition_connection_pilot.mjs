#!/usr/bin/env node
import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import path from 'node:path';

function workspaceRoot() {
  let current = process.cwd();
  while (true) {
    if (existsSync(path.join(current, 'pnpm-workspace.yaml'))) return current;
    const parent = path.dirname(current);
    if (parent === current) throw new Error('pnpm-workspace.yaml が見つかりません');
    current = parent;
  }
}

function option(name, fallback) {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] : fallback;
}

async function run(command, args, cwd) {
  await new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd, stdio: 'inherit' });
    child.once('error', reject);
    child.once('exit', (code, signal) => {
      if (code === 0) resolve();
      else reject(new Error(`${command} が失敗しました: code=${String(code)} signal=${String(signal)}`));
    });
  });
}

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, 'utf8'));
}

async function main() {
  const root = workspaceRoot();
  const outputId = option('outputId', '20260712-context-pilot-v001');
  if (!outputId || !/^[a-zA-Z0-9_-]+$/.test(outputId)) throw new Error('--outputId が不正です');
  const outputRoot = path.join(root, 'evals', 'clip_composition', 'outputs', 'theme-composition-connection', outputId);
  const manifestPath = path.join(outputRoot, 'input-manifest.json');
  const manifest = await readJson(manifestPath);
  if (manifest.status !== 'ready_for_execution' || manifest.runsPerInput !== 3 || manifest.inputCount !== 6) {
    throw new Error('入力manifestが事前登録した6入力×3 runと一致しません');
  }
  if (manifest.generationSystem !== 'llm-v012@gemini-web-flash') {
    throw new Error('生成系統が固定値と一致しません');
  }
  const progressPath = path.join(outputRoot, 'execution-progress.json');
  const completed = [];
  const skippedExisting = [];
  const paramsBase = {
    temperature: 'web-default',
    source: 'gemini-web',
    manualRun: false,
    runner: 'edge-cdp-text-prompt',
    generationSystem: 'llm-v012@gemini-web-flash',
    upstreamGenerationSystem: 'theme-llm-v002@gemini-web-flash',
    resultRole: 'connected-composition-eval-pilot',
    conditionalOnUpstreamRangeHit: true,
    promptVersion: 'clip_composition_prompt_v012',
    runs: 3
  };

  for (const input of manifest.inputs) {
    const promptPath = path.join(root, input.promptPath);
    const conditionDir = path.dirname(promptPath);
    const inspection = await readJson(path.join(root, input.leakageInspectionPath));
    if (inspection.passed !== true || inspection.containsExpectedData !== false || inspection.closeTabAfterRunRequired !== true) {
      throw new Error(`漏洩検査が不合格です: candidate ${input.candidateIndex} ${input.contextCondition}`);
    }
    for (let runIndex = 1; runIndex <= 3; runIndex += 1) {
      const outputPath = path.join(conditionDir, `run-${String(runIndex).padStart(2, '0')}-gemini-output.json`);
      if (existsSync(outputPath)) {
        const existing = await readJson(outputPath);
        if (existing.model !== 'gemini-web-flash' || !Array.isArray(existing.selectedCuts)) {
          throw new Error(`既存出力が不正です: ${outputPath}`);
        }
        skippedExisting.push(path.relative(root, outputPath));
        continue;
      }
      await mkdir(conditionDir, { recursive: true });
      const params = {
        ...paramsBase,
        runIndex,
        candidateIndex: input.candidateIndex,
        contextCondition: input.contextCondition,
        inputPromptSha256: input.promptSha256
      };
      await run('pnpm', [
        'exec',
        'tsx',
        'evals/clip_composition/run_web_gemini_prompt.ts',
        '--prompt', promptPath,
        '--output', outputPath,
        '--model', 'gemini-web-flash',
        '--params', JSON.stringify(params),
        '--timeoutMs', '240000',
        '--rejectPartialExtraction',
        '--closeTabAfterRun'
      ], root);
      const saved = await readJson(outputPath);
      if (saved.model !== 'gemini-web-flash' || !Array.isArray(saved.selectedCuts)) {
        throw new Error(`保存結果が不正です: ${outputPath}`);
      }
      completed.push(path.relative(root, outputPath));
      await writeFile(progressPath, `${JSON.stringify({
        kind: 'theme_composition_connection_pilot_execution_progress',
        updatedAt: new Date().toISOString(),
        outputId,
        completed,
        skippedExisting,
        requiredCloseTabAfterRun: true,
        status: 'running'
      }, null, 2)}\n`, 'utf8');
    }
  }

  await writeFile(progressPath, `${JSON.stringify({
    kind: 'theme_composition_connection_pilot_execution_progress',
    updatedAt: new Date().toISOString(),
    outputId,
    completed,
    skippedExisting,
    totalOutputCount: completed.length + skippedExisting.length,
    requiredCloseTabAfterRun: true,
    status: 'complete'
  }, null, 2)}\n`, 'utf8');
  console.log(JSON.stringify({ outputId, completed: completed.length, skippedExisting: skippedExisting.length, status: 'complete' }, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack ?? error.message : String(error));
  process.exitCode = 1;
});
