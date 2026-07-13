#!/usr/bin/env node
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
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
const manifestPath = path.join(root, 'evals', 'clip_composition', 'outputs', 'candidate-ranking', '20260713-title-reason-run1-v001', 'run-manifest.json');

function runProcess(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd: root, stdio: 'inherit' });
    child.on('error', reject);
    child.on('close', (code) => code === 0 ? resolve() : reject(new Error(`${command} failed: ${code}`)));
  });
}

async function main() {
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
  for (const fixture of manifest.fixtures) {
    const outputPath = path.join(root, fixture.outputPath);
    if (existsSync(outputPath)) {
      console.log(`[skip] ${fixture.fixtureId}: ${fixture.outputPath}`);
      continue;
    }
    console.log(`[run] ${fixture.fixtureId}`);
    await runProcess(path.join(root, 'runner', 'node_modules', '.bin', 'tsx'), [
      'evals/clip_composition/run_web_gemini_prompt.ts',
      '--prompt', path.join(root, fixture.promptPath),
      '--output', outputPath,
      '--model', manifest.model,
      '--params', JSON.stringify({
        temperature: 'web-default',
        source: 'gemini-web',
        runner: 'edge-cdp-text-prompt',
        generationSystem: manifest.generationSystem,
        run: 1,
        inputPolicy: manifest.inputPolicy
      }),
      '--cdpPort', '9222',
      '--timeoutMs', '300000',
      '--rejectPartialExtraction',
      '--closeTabAfterRun'
    ]);
  }
}

main().catch((error) => {
  console.error(error.stack ?? error.message);
  process.exitCode = 1;
});
