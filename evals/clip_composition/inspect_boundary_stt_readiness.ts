import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

type CliOptions = {
  jobsPath: string;
  outputId: string;
};

type BoundaryNeed = {
  side: 'start' | 'end';
  boundaryMs: number;
  clipBoundaryMs?: number;
  sourceSliceBoundaryMs?: number;
};

type SttRunPlan = {
  id: string;
  role: 'clip' | 'source';
  inputPath: string;
  command: string;
  wordTimestampsPath: string;
  transcriptPath: string;
};

type BoundaryJob = {
  fixtureId: string;
  targetId: string;
  boundaryNeeds: BoundaryNeed[];
  clipStt?: SttRunPlan;
  sourceStt?: SttRunPlan;
};

type JobsFile = {
  jobs: BoundaryJob[];
};

type WordTimestamp = {
  text: string;
  startMs: number;
  endMs: number;
};

type WordTimestampFile = {
  words?: WordTimestamp[];
};

type BoundaryReadiness = {
  side: 'start' | 'end';
  expectedSourceBoundaryMs: number;
  localBoundaryMs: number;
  containingWord?: WordTimestamp;
  nearestWordBoundary?: {
    word: WordTimestamp;
    boundary: 'start' | 'end';
    boundaryMs: number;
    deltaMs: number;
  };
};

