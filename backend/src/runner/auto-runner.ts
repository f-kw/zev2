import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { assertExecutionRuntime, type AgentExecutionScope } from '@zev2/shared';
import { assertUiExecutionAllowed } from '../domain/ui-review.js';
import { createRunnerEnvironmentFromConfig, loadRuntimeConfig, workspaceRoot } from '../config/runtime-config.js';

let runningDryRun: Promise<void> | null = null;
export function assertNoActiveUiRunner(): void {
  if (runningDryRun) throw new Error('別の実行が処理中です。競合するrunner起動を拒否しました');
}

function apiBaseUrl(): string {
  return process.env.ZEV2_API_BASE_URL ?? `http://localhost:${process.env.PORT ?? '8080'}/api`;
}

function runnerPackageRoot(): string {
  return path.join(workspaceRoot(), 'runner');
}

function runnerCommand(): { command: string; args: string[]; cwd: string } {
  const runnerRoot = runnerPackageRoot();
  const tsxBinary = path.join(
    runnerRoot,
    'node_modules',
    '.bin',
    process.platform === 'win32' ? 'tsx.cmd' : 'tsx'
  );

  if (existsSync(tsxBinary)) {
    return {
      command: tsxBinary,
      args: ['src/index.ts'],
      cwd: runnerRoot
    };
  }

  return {
    command: 'pnpm',
    args: ['--filter', '@zev2/agent-runner', 'dry-run:no-build'],
    cwd: workspaceRoot()
  };
}

async function runDryRunOnce(scope: AgentExecutionScope): Promise<void> {
  const runtimeConfig = await loadRuntimeConfig();
  assertUiExecutionAllowed(runtimeConfig);
  assertExecutionRuntime(scope,runtimeConfig);
  const runner = runnerCommand();

  return new Promise<void>((resolve, reject) => {
    const output: string[] = [];
    const child = spawn(runner.command, runner.args, {
      cwd: runner.cwd,
      env: {
        ...process.env,
        ...createRunnerEnvironmentFromConfig(runtimeConfig),
        CI: 'true',
        npm_config_confirm_modules_purge: 'false',
        ZEV2_API_BASE_URL: apiBaseUrl(),
        ZEV2_EXECUTION_SCOPE_JSON: JSON.stringify(scope)
      }
    });

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

export async function runDryRunRunner(scope: AgentExecutionScope): Promise<void> {
  assertNoActiveUiRunner();

  runningDryRun = (async () => {
    try {
      await runDryRunOnce(scope);
    } finally {
      runningDryRun = null;
    }
  })();

  return runningDryRun;
}

export function startDryRunRunner(scope: AgentExecutionScope): void {
  if (process.env.ZEV2_DISABLE_AUTO_RUNNER === '1') {
    return;
  }

  void runDryRunRunner(scope).catch((error: unknown) => {
    const message = error instanceof Error ? error.message : 'AIエージェント実行で不明な失敗が発生しました';
    console.error(message);
  });
}
