import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

type CliOptions = {
  boundaryPath: string;
  targetPaths: string[];
  outputId: string;
  serverUrl: string;
};

type BoundarySegment = {
  id: number;
  startMs: number;
  endMs: number;
  text: string;
  speaker?: string;
};

type BoundaryInfo = {
  boundaryMs: number;
  relation: 'segment_start' | 'segment_end' | 'inside_segment' | 'outside_transcript';
  segment?: BoundarySegment;
  offsetFromSegmentStartMs?: number;
  offsetToSegmentEndMs?: number;
};

type BoundaryGranularityResult = {
  fixtures: Array<{
    fixtureId: string;
    cuts: Array<{
      sourceStartMs: number;
      sourceEndMs: number;
      startBoundary: BoundaryInfo;
      endBoundary: BoundaryInfo;
    }>;
  }>;
};

type ExpectedCut = {
  sourceStartMs: number;
  sourceEndMs: number;
  sourceSttId?: string;
  sourceVideoId?: string;
  clipId?: string;
  audioVerification?: {
    sourceSliceStartMs?: number;
    sourceSliceEndMs?: number;
    bestAlignedSourceStartMs?: number;
    bestAlignedSourceEndMs?: number;
  };
};

type ExpectedFile = {
  fixtureId?: string;
  expectedCuts: ExpectedCut[];
};

type TargetFile = {
  targetId: string;
  clip: {
    id: string;
    sttId?: string;
    localAudioPath?: string;
    localVideoPath?: string;
  };
  sourceCandidates: Array<{
    id: string;
    sttId?: string;
    localAudioPath?: string;
    localVideoPath?: string;
  }>;
};

