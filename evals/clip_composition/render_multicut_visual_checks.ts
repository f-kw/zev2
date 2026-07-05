import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';

type CliOptions = {
  planPath: string;
  outputId: string;
  ffmpegCommand: string;
  force: boolean;
};

type CandidatePlan = {
  kind?: string;
  targetId: string;
  clip?: {
    localVideoPath?: string;
  };
  source?: {
    id?: string;
    localVideoPath?: string;
  };
  proposedExpectedCuts?: Array<{
    cutIndex: number;
    clipStartMs: number;
    clipEndMs: number;
    sourceStartMs: number;
    sourceEndMs: number;
    relationToPrevious?: string;
    verificationStatus?: string;
  }>;
};

type RenderedCheck = {
  cutIndex: number;
  clipStartMs: number;
  clipEndMs: number;
  sourceStartMs: number;
  sourceEndMs: number;
  durationMs: number;
  relationToPrevious?: string;
  outputVideoPath: string;
  status: 'rendered' | 'reused';
};

type RenderManifest = {
  kind: 'clip_composition_multicut_visual_check_manifest';
  runAt: string;
  planPath: string;
  targetId: string;
  sourceId?: string;
  clipVideoPath: string;
  sourceVideoPath: string;
  outputId: string;
  checks: RenderedCheck[];
  nextActions: string[];
  productionImpact: {
    writesRuntime: false;
    touchesProductionUi: false;
    touchesProductionApi: false;
    touchesProductionQueue: false;
    touchesDatabase: false;
  };
};

const evalRoot = path.join(workspaceRoot(), 'evals', 'clip_composition');

function workspaceRoot(): string {
  let current = process.cwd();
  while (true) {
    if (existsSync(path.join(current, 'pnpm-workspace.yaml'))) {
      return current;
    }
    const parent = path.dirname(current);
    if (parent === current) {
      throw new Error('pnpm-workspace.yaml が見つからないため評価環境の位置を確認できません');
    }
    current = parent;
  }
}

function parseOptions(argv: string[]): CliOptions {
  const values = new Map<string, string>();
  const flags = new Set<string>();
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
      flags.add(key);
      continue;
    }
    values.set(key, next);
    index += 1;
  }

  const planPath = values.get('plan')?.trim();
  if (!planPath) {
    throw new Error('--plan に複数区間候補プランJSONを指定してください');
  }

  return {
    planPath: resolveWorkspacePath(planPath),
    outputId: sanitizePathPart(values.get('outputId')?.trim() || timestampForFile()),
    ffmpegCommand: values.get('ffmpeg')?.trim() || process.env.ZEV2_FFMPEG_BIN?.trim() || process.env.FFMPEG_BIN?.trim() || 'ffmpeg',
    force: flags.has('force')
  };
}

function sanitizePathPart(value: string): string {
  return value.replace(/[^a-zA-Z0-9_-]/g, '_');
}

function timestampForFile(): string {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

function resolveWorkspacePath(filePath: string): string {
  return path.isAbsolute(filePath) ? filePath : path.join(workspaceRoot(), filePath);
}

function relativeWorkspacePath(filePath: string): string {
  return path.relative(workspaceRoot(), filePath);
}

function seconds(ms: number): string {
  return (ms / 1000).toFixed(3);
}

function msLabel(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const secondsPart = totalSeconds % 60;
  const milliseconds = ms % 1000;
  return `${minutes}:${secondsPart.toString().padStart(2, '0')}.${milliseconds.toString().padStart(3, '0')}`;
}

async function readJson<T>(filePath: string): Promise<T> {
  return JSON.parse(await readFile(filePath, 'utf8')) as T;
}

function requireString(value: unknown, label: string): string {
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`${label} は空でない文字列である必要があります`);
  }
  return value;
}

