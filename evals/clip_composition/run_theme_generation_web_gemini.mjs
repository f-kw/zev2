#!/usr/bin/env node
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import path from 'node:path';

const root = workspaceRoot();
const evalRoot = path.join(root, 'evals', 'clip_composition');
const options = parseOptions(process.argv.slice(2));

function workspaceRoot() {
  let current = process.cwd();
  while (true) {
    if (existsSync(path.join(current, 'pnpm-workspace.yaml'))) {
      return current;
    }
    const parent = path.dirname(current);
    if (parent === current) {
      throw new Error('pnpm-workspace.yaml が見つかりません');
    }
    current = parent;
  }
}

function parseOptions(argv) {
  const values = new Map();
  for (let index = 0; index < argv.length; index += 1) {
    const item = argv[index];
    if (!item.startsWith('--')) {
      continue;
    }
    const inlineValueIndex = item.indexOf('=');
    if (inlineValueIndex >= 0) {
      values.set(item.slice(2, inlineValueIndex), item.slice(inlineValueIndex + 1));
      continue;
    }
    const key = item.slice(2);
    const next = argv[index + 1];
    if (!next || next.startsWith('--')) {
      values.set(key, 'true');
      continue;
    }
    values.set(key, next);
    index += 1;
  }
  const fixtures = values.get('fixtures')?.trim();
  if (!fixtures) {
    throw new Error('--fixtures を指定してください');
  }
  return {
    fixtureIds: fixtures.split(',').map((item) => item.trim()).filter(Boolean),
    generationSystem: values.get('generationSystem')?.trim() || 'theme-llm-v001',
    outputId: values.get('outputId')?.trim() || '20260709-v001',
    model: values.get('model')?.trim() || 'gemini-web-flash',
    params: values.get('params')?.trim() || JSON.stringify({
      temperature: 0,
      source: 'gemini-web',
      runner: 'edge-cdp-text-prompt',
      requestedThemeCount: 8
    }),
    cdpPort: values.get('cdpPort')?.trim() || '9222',
    timeoutMs: values.get('timeoutMs')?.trim() || '300000'
  };
}

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, 'utf8'));
}

function runProcess(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd: root, stdio: 'inherit' });
    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(`${command} failed with code ${code ?? 'unknown'}`));
    });
  });
}

async function main() {
  for (const fixtureId of options.fixtureIds) {
    const manifestPath = path.join(evalRoot, 'outputs', 'theme-generation', fixtureId, options.generationSystem, options.outputId, 'run-manifest.json');
    const manifest = await readJson(manifestPath);
    const promptPath = path.join(root, manifest.promptPath);
    for (const runOutput of manifest.runOutputs) {
      const outputPath = path.join(root, runOutput.outputPath);
      if (existsSync(outputPath)) {
        console.log(`[skip] ${fixtureId} run ${runOutput.run}: ${runOutput.outputPath}`);
        continue;
      }
      console.log(`[run] ${fixtureId} run ${runOutput.run}`);
      await runProcess(path.join(root, 'runner', 'node_modules', '.bin', 'tsx'), [
        'evals/clip_composition/run_web_gemini_prompt.ts',
        '--prompt',
        promptPath,
        '--output',
        outputPath,
        '--model',
        options.model,
        '--params',
        options.params,
        '--cdpPort',
        options.cdpPort,
        '--timeoutMs',
        options.timeoutMs
      ]);
    }
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