type SttReadiness = {
  role: 'clip' | 'source';
  id: string;
  inputPath: string;
  command: string;
  wordTimestampsPath: string;
  transcriptPath: string;
  status: 'missing_output' | 'missing_words' | 'ready';
  wordCount?: number;
  boundaries: BoundaryReadiness[];
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

  const jobsPath = values.get('jobs')?.trim();
  if (!jobsPath) {
    throw new Error('--jobs に boundary-stt-jobs JSONを指定してください');
  }

  return {
    jobsPath: resolveWorkspacePath(jobsPath),
    outputId: sanitizePathPart(values.get('outputId')?.trim() || timestampForFile())
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

function wordsFrom(payload: WordTimestampFile): WordTimestamp[] {
  return (payload.words ?? [])
    .filter((word) => typeof word.text === 'string' && typeof word.startMs === 'number' && typeof word.endMs === 'number')
    .sort((left, right) => left.startMs - right.startMs);
}

function containingWord(words: WordTimestamp[], boundaryMs: number): WordTimestamp | undefined {
  return words.find((word) => boundaryMs >= word.startMs && boundaryMs <= word.endMs);
}

function nearestWordBoundary(words: WordTimestamp[], boundaryMs: number): BoundaryReadiness['nearestWordBoundary'] {
  let nearest: BoundaryReadiness['nearestWordBoundary'];
  for (const word of words) {
    for (const boundary of ['start', 'end'] as const) {
      const wordBoundaryMs = boundary === 'start' ? word.startMs : word.endMs;
      const deltaMs = wordBoundaryMs - boundaryMs;
      if (!nearest || Math.abs(deltaMs) < Math.abs(nearest.deltaMs)) {
        nearest = {
          word,
          boundary,
          boundaryMs: wordBoundaryMs,
          deltaMs
        };
      }
    }
  }
  return nearest;
}

function localBoundaryFor(need: BoundaryNeed, role: 'clip' | 'source'): number | undefined {
  return role === 'clip' ? need.clipBoundaryMs : need.sourceSliceBoundaryMs;
}

async function inspectRun(plan: SttRunPlan, needs: BoundaryNeed[]): Promise<SttReadiness> {
  const wordPath = resolveWorkspacePath(plan.wordTimestampsPath);
  const transcriptPath = resolveWorkspacePath(plan.transcriptPath);
  if (!existsSync(wordPath) || !existsSync(transcriptPath)) {
    return {
      role: plan.role,
      id: plan.id,
      inputPath: plan.inputPath,
      command: plan.command,
      wordTimestampsPath: plan.wordTimestampsPath,
      transcriptPath: plan.transcriptPath,
      status: 'missing_output',
      boundaries: []
    };
  }

  const words = wordsFrom(await readJson<WordTimestampFile>(wordPath));
  if (words.length === 0) {
    return {
      role: plan.role,
      id: plan.id,
      inputPath: plan.inputPath,
      command: plan.command,
      wordTimestampsPath: plan.wordTimestampsPath,
      transcriptPath: plan.transcriptPath,
      status: 'missing_words',
      wordCount: 0,
      boundaries: []
    };
  }

  const boundaries = needs.flatMap((need): BoundaryReadiness[] => {
    const localBoundaryMs = localBoundaryFor(need, plan.role);
    if (typeof localBoundaryMs !== 'number') {
      return [];
    }
    return [{
      side: need.side,
      expectedSourceBoundaryMs: need.boundaryMs,
      localBoundaryMs,
      ...(containingWord(words, localBoundaryMs) ? { containingWord: containingWord(words, localBoundaryMs) } : {}),
      ...(nearestWordBoundary(words, localBoundaryMs) ? { nearestWordBoundary: nearestWordBoundary(words, localBoundaryMs) } : {})
    }];
  });

  return {
    role: plan.role,
    id: plan.id,
    inputPath: plan.inputPath,
    command: plan.command,
    wordTimestampsPath: plan.wordTimestampsPath,
    transcriptPath: plan.transcriptPath,
    status: 'ready',
    wordCount: words.length,
    boundaries
  };
}

async function buildReadiness(jobsFile: JobsFile) {
  const results = [];
  for (const job of jobsFile.jobs) {
    const stt = [];
    if (job.clipStt) {
      stt.push(await inspectRun(job.clipStt, job.boundaryNeeds));
    }
    if (job.sourceStt) {
      stt.push(await inspectRun(job.sourceStt, job.boundaryNeeds));
    }
    results.push({
      fixtureId: job.fixtureId,
      targetId: job.targetId,
      stt
    });
  }
  return results;
}

function wordText(word?: WordTimestamp): string {
  if (!word) {
    return '該当なし';
  }
  return `${word.startMs}-${word.endMs}ms「${word.text}」`;
}

function buildReport(input: {
  resultPath: string;
  jobsPath: string;
  readiness: Awaited<ReturnType<typeof buildReadiness>>;
}): string {
  const lines = [
    '# 境界精度用STT readiness',
    '',
    `- 結果JSON: ${path.relative(evalRoot, input.resultPath)}`,
    `- 作業リストJSON: ${path.relative(workspaceRoot(), input.jobsPath)}`,
    '',
    '## 目的',
    '',
    '境界精度用STTの予定出力がそろっているか、単語時刻が境界点を覆っているかを確認する。',
    'この確認はSTTを実行しない。',
    ''
  ];

  for (const item of input.readiness) {
    lines.push(`## ${item.fixtureId}`);
    lines.push('');
    lines.push(`- 対象ID: ${item.targetId}`);
    for (const stt of item.stt) {
      lines.push('');
      lines.push(`### ${stt.role} / ${stt.id}`);
      lines.push('');
      lines.push(`- 状態: ${stt.status}`);
      lines.push(`- 入力: ${stt.inputPath}`);
      lines.push(`- 単語時刻: ${stt.wordTimestampsPath}`);
      lines.push(`- 発話: ${stt.transcriptPath}`);
      if (typeof stt.wordCount === 'number') {
        lines.push(`- 単語数: ${stt.wordCount}`);
      }
      if (stt.boundaries.length > 0) {
        lines.push('');
        lines.push('境界確認:');
        for (const boundary of stt.boundaries) {
          lines.push(`- ${boundary.side === 'start' ? '開始' : '終了'}境界: ローカル ${boundary.localBoundaryMs}ms / 元動画 ${boundary.expectedSourceBoundaryMs}ms / 含む単語 ${wordText(boundary.containingWord)} / 最寄り境界 ${boundary.nearestWordBoundary ? `${boundary.nearestWordBoundary.boundaryMs}ms (${boundary.nearestWordBoundary.deltaMs}ms) ${wordText(boundary.nearestWordBoundary.word)}` : '該当なし'}`);
        }
      }
    }
    lines.push('');
  }

  lines.push('## 読み取り');
  lines.push('');
  lines.push('- `missing_output` は、STTがまだ保存されていない状態。');
  lines.push('- `missing_words` は、STT出力はあるが単語時刻がない状態。');
  lines.push('- `ready` は、単語時刻があり、境界付近を確認できる状態。');
  lines.push('');
  return lines.join('\n');
}

async function main(): Promise<void> {
  const options = parseOptions(process.argv.slice(2));
  const jobsFile = await readJson<JobsFile>(options.jobsPath);
  const readiness = await buildReadiness(jobsFile);
  const result = {
    kind: 'clip_composition_boundary_stt_readiness',
    runAt: new Date().toISOString(),
    jobsPath: path.relative(workspaceRoot(), options.jobsPath),
    sttExecuted: false,
    readiness
  };
  const outputDir = path.join(evalRoot, 'outputs');
  const reportDir = path.join(evalRoot, 'reports');
  await mkdir(outputDir, { recursive: true });
  await mkdir(reportDir, { recursive: true });
  const resultPath = path.join(outputDir, `boundary-stt-readiness-${options.outputId}.json`);
  const reportPath = path.join(reportDir, `boundary-stt-readiness-${options.outputId}.md`);
  await writeFile(resultPath, `${JSON.stringify(result, null, 2)}\n`, 'utf8');
  await writeFile(reportPath, buildReport({ resultPath, jobsPath: options.jobsPath, readiness }), 'utf8');
  console.log(`result: ${resultPath}`);
  console.log(`report: ${reportPath}`);
  console.log('stt executed: no');
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
