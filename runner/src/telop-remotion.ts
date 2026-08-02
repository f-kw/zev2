import { spawn } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import type { TelopBackgroundStyle, TelopPositionStyle, TelopVisualStyle } from './telop-style.js';

export type RemotionTelopRenderInput = {
  text: string;
  style: Omit<TelopVisualStyle, 'position'>;
  position: TelopPositionStyle & { offsetX?: number; offsetY?: number };
  background?: TelopBackgroundStyle;
  maxCharsPerLine?: number;
  width: number;
  height: number;
  glowSeedHint?: string;
};

export type FormalRemotionTelopRenderInput = RemotionTelopRenderInput & {
  inspectionLineIndex: number | null;
  fontFailurePolicy: 'strict-cancel';
};

export type FormalRemotionRuntimeBinding = {
  nodePath: string;
  remotionCliPath: string;
  browserExecutablePath: string;
};

function runCommand(
  command: string,
  args: string[],
  options: { cwd: string; env?: NodeJS.ProcessEnv; timeoutMs?: number }
): Promise<void> {
  return new Promise((resolve, reject) => {
    const output: string[] = [];
    const child = spawn(command, args, {
      cwd: options.cwd,
      env: options.env ? { ...process.env, ...options.env } : process.env
    });
    const timeout = options.timeoutMs
      ? setTimeout(() => {
          child.kill('SIGTERM');
          reject(new Error(`${command} timed out\n${output.join('')}`));
        }, options.timeoutMs)
      : undefined;

    child.stdout.on('data', (chunk: Buffer) => output.push(chunk.toString()));
    child.stderr.on('data', (chunk: Buffer) => output.push(chunk.toString()));
    child.on('error', (error) => {
      if (timeout) {
        clearTimeout(timeout);
      }
      reject(error);
    });
    child.on('close', (code) => {
      if (timeout) {
        clearTimeout(timeout);
      }
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`${command} failed with code ${code ?? 'unknown'}\n${output.join('')}`));
    });
  });
}

function workspaceRoot(): string {
  const current = process.cwd();
  if (path.basename(current) === 'runner') {
    return path.resolve(current, '..');
  }
  return current;
}

function runnerRoot(): string {
  return path.join(workspaceRoot(), 'runner');
}

export async function renderRemotionTelopPng(
  input: RemotionTelopRenderInput,
  outputPath: string
): Promise<string> {
  await mkdir(path.dirname(outputPath), { recursive: true });

  const root = runnerRoot();
  const remotionCommand = process.env.ZEV2_REMOTION_COMMAND ?? 'pnpm';
  const remotionPrefix = process.env.ZEV2_REMOTION_COMMAND
    ? []
    : ['exec', 'remotion'];
  const entryPoint = path.join(root, 'src', 'remotion', 'index.ts');
  const publicDir = path.join(root, 'public');
  const props = JSON.stringify({
    text: input.text,
    style: input.style,
    position: input.position,
    background: input.background,
    maxCharsPerLine: input.maxCharsPerLine,
    singleLine: false,
    width: input.width,
    height: input.height,
    glowSeedHint: input.glowSeedHint,
    inspectionLineIndex: null,
    fontFailurePolicy: 'preserve-existing-fallback'
  });

  await runCommand(remotionCommand, [
    ...remotionPrefix,
    'still',
    entryPoint,
    'TelopStill',
    outputPath,
    '--props',
    props,
    '--image-format',
    'png',
    '--public-dir',
    publicDir,
    '--log',
    'error'
  ], {
    cwd: root,
    timeoutMs: 120000
  });

  return outputPath;
}

export function buildFormalRemotionTelopStillArguments(
  input: FormalRemotionTelopRenderInput,
  outputPath: string,
  runtime: FormalRemotionRuntimeBinding
): string[] {
  for (const [label, value] of Object.entries({
    nodePath: runtime.nodePath,
    remotionCliPath: runtime.remotionCliPath,
    browserExecutablePath: runtime.browserExecutablePath
  })) {
    if (!path.isAbsolute(value)) {
      throw new TypeError(`${label} must be an absolute path`);
    }
  }
  if (input.fontFailurePolicy !== 'strict-cancel') {
    throw new TypeError('formal Remotion telop rendering requires strict-cancel');
  }

  const root = runnerRoot();
  const entryPoint = path.join(root, 'src', 'remotion', 'index.ts');
  const publicDir = path.join(root, 'public');
  const props = JSON.stringify({
    text: input.text,
    style: input.style,
    position: input.position,
    background: input.background,
    maxCharsPerLine: input.maxCharsPerLine,
    singleLine: false,
    width: input.width,
    height: input.height,
    glowSeedHint: input.glowSeedHint,
    inspectionLineIndex: input.inspectionLineIndex,
    fontFailurePolicy: input.fontFailurePolicy
  });

  return [
    runtime.remotionCliPath,
    'still',
    entryPoint,
    'TelopStill',
    outputPath,
    '--props',
    props,
    '--image-format',
    'png',
    '--public-dir',
    publicDir,
    '--browser-executable',
    runtime.browserExecutablePath,
    '--log',
    'error'
  ];
}

/**
 * 正式描画で束縛済みの実体だけを起動する入口。
 * preview向けの環境変数・PATH・browser自動解決はここへ持ち込まない。
 */
export async function renderFormalRemotionTelopPng(
  input: FormalRemotionTelopRenderInput,
  outputPath: string,
  runtime: FormalRemotionRuntimeBinding
): Promise<string> {
  await mkdir(path.dirname(outputPath), { recursive: true });
  const root = runnerRoot();
  const args = buildFormalRemotionTelopStillArguments(input, outputPath, runtime);
  await runCommand(runtime.nodePath, args, {
    cwd: root,
    timeoutMs: 120000
  });
  return outputPath;
}