type SttJob = {
  fixtureId: string;
  targetId: string;
  reason: string;
  boundaryNeeds: Array<{
    side: 'start' | 'end';
    boundaryMs: number;
    segment: BoundarySegment;
    offsetFromSegmentStartMs: number;
    offsetToSegmentEndMs: number;
    sourceSliceBoundaryMs?: number;
  }>;
  clipSttCommand?: string;
  sourceSttCommand?: string;
  sourceSliceStartMs?: number;
  sourceSliceEndMs?: number;
  notes: string[];
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

  const boundaryPath = values.get('boundary')?.trim();
  if (!boundaryPath) {
    throw new Error('--boundary に boundary-granularity のJSONを指定してください');
  }
  const targets = values.get('targets')?.trim();
  if (!targets) {
    throw new Error('--targets にカンマ区切りの stt-targets JSONを指定してください');
  }

  return {
    boundaryPath: resolveWorkspacePath(boundaryPath),
    targetPaths: targets.split(',').map((item) => resolveWorkspacePath(item.trim())).filter(Boolean),
    outputId: sanitizePathPart(values.get('outputId')?.trim() || timestampForFile()),
    serverUrl: values.get('server')?.trim() || 'http://192.168.1.8:8000'
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

async function readJson<T>(filePath: string): Promise<T> {
  return JSON.parse(await readFile(filePath, 'utf8')) as T;
}

function command(input: {
  inputPath: string;
  id: string;
  role: 'clip' | 'source';
  serverUrl: string;
}): string {
  return [
    'node evals/clip_composition/run_local_stt.ts',
    `--input ${input.inputPath}`,
    `--id ${input.id}`,
    `--role ${input.role}`,
    `--server ${input.serverUrl}`
  ].join(' ');
}

function localSttId(value: string): string {
  return sanitizePathPart(`${value.replace(/_youtube_auto$/, '')}_local_boundary_v001`);
}

function targetForExpected(targets: TargetFile[], expected: ExpectedCut): TargetFile | undefined {
  return targets.find((target) => {
    if (expected.clipId && target.clip.id === expected.clipId) {
      return true;
    }
    return target.sourceCandidates.some((source) => source.id === expected.sourceVideoId || source.sttId === expected.sourceSttId);
  });
}

function sourceForExpected(target: TargetFile, expected: ExpectedCut) {
  return target.sourceCandidates.find((source) => source.id === expected.sourceVideoId || source.sttId === expected.sourceSttId);
}

function insideNeeds(cut: BoundaryGranularityResult['fixtures'][number]['cuts'][number]): SttJob['boundaryNeeds'] {
  return ([
    { side: 'start' as const, boundary: cut.startBoundary },
    { side: 'end' as const, boundary: cut.endBoundary }
  ]).flatMap((item) => {
    const segment = item.boundary.segment;
    if (
      item.boundary.relation !== 'inside_segment' ||
      !segment ||
      typeof item.boundary.offsetFromSegmentStartMs !== 'number' ||
      typeof item.boundary.offsetToSegmentEndMs !== 'number'
    ) {
      return [];
    }
    return [{
      side: item.side,
      boundaryMs: item.boundary.boundaryMs,
      segment,
      offsetFromSegmentStartMs: item.boundary.offsetFromSegmentStartMs,
      offsetToSegmentEndMs: item.boundary.offsetToSegmentEndMs
    }];
  });
}

async function buildJobs(options: CliOptions): Promise<SttJob[]> {
  const boundary = await readJson<BoundaryGranularityResult>(options.boundaryPath);
  const targets = await Promise.all(options.targetPaths.map((targetPath) => readJson<TargetFile>(targetPath)));
  const jobs: SttJob[] = [];

  for (const fixture of boundary.fixtures) {
    const expectedPath = path.join(evalRoot, 'expected', `${fixture.fixtureId}.json`);
    const expected = await readJson<ExpectedFile>(expectedPath);
    const cut = fixture.cuts[0];
    const expectedCut = expected.expectedCuts[0];
    if (!cut || !expectedCut) {
      continue;
    }

    const needs = insideNeeds(cut);
    if (needs.length === 0) {
      continue;
    }

    const target = targetForExpected(targets, expectedCut);
    if (!target) {
      jobs.push({
        fixtureId: fixture.fixtureId,
        targetId: 'unknown',
        reason: '期待境界が発話途中にあるが、対応するSTT対象定義が見つからない。',
        boundaryNeeds: needs,
        notes: ['--targets に対応する stt-targets JSONを追加してください。']
      });
      continue;
    }

    const source = sourceForExpected(target, expectedCut);
    const sourceSliceStartMs = expectedCut.audioVerification?.sourceSliceStartMs;
    const sourceSliceEndMs = expectedCut.audioVerification?.sourceSliceEndMs;
    const needsWithSlice = needs.map((need) => ({
      ...need,
      ...(typeof sourceSliceStartMs === 'number' ? { sourceSliceBoundaryMs: need.boundaryMs - sourceSliceStartMs } : {})
    }));
    const clipInputPath = target.clip.localAudioPath ?? target.clip.localVideoPath;
    const sourceInputPath = source?.localAudioPath ?? source?.localVideoPath;
    const notes = [
      'STTはここでは実行しない。サーバー復旧後にコマンドを実行する。',
      '期待境界をモデル入力へ直接渡すのではなく、単語境界または音声境界を得るための最小STT対象として扱う。',
      'sourceSliceBoundaryMs は、元動画切り出し音声内で期待境界がどこにあるかを示す確認用の値。'
    ];
    jobs.push({
      fixtureId: fixture.fixtureId,
      targetId: target.targetId,
      reason: '期待境界が文字起こし発話の途中にあるため、発話単位より細かい境界情報が必要。',
      boundaryNeeds: needsWithSlice,
      ...(clipInputPath ? {
        clipSttCommand: command({
          inputPath: clipInputPath,
          id: localSttId(target.clip.sttId ?? target.clip.id),
          role: 'clip',
          serverUrl: options.serverUrl
        })
      } : {}),
      ...(source && sourceInputPath ? {
        sourceSttCommand: command({
          inputPath: sourceInputPath,
          id: localSttId(source.sttId ?? source.id),
          role: 'source',
          serverUrl: options.serverUrl
        })
      } : {}),
      ...(typeof sourceSliceStartMs === 'number' ? { sourceSliceStartMs } : {}),
      ...(typeof sourceSliceEndMs === 'number' ? { sourceSliceEndMs } : {}),
      notes
    });
  }

  return jobs;
}

function segmentText(segment: BoundarySegment): string {
  return `発話${segment.id} ${segment.startMs}-${segment.endMs}ms「${segment.text}」`;
}

function buildReport(input: {
  resultPath: string;
  boundaryPath: string;
  targetPaths: string[];
  jobs: SttJob[];
}): string {
  const lines = [
    '# 境界精度用STT作業リスト',
    '',
    `- 結果JSON: ${path.relative(evalRoot, input.resultPath)}`,
    `- 境界粒度JSON: ${path.relative(workspaceRoot(), input.boundaryPath)}`,
    `- STT対象定義: ${input.targetPaths.map((item) => path.relative(workspaceRoot(), item)).join(', ')}`,
    '',
    '## 目的',
    '',
    '期待境界が発話途中にあるfixtureについて、次にどの短い音声をSTTまたは音声境界解析へ回すべきかを固定する。',
    'このレポートはSTTを実行しない。runtimeにも書き込まない。',
    ''
  ];

  if (input.jobs.length === 0) {
    lines.push('## 作業なし');
    lines.push('');
    lines.push('指定されたfixtureには、発話途中にある期待境界がありません。');
    return lines.join('\n');
  }

  for (const job of input.jobs) {
    lines.push(`## ${job.fixtureId}`);
    lines.push('');
    lines.push(`- 理由: ${job.reason}`);
    lines.push(`- 対象ID: ${job.targetId}`);
    if (typeof job.sourceSliceStartMs === 'number' && typeof job.sourceSliceEndMs === 'number') {
      lines.push(`- 元動画切り出し範囲: ${job.sourceSliceStartMs}-${job.sourceSliceEndMs}ms`);
    }
    lines.push('');
    lines.push('### 必要な境界');
    lines.push('');
    for (const need of job.boundaryNeeds) {
      lines.push(`- ${need.side === 'start' ? '開始' : '終了'}境界 ${need.boundaryMs}ms: ${segmentText(need.segment)} の途中。発話開始から ${need.offsetFromSegmentStartMs}ms、発話終了まで ${need.offsetToSegmentEndMs}ms${typeof need.sourceSliceBoundaryMs === 'number' ? `。切り出し音声内では ${need.sourceSliceBoundaryMs}ms` : ''}`);
    }
    lines.push('');
    lines.push('### STT実行候補');
    lines.push('');
    if (job.clipSttCommand) {
      lines.push('切り抜き側:');
      lines.push('');
      lines.push('```sh');
      lines.push(job.clipSttCommand);
      lines.push('```');
      lines.push('');
    }
    if (job.sourceSttCommand) {
      lines.push('元動画側:');
      lines.push('');
      lines.push('```sh');
      lines.push(job.sourceSttCommand);
      lines.push('```');
      lines.push('');
    }
    lines.push('### 注意');
    lines.push('');
    for (const note of job.notes) {
      lines.push(`- ${note}`);
    }
    lines.push('');
  }

  return lines.join('\n');
}

async function main(): Promise<void> {
  const options = parseOptions(process.argv.slice(2));
  const jobs = await buildJobs(options);
  const result = {
    kind: 'clip_composition_boundary_stt_jobs',
    runAt: new Date().toISOString(),
    boundaryPath: path.relative(workspaceRoot(), options.boundaryPath),
    targetPaths: options.targetPaths.map((targetPath) => path.relative(workspaceRoot(), targetPath)),
    serverUrl: options.serverUrl,
    sttExecuted: false,
    jobs
  };
  const outputDir = path.join(evalRoot, 'outputs');
  const reportDir = path.join(evalRoot, 'reports');
  await mkdir(outputDir, { recursive: true });
  await mkdir(reportDir, { recursive: true });
  const resultPath = path.join(outputDir, `boundary-stt-jobs-${options.outputId}.json`);
  const reportPath = path.join(reportDir, `boundary-stt-jobs-${options.outputId}.md`);
  await writeFile(resultPath, `${JSON.stringify(result, null, 2)}\n`, 'utf8');
  await writeFile(reportPath, buildReport({
    resultPath,
    boundaryPath: options.boundaryPath,
    targetPaths: options.targetPaths,
    jobs
  }), 'utf8');
  console.log(`result: ${resultPath}`);
  console.log(`report: ${reportPath}`);
  console.log('stt executed: no');
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
