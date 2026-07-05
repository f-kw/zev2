import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

type CliOptions = {
  fixtureIds: string[];
  outputId: string;
};

type FixtureFile = {
  fixtureId: string;
  transcriptPath: string;
};

type TranscriptSegment = {
  id: number;
  startMs: number;
  endMs: number;
  text: string;
  speaker?: string;
};

type TranscriptFile = {
  segments: TranscriptSegment[];
};

type ExpectedCut = {
  sourceStartMs: number;
  sourceEndMs: number;
  reason: string;
};

type ExpectedFile = {
  expectedCuts: ExpectedCut[];
};

type BoundaryAnalysis = {
  boundaryMs: number;
  relation: 'segment_start' | 'segment_end' | 'inside_segment' | 'outside_transcript';
  segment?: TranscriptSegment;
  offsetFromSegmentStartMs?: number;
  offsetToSegmentEndMs?: number;
  previousSegment?: TranscriptSegment;
  nextSegment?: TranscriptSegment;
};

type CutAnalysis = {
  sourceStartMs: number;
  sourceEndMs: number;
  reason: string;
  startBoundary: BoundaryAnalysis;
  endBoundary: BoundaryAnalysis;
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

  const fixtureText = values.get('fixtures')?.trim();
  if (!fixtureText) {
    throw new Error('--fixtures にカンマ区切りのfixture IDを指定してください');
  }

  return {
    fixtureIds: fixtureText.split(',').map((item) => sanitizePathPart(item.trim())).filter(Boolean),
    outputId: sanitizePathPart(values.get('outputId')?.trim() || timestampForFile())
  };
}

function sanitizePathPart(value: string): string {
  return value.replace(/[^a-zA-Z0-9_-]/g, '_');
}

