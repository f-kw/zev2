import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';

let runningDryRun: Promise<void> | null = null;

function workspaceRoot(): string {
  if (process.env.ZEV2_WORKSPACE_ROOT) {
    return path.resolve(process.env.ZEV2_WORKSPACE_ROOT);
  }

  const current = process.cwd();
  if (existsSync(path.join(current, 'pnpm-workspace.yaml'))) {
    return current;
  }

  const parent = path.resolve(current, '..');
  if (existsSync(path.join(parent, 'pnpm-workspace.yaml'))) {
    return parent;
  }

  return current;
}

function apiBaseUrl(): string {
  return process.env.ZEV2_API_BASE_URL ?? 'http://localhost:8080/api';
}

export async function runDryRunRunner(): Promise<void> {
  if (runningDryRun) {
    return runningDryRun;
  }

  // 承認後にAPI経由のdry-run実行を最後まで進める。
  const runPromise = new Promise<void>((resolve, reject) => {
    const output: string[] = [];
    const child = spawn(
      'pnpm',
      ['--filter', '@zev2/agent-runner', 'dry-run:no-build', '--', `--api=${apiBaseUrl()}`],
      {
        cwd: workspaceRoot(),
        env: process.env
      }
    );

    child.stdout.on('data', (chunk: Buffer) => {
      output.push(chunk.toString());
    });

    child.stderr.on('data', (chunk: Buffer) => {
      output.push(chunk.toString());
    });

    child.on('error', reject);

    child.on('close', (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`dry-run runner failed with code ${code ?? 'unknown'}\n${output.join('')}`));
    });
  }).finally(() => {
    runningDryRun = null;
  });

  runningDryRun = runPromise;
  return runPromise;
}

export function startDryRunRunner(): void {
  void runDryRunRunner().catch((error: unknown) => {
    const message = error instanceof Error ? error.message : 'dry-run runnerで不明な失敗が発生しました';
    console.error(message);
  });
}
