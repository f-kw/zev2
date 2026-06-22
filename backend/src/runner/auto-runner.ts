import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';

let runningDryRun: Promise<void> | null = null;
let rerunRequested = false;

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
  return process.env.ZEV2_API_BASE_URL ?? `http://localhost:${process.env.PORT ?? '8080'}/api`;
}

function runDryRunOnce(): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    const output: string[] = [];
    const child = spawn(
      'pnpm',
      ['--filter', '@zev2/agent-runner', 'dry-run:no-build'],
      {
        cwd: workspaceRoot(),
        env: {
          ...process.env,
          ZEV2_API_BASE_URL: apiBaseUrl()
        }
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

      reject(new Error(`fixture runner failed with code ${code ?? 'unknown'}\n${output.join('')}`));
    });
  });
}

export async function runDryRunRunner(): Promise<void> {
  if (runningDryRun) {
    rerunRequested = true;
    return runningDryRun;
  }

  runningDryRun = (async () => {
    try {
      do {
        rerunRequested = false;
        await runDryRunOnce();
      } while (rerunRequested);
    } finally {
      runningDryRun = null;
    }
  })();

  return runningDryRun;
}

export function startDryRunRunner(): void {
  if (process.env.ZEV2_DISABLE_AUTO_RUNNER === '1') {
    return;
  }

  void runDryRunRunner().catch((error: unknown) => {
    const message = error instanceof Error ? error.message : '仮実装runnerで不明な失敗が発生しました';
    console.error(message);
  });
}