function timestampForFile(): string {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

async function readJson<T>(filePath: string): Promise<T> {
  return JSON.parse(await readFile(filePath, 'utf8')) as T;
}

function segmentAt(segments: TranscriptSegment[], boundaryMs: number): TranscriptSegment | undefined {
  return segments.find((segment) => boundaryMs >= segment.startMs && boundaryMs <= segment.endMs);
}

function previousSegment(segments: TranscriptSegment[], boundaryMs: number): TranscriptSegment | undefined {
  return [...segments].reverse().find((segment) => segment.endMs <= boundaryMs);
}

function nextSegment(segments: TranscriptSegment[], boundaryMs: number): TranscriptSegment | undefined {
  return segments.find((segment) => segment.startMs >= boundaryMs);
}

function analyzeBoundary(segments: TranscriptSegment[], boundaryMs: number): BoundaryAnalysis {
  const segment = segmentAt(segments, boundaryMs);
  if (!segment) {
    return {
      boundaryMs,
      relation: 'outside_transcript',
      previousSegment: previousSegment(segments, boundaryMs),
      nextSegment: nextSegment(segments, boundaryMs)
    };
  }
  if (boundaryMs === segment.startMs) {
    return { boundaryMs, relation: 'segment_start', segment };
  }
  if (boundaryMs === segment.endMs) {
    return { boundaryMs, relation: 'segment_end', segment };
  }
  return {
    boundaryMs,
    relation: 'inside_segment',
    segment,
    offsetFromSegmentStartMs: boundaryMs - segment.startMs,
    offsetToSegmentEndMs: segment.endMs - boundaryMs
  };
}

async function analyzeFixture(fixtureId: string) {
  const fixtureDir = path.join(evalRoot, 'fixtures', fixtureId);
  const fixture = await readJson<FixtureFile>(path.join(fixtureDir, 'fixture.json'));
  const transcript = await readJson<TranscriptFile>(path.join(fixtureDir, fixture.transcriptPath));
  const expected = await readJson<ExpectedFile>(path.join(evalRoot, 'expected', `${fixtureId}.json`));
  const segments = [...transcript.segments].sort((left, right) => left.startMs - right.startMs);
  return {
    fixtureId: fixture.fixtureId,
    transcriptPath: path.relative(evalRoot, path.join(fixtureDir, fixture.transcriptPath)),
    expectedPath: path.relative(evalRoot, path.join(evalRoot, 'expected', `${fixtureId}.json`)),
    cuts: expected.expectedCuts.map((cut): CutAnalysis => ({
      sourceStartMs: cut.sourceStartMs,
      sourceEndMs: cut.sourceEndMs,
      reason: cut.reason,
      startBoundary: analyzeBoundary(segments, cut.sourceStartMs),
      endBoundary: analyzeBoundary(segments, cut.sourceEndMs)
    }))
  };
}

function segmentLabel(segment?: TranscriptSegment): string {
  if (!segment) {
    return '該当なし';
  }
  return `発話${segment.id} ${segment.startMs}-${segment.endMs}ms「${segment.text}」`;
}

function boundaryText(boundary: BoundaryAnalysis): string {
  if (boundary.relation === 'segment_start') {
    return `${boundary.boundaryMs}ms は ${segmentLabel(boundary.segment)} の開始と一致`;
  }
  if (boundary.relation === 'segment_end') {
    return `${boundary.boundaryMs}ms は ${segmentLabel(boundary.segment)} の終了と一致`;
  }
  if (boundary.relation === 'inside_segment') {
    return `${boundary.boundaryMs}ms は ${segmentLabel(boundary.segment)} の途中。発話開始から ${boundary.offsetFromSegmentStartMs}ms、発話終了まで ${boundary.offsetToSegmentEndMs}ms`;
  }
  return `${boundary.boundaryMs}ms は発話外。直前: ${segmentLabel(boundary.previousSegment)} / 直後: ${segmentLabel(boundary.nextSegment)}`;
}

function buildReport(result: Awaited<ReturnType<typeof analyzeFixture>>[], resultPath: string): string {
  const lines = [
    '# expectedCuts 境界粒度レポート',
    '',
    `- 結果JSON: ${path.relative(evalRoot, resultPath)}`,
    '',
    '## 目的',
    '',
    '期待区間の開始・終了が、評価fixtureの文字起こし発話境界と一致しているかを確認する。',
    '境界が発話の途中にある場合、compositionプロンプトだけでは正確な終端を選びにくい。',
    ''
  ];

  for (const fixture of result) {
    lines.push(`## ${fixture.fixtureId}`);
    lines.push('');
    lines.push(`- 文字起こし: ${fixture.transcriptPath}`);
    lines.push(`- 期待値: ${fixture.expectedPath}`);
    for (const cut of fixture.cuts) {
      lines.push('');
      lines.push(`### 期待区間 ${cut.sourceStartMs}-${cut.sourceEndMs}ms`);
      lines.push('');
      lines.push(`- 開始境界: ${boundaryText(cut.startBoundary)}`);
      lines.push(`- 終了境界: ${boundaryText(cut.endBoundary)}`);
      lines.push(`- 期待理由: ${cut.reason}`);
    }
    lines.push('');
  }

  lines.push('## 読み取り');
  lines.push('');
  lines.push('- 期待境界が発話開始または発話終了と一致するfixtureは、発話単位の入力だけで比較しやすい。');
  lines.push('- 期待境界が発話途中にあるfixtureは、ローカルSTTの単語境界または音声境界を入力へ追加する必要がある。');
  lines.push('- 秒数補正をプロンプトへ入れるのではなく、境界を示す入力粒度を上げる。');
  lines.push('');

  return `${lines.join('\n')}`;
}

async function main(): Promise<void> {
  const options = parseOptions(process.argv.slice(2));
  const result = {
    kind: 'clip_composition_expected_boundary_granularity',
    runAt: new Date().toISOString(),
    fixtures: await Promise.all(options.fixtureIds.map((fixtureId) => analyzeFixture(fixtureId)))
  };

  const outputDir = path.join(evalRoot, 'outputs');
  const reportDir = path.join(evalRoot, 'reports');
  await mkdir(outputDir, { recursive: true });
  await mkdir(reportDir, { recursive: true });
  const resultPath = path.join(outputDir, `boundary-granularity-${options.outputId}.json`);
  const reportPath = path.join(reportDir, `boundary-granularity-${options.outputId}.md`);
  await writeFile(resultPath, `${JSON.stringify(result, null, 2)}\n`, 'utf8');
  await writeFile(reportPath, buildReport(result.fixtures, resultPath), 'utf8');
  console.log(`result: ${resultPath}`);
  console.log(`report: ${reportPath}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
