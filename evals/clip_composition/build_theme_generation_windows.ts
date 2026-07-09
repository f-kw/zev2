import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

type CliOptions = {
  fixtureId: string;
  generationSystem: string;
  outputId: string;
  promptVersion: string;
  requestedThemeCount: number;
  runs: number;
  maxPromptBytes: number;
  overlapMs: number;
  windowMode: 'speech-time';
};

type ThemeGenerationPayload = {
  kind: string;
  runAt: string;
  fixtureId: string;
  generationSystem: string;
  promptVersion: string;
  requestedThemeCount: number;
  plannedRuns: number;
  modelInput: ModelInput;
  evaluationOnly?: unknown;
  [key: string]: unknown;
};

type ModelInput = {
  task: string;
  generationSystem: string;
  promptVersion: string;
  requestedThemeCount: number;
  inputPolicy: Record<string, unknown>;
  windowing?: Record<string, unknown>;
  sources: SourceInput[];
  outputContract: unknown;
};

type SourceInput = {
  sourceVideoId: string;
  sourceUrl?: string;
  sourceTitle?: string;
  transcriptKind?: string;
  language?: string;
  durationSec?: number;
  rawSegmentCount?: number;
  promptSegmentCount?: number;
  segmentCompaction?: unknown;
  segments: SpeechSegment[];
};

type SpeechSegment = {
  speechId: number;
  sourceVideoId: string;
  sourceStartMs: number;
  sourceEndMs: number;
  text: string;
};

type WindowPlanItem = {
  windowId: string;
  sourceVideoId: string;
  sourceStartMs: number;
  sourceEndMs: number;
  segmentCount: number;
  firstSpeechId: number;
  lastSpeechId: number;
  promptPath: string;
  payloadPath: string;
  promptBytes: number;
};

const root = workspaceRoot();
const evalRoot = path.join(root, 'evals', 'clip_composition');