function requireCuts(plan: CandidatePlan): NonNullable<CandidatePlan['proposedExpectedCuts']> {
  if (!Array.isArray(plan.proposedExpectedCuts) || plan.proposedExpectedCuts.length === 0) {
    throw new Error('複数区間候補プランに候補区間がありません');
  }
  return plan.proposedExpectedCuts;
}

type RunProcessResult = {
  stdout: string;
  stderr: string;
  combined: string;
};

function runProcess(command: string, args: string[]): Promise<RunProcessResult> {
  return new Promise((resolve, reject) => {
    const stdout: string[] = [];
    const stderr: string[] = [];
    const combined: string[] = [];
    const child = spawn(command, args);
    child.stdout.on('data', (chunk: Buffer) => {
      const text = chunk.toString();
      stdout.push(text);
      combined.push(text);
    });
    child.stderr.on('data', (chunk: Buffer) => {
      const text = chunk.toString();
      stderr.push(text);
      combined.push(text);
    });
    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) {
        resolve({ stdout: stdout.join(''), stderr: stderr.join(''), combined: combined.join('') });
        return;
      }
      reject(new Error(`${command} failed with code ${code ?? 'unknown'}\n${combined.join('')}`));
    });
  });
}

async function renderCheck(input: {
  options: CliOptions;
  clipVideoPath: string;
  sourceVideoPath: string;
  outputPath: string;
  clipStartMs: number;
  sourceStartMs: number;
  durationMs: number;
}): Promise<'rendered' | 'reused'> {
  if (existsSync(input.outputPath) && !input.options.force) {
    return 'reused';
  }

  await runProcess(input.options.ffmpegCommand, [
    '-y',
    '-ss',
    seconds(input.clipStartMs),
    '-i',
    input.clipVideoPath,
    '-ss',
    seconds(input.sourceStartMs),
    '-i',
    input.sourceVideoPath,
    '-t',
    seconds(input.durationMs),
    '-filter_complex',
    '[0:v]scale=640:-2,setsar=1[left];[1:v]scale=640:-2,setsar=1[right];[left][right]hstack=inputs=2[v]',
    '-map',
    '[v]',
    '-map',
    '0:a?',
    '-c:v',
    'libx264',
    '-preset',
    'veryfast',
    '-crf',
    '23',
    '-c:a',
    'aac',
    '-shortest',
    input.outputPath
  ]);
  return 'rendered';
}

function buildReport(manifest: RenderManifest, manifestPath: string): string {
  const lines = [
    '# 複数区間目視確認動画',
    '',
    `- 対象: ${manifest.targetId}`,
    `- 結果JSON: ${path.relative(evalRoot, manifestPath)}`,
    `- 切り抜き動画: ${manifest.clipVideoPath}`,
    `- 元動画: ${manifest.sourceVideoPath}`,
    '',
    '## 生成物',
    ''
  ];

  for (const check of manifest.checks) {
    lines.push(`### チャンク ${check.cutIndex + 1}`);
    lines.push('');
    lines.push(`- 確認動画: ${check.outputVideoPath}`);
    lines.push(`- 切り抜き側: ${msLabel(check.clipStartMs)} - ${msLabel(check.clipEndMs)}`);
    lines.push(`- 元動画側: ${msLabel(check.sourceStartMs)} - ${msLabel(check.sourceEndMs)}`);
    lines.push(`- 前チャンクとの関係: ${check.relationToPrevious ?? '記録なし'}`);
    lines.push(`- 生成状態: ${check.status}`);
    lines.push('');
  }

  lines.push('## 次の作業');
  lines.push('');
  for (const action of manifest.nextActions) {
    lines.push(`- ${action}`);
  }

  return `${lines.join('\n')}\n`;
}