function workspaceRoot(): string {
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

function parseOptions(argv: string[]): CliOptions {
  const values = new Map<string, string>();
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

  const fixtureId = values.get('fixture')?.trim();
  if (!fixtureId) {
    throw new Error('--fixture を指定してください');
  }
  const maxPromptBytes = Number.parseInt(values.get('maxPromptBytes') ?? '', 10);
  const overlapMs = Number.parseInt(values.get('overlapMs') ?? '', 10);
  if (!Number.isInteger(maxPromptBytes) || maxPromptBytes < 1) {
    throw new Error('--maxPromptBytes は1以上の整数で指定してください');
  }
  if (!Number.isInteger(overlapMs) || overlapMs < 0) {
    throw new Error('--overlapMs は0以上の整数で指定してください');
  }

  return {
    fixtureId: sanitizePathPart(fixtureId),
    generationSystem: values.get('generationSystem')?.trim() || 'theme-llm-v001',
    outputId: sanitizePathPart(values.get('outputId')?.trim() || '20260709-v001'),
    promptVersion: values.get('promptVersion')?.trim() || 'theme_generation_prompt_v001',
    requestedThemeCount: Number.parseInt(values.get('requestedThemeCount') ?? '8', 10),
    runs: Number.parseInt(values.get('runs') ?? '3', 10),
    maxPromptBytes,
    overlapMs,
    windowMode: 'speech-time'
  };
}

function sanitizePathPart(value: string): string {
  return value.replace(/[^a-zA-Z0-9_-]/g, '_');
}

async function readJson<T>(filePath: string): Promise<T> {
  return JSON.parse(await readFile(filePath, 'utf8')) as T;
}

function buildPromptMarkdown(promptTemplate: string, modelInput: unknown): string {
  return [
    promptTemplate.trimEnd(),
    '',
    '## 入力JSON',
    '',
    '```json',
    JSON.stringify(modelInput, null, 2),
    '```',
    ''
  ].join('\n');
}

function sourceWithSegments(source: SourceInput, segments: SpeechSegment[]): SourceInput {
  return {
    ...source,
    promptSegmentCount: segments.length,
    segments
  };
}

function windowInput(baseInput: ModelInput, source: SourceInput, segments: SpeechSegment[], windowId: string, options: CliOptions): ModelInput {
  return {
    ...baseInput,
    requestedThemeCount: options.requestedThemeCount,
    windowing: {
      applied: true,
      mode: options.windowMode,
      windowId,
      reason: '未分割入力でEdgeレンダラが高負荷化して戻らなかったため、発話境界を保った時間窓へ分割する。',
      maxPromptBytes: options.maxPromptBytes,
      overlapMs: options.overlapMs,
      sourceVideoId: source.sourceVideoId,
      sourceStartMs: segments[0]?.sourceStartMs ?? 0,
      sourceEndMs: segments[segments.length - 1]?.sourceEndMs ?? 0
    },
    sources: [sourceWithSegments(source, segments)]
  };
}

function promptBytes(promptTemplate: string, modelInput: ModelInput): number {
  return Buffer.byteLength(buildPromptMarkdown(promptTemplate, modelInput), 'utf8');
}

function nextStartIndex(segments: SpeechSegment[], currentStart: number, currentEnd: number, overlapMs: number): number {
  if (currentEnd >= segments.length - 1) {
    return segments.length;
  }
  if (overlapMs === 0) {
    return currentEnd + 1;
  }
  const overlapStartMs = Math.max(segments[currentStart].sourceStartMs + 1, segments[currentEnd].sourceEndMs - overlapMs);
  const candidate = segments.findIndex((segment, index) => index > currentStart && segment.sourceEndMs > overlapStartMs);
  if (candidate < 0 || candidate > currentEnd + 1) {
    return currentEnd + 1;
  }
  return candidate;
}

function planSourceWindows(baseInput: ModelInput, source: SourceInput, promptTemplate: string, options: CliOptions): SpeechSegment[][] {
  const segments = [...source.segments].sort((left, right) =>
    left.sourceStartMs - right.sourceStartMs || left.sourceEndMs - right.sourceEndMs
  );
  const windows: SpeechSegment[][] = [];
  let start = 0;
  while (start < segments.length) {
    let end = start;
    while (end + 1 < segments.length) {
      const candidateSegments = segments.slice(start, end + 2);
      const candidateInput = windowInput(baseInput, source, candidateSegments, 'window_probe', options);
      if (promptBytes(promptTemplate, candidateInput) > options.maxPromptBytes && end >= start) {
        break;
      }
      end += 1;
    }
    windows.push(segments.slice(start, end + 1));
    start = nextStartIndex(segments, start, end, options.overlapMs);
  }
  return windows;
}

function windowPlanMarkdown(input: {
  fixtureId: string;
  generationSystem: string;
  outputId: string;
  requestedThemeCount: number;
  maxPromptBytes: number;
  overlapMs: number;
  windows: WindowPlanItem[];
}): string {
  const lines = [
    '# theme_generation window plan',
    '',
    `- fixture: ${input.fixtureId}`,
    `- 生成系統: ${input.generationSystem}`,
    `- outputId: ${input.outputId}`,
    `- 候補数N: ${input.requestedThemeCount}`,
    `- 窓分割: あり`,
    `- 分割方法: 発話境界を保った時間窓`,
    `- prompt byte上限: ${input.maxPromptBytes}`,
    `- 窓間オーバーラップ: ${input.overlapMs}ms`,
    `- 窓数: ${input.windows.length}`,
    '',
    '| window | sourceVideoId | source range | speeches | prompt bytes | prompt |',
    '| --- | --- | --- | ---: | ---: | --- |'
  ];
  for (const window of input.windows) {
    lines.push(`| ${window.windowId} | ${window.sourceVideoId} | ${window.sourceStartMs}-${window.sourceEndMs} | ${window.segmentCount} | ${window.promptBytes} | ${window.promptPath} |`);
  }
  lines.push('');
  return lines.join('\n');
}

async function main() {
  const options = parseOptions(process.argv.slice(2));
  const outputDir = path.join(evalRoot, 'outputs', 'theme-generation', options.fixtureId, options.generationSystem, options.outputId);
  const reportDir = path.join(evalRoot, 'reports', 'theme-generation', options.fixtureId, options.generationSystem, options.outputId);
  const promptTemplate = await readFile(path.join(evalRoot, 'prompts', `${options.promptVersion}.md`), 'utf8');
  const payloadPath = path.join(outputDir, 'prompt-input.json');
  const payload = await readJson<ThemeGenerationPayload>(payloadPath);
  const baseInput = payload.modelInput;
  const windows: WindowPlanItem[] = [];
  const windowPayloadPaths: string[] = [];
  const windowReportDir = path.join(reportDir, 'windows');
  const windowOutputDir = path.join(outputDir, 'windows');
  await mkdir(windowReportDir, { recursive: true });
  await mkdir(windowOutputDir, { recursive: true });

  for (const source of baseInput.sources) {
    const sourceWindows = planSourceWindows(baseInput, source, promptTemplate, options);
    for (const segments of sourceWindows) {
      const windowId = `window_${String(windows.length + 1).padStart(2, '0')}_${source.sourceVideoId}`;
      const modelInput = windowInput(baseInput, source, segments, windowId, options);
      const promptText = buildPromptMarkdown(promptTemplate, modelInput);
      const windowPayloadPath = path.join(windowOutputDir, `${windowId}-prompt-input.json`);
      const windowPromptPath = path.join(windowReportDir, `${windowId}-prompt.md`);
      await writeFile(windowPayloadPath, `${JSON.stringify({
        kind: 'theme_generation_window_prompt_payload',
        runAt: new Date().toISOString(),
        fixtureId: options.fixtureId,
        generationSystem: options.generationSystem,
        promptVersion: options.promptVersion,
        requestedThemeCount: options.requestedThemeCount,
        llmCall: false,
        modelInput
      }, null, 2)}\n`, 'utf8');
      await writeFile(windowPromptPath, promptText, 'utf8');
      windowPayloadPaths.push(path.relative(root, windowPayloadPath));
      windows.push({
        windowId,
        sourceVideoId: source.sourceVideoId,
        sourceStartMs: segments[0].sourceStartMs,
        sourceEndMs: segments[segments.length - 1].sourceEndMs,
        segmentCount: segments.length,
        firstSpeechId: segments[0].speechId,
        lastSpeechId: segments[segments.length - 1].speechId,
        promptPath: path.relative(root, windowPromptPath),
        payloadPath: path.relative(root, windowPayloadPath),
        promptBytes: Buffer.byteLength(promptText, 'utf8')
      });
    }
  }

  payload.modelInput.windowing = {
    applied: true,
    mode: options.windowMode,
    reason: '未分割入力でEdgeレンダラが高負荷化して戻らなかったため、発話境界を保った時間窓へ分割する。',
    maxPromptBytes: options.maxPromptBytes,
    overlapMs: options.overlapMs,
    windowCount: windows.length,
    preMergeCandidateCount: null,
    postMergeCandidateCount: null,
    merge: '同一sourceVideoIdで根拠範囲が重なる候補だけを機械統合。意味ベースの統合はしない。',
    windows
  };
  await writeFile(payloadPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  await writeFile(path.join(outputDir, 'window-plan.json'), `${JSON.stringify({
    fixtureId: options.fixtureId,
    generationSystem: options.generationSystem,
    outputId: options.outputId,
    promptVersion: options.promptVersion,
    requestedThemeCount: options.requestedThemeCount,
    runs: options.runs,
    maxPromptBytes: options.maxPromptBytes,
    overlapMs: options.overlapMs,
    windows,
    windowPayloadPaths
  }, null, 2)}\n`, 'utf8');
  await writeFile(path.join(reportDir, 'window-plan.md'), windowPlanMarkdown({
    fixtureId: options.fixtureId,
    generationSystem: options.generationSystem,
    outputId: options.outputId,
    requestedThemeCount: options.requestedThemeCount,
    maxPromptBytes: options.maxPromptBytes,
    overlapMs: options.overlapMs,
    windows
  }), 'utf8');
  console.log(`window plan: ${path.join(outputDir, 'window-plan.json')}`);
  console.log(`window report: ${path.join(reportDir, 'window-plan.md')}`);
  console.log(`windows: ${windows.length}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