async function main(): Promise<void> {
  const options = parseOptions(process.argv.slice(2));
  const plan = await readJson<CandidatePlan>(options.planPath);
  if (plan.kind !== 'clip_composition_multicut_expected_candidate_plan') {
    throw new Error('複数区間候補プランJSONではありません');
  }

  const clipVideoPath = resolveWorkspacePath(requireString(plan.clip?.localVideoPath, '切り抜き動画パス'));
  const sourceVideoPath = resolveWorkspacePath(requireString(plan.source?.localVideoPath, '元動画パス'));
  if (!existsSync(clipVideoPath)) {
    throw new Error(`切り抜き動画が見つかりません: ${clipVideoPath}`);
  }
  if (!existsSync(sourceVideoPath)) {
    throw new Error(`元動画が見つかりません: ${sourceVideoPath}`);
  }

  const outputDir = path.join(evalRoot, 'outputs', 'visual-check', sanitizePathPart(plan.targetId));
  const reportDir = path.join(evalRoot, 'reports');
  await mkdir(outputDir, { recursive: true });
  await mkdir(reportDir, { recursive: true });

  const checks: RenderedCheck[] = [];
  for (const cut of requireCuts(plan)) {
    const durationMs = Math.min(cut.clipEndMs - cut.clipStartMs, cut.sourceEndMs - cut.sourceStartMs);
    if (durationMs <= 0) {
      throw new Error(`チャンク${cut.cutIndex + 1}の長さが不正です`);
    }

    const outputPath = path.join(
      outputDir,
      `multicut_${sanitizePathPart(plan.targetId)}_${options.outputId}_chunk${String(cut.cutIndex + 1).padStart(2, '0')}.mp4`
    );
    const status = await renderCheck({
      options,
      clipVideoPath,
      sourceVideoPath,
      outputPath,
      clipStartMs: cut.clipStartMs,
      sourceStartMs: cut.sourceStartMs,
      durationMs
    });
    checks.push({
      cutIndex: cut.cutIndex,
      clipStartMs: cut.clipStartMs,
      clipEndMs: cut.clipStartMs + durationMs,
      sourceStartMs: cut.sourceStartMs,
      sourceEndMs: cut.sourceStartMs + durationMs,
      durationMs,
      ...(cut.relationToPrevious ? { relationToPrevious: cut.relationToPrevious } : {}),
      outputVideoPath: relativeWorkspacePath(outputPath),
      status
    });
  }

  const manifest: RenderManifest = {
    kind: 'clip_composition_multicut_visual_check_manifest',
    runAt: new Date().toISOString(),
    planPath: relativeWorkspacePath(options.planPath),
    targetId: plan.targetId,
    ...(plan.source?.id ? { sourceId: plan.source.id } : {}),
    clipVideoPath: relativeWorkspacePath(clipVideoPath),
    sourceVideoPath: relativeWorkspacePath(sourceVideoPath),
    outputId: options.outputId,
    checks,
    nextActions: [
      '生成した各チャンク動画をWeb版Geminiへ渡し、切り抜き側と元動画側が同じ元ネタか確認する。',
      'Geminiまたは人間確認で一致したチャンクだけをexpectedCuts候補に残す。',
      '固定テーマは確認済み区間から人間が逆算して書く。',
      '複数区間expectedを採点できるようにscore側を拡張してからcomposition評価へ入れる。'
    ],
    productionImpact: {
      writesRuntime: false,
      touchesProductionUi: false,
      touchesProductionApi: false,
      touchesProductionQueue: false,
      touchesDatabase: false
    }
  };

  const manifestPath = path.join(evalRoot, 'outputs', `multicut-visual-checks-${sanitizePathPart(plan.targetId)}-${options.outputId}.json`);
  const reportPath = path.join(reportDir, `multicut-visual-checks-${sanitizePathPart(plan.targetId)}-${options.outputId}.md`);
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  await writeFile(reportPath, buildReport(manifest, manifestPath), 'utf8');

  console.log(`manifest: ${manifestPath}`);
  console.log(`report: ${reportPath}`);
  for (const check of checks) {
    console.log(`chunk ${check.cutIndex + 1}: ${check.status} ${check.outputVideoPath}`);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
