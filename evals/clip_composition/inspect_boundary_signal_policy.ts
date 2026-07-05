import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

type CliOptions = {
  fixtureIds: string[];
  outputId: string;
};

type FixtureFile = {
  fixtureId: string;
  draftId: string;
  transcriptPath: string;
  themesPath: string;
  selectedThemeId: string;
};

type TranscriptSegment = {
  id: number;
  startMs: number;
  endMs: number;
  text: string;
  speaker?: string;
};

type TranscriptFile = {
  segments?: unknown[];
};

type ExpectedCut = {
  sourceStartMs: number;
  sourceEndMs: number;
  reason?: string;
  audioVerification?: {
    bestAlignedSourceStartMs?: number;
    bestAlignedSourceEndMs?: number;
    reportPath?: string;
    resultPath?: string;
  };
  visualVerification?: {
    status?: string;
    resultPath?: string;
  };
};

type ExpectedFile = {
  fixtureId?: string;
  draftId?: string;
  expectedCuts: ExpectedCut[];
};

type BoundarySupport = {
  boundaryMs: number;
  side: 'start' | 'end';
  relation: 'segment_start' | 'segment_end' | 'inside_segment' | 'outside_transcript';
  segment?: TranscriptSegment;
  supportedByCurrentPromptInput: boolean;
  reason: string;
};

type SignalPolicy = {
  signal: string;
  inputUse: 'allowed' | 'required_next' | 'eval_only_forbidden';
  reason: string;
};

type FixturePolicy = {
  fixtureId: string;
  transcriptPath: string;
  expectedPath: string;
  currentInputCanExpressExpectedCut: boolean;
  boundarySupport: BoundarySupport[];
  signalPolicies: SignalPolicy[];
  nextAction: string;
};

type PolicyResult = {
  kind: 'clip_composition_boundary_signal_policy';
  runAt: string;
  fixtureCount: number;
  fixtures: FixturePolicy[];
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

  const fixturesText = values.get('fixtures')?.trim();
  if (!fixturesText) {
    throw new Error('--fixtures にカンマ区切りのfixture IDを指定してください');
  }

  return {
    fixtureIds: fixturesText.split(',').map((item) => sanitizePathPart(item.trim())).filter(Boolean),
    outputId: sanitizePathPart(values.get('outputId')?.trim() || timestampForFile())
  };
}

function sanitizePathPart(value: string): string {
  return value.replace(/[^a-zA-Z0-9_-]/g, '_');
}

function timestampForFile(): string {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

function relativeEvalPath(filePath: string): string {
  return path.relative(evalRoot, filePath);
}

async function readJson<T>(filePath: string): Promise<T> {
  return JSON.parse(await readFile(filePath, 'utf8')) as T;
}

function recordFrom(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function normalizeSegments(transcript: TranscriptFile): TranscriptSegment[] {
  return (transcript.segments ?? []).flatMap((item, index) => {
    const record = recordFrom(item);
    const id = typeof record.id === 'number' ? record.id : typeof record.speechId === 'number' ? record.speechId : index + 1;
    const startMs = typeof record.startMs === 'number' ? record.startMs : record.sourceStartMs;
    const endMs = typeof record.endMs === 'number' ? record.endMs : record.sourceEndMs;
    const text = typeof record.text === 'string' ? record.text : '';
    if (typeof startMs !== 'number' || typeof endMs !== 'number' || !text) {
      return [];
    }
    return [{
      id,
      startMs,
      endMs,
      text,
      ...(typeof record.speaker === 'string' ? { speaker: record.speaker } : {})
    }];
  }).sort((left, right) => left.startMs - right.startMs);
}

function boundarySupport(segments: TranscriptSegment[], boundaryMs: number, side: 'start' | 'end'): BoundarySupport {
  const segmentStart = segments.find((segment) => segment.startMs === boundaryMs);
  if (segmentStart) {
    return {
      boundaryMs,
      side,
      relation: 'segment_start',
      segment: segmentStart,
      supportedByCurrentPromptInput: true,
      reason: '現在のprompt入力に発話開始時刻として入っている'
    };
  }

  const segmentEnd = segments.find((segment) => segment.endMs === boundaryMs);
  if (segmentEnd) {
    return {
      boundaryMs,
      side,
      relation: 'segment_end',
      segment: segmentEnd,
      supportedByCurrentPromptInput: true,
      reason: '現在のprompt入力に発話終了時刻として入っている'
    };
  }

  const containing = segments.find((segment) => boundaryMs > segment.startMs && boundaryMs < segment.endMs);
  if (containing) {
    return {
      boundaryMs,
      side,
      relation: 'inside_segment',
      segment: containing,
      supportedByCurrentPromptInput: false,
      reason: '期待境界は発話途中にあり、現在のprompt入力にはその途中時刻を支える単語境界や音声境界がない'
    };
  }

  return {
    boundaryMs,
    side,
    relation: 'outside_transcript',
    supportedByCurrentPromptInput: false,
    reason: '期待境界が文字起こし範囲外にある'
  };
}

function hasExactAudioBoundary(expectedCut: ExpectedCut): boolean {
  return (
    typeof expectedCut.audioVerification?.bestAlignedSourceStartMs === 'number' ||
    typeof expectedCut.audioVerification?.bestAlignedSourceEndMs === 'number'
  );
}

function signalPolicies(input: {
  expectedCut: ExpectedCut;
  boundarySupport: BoundarySupport[];
}): SignalPolicy[] {
  const needsAdditionalBoundaryInput = input.boundarySupport.some((boundary) => !boundary.supportedByCurrentPromptInput);
  return [
    {
      signal: '固定テーマと文字起こしの発話開始・終了時刻',
      inputUse: 'allowed',
      reason: 'theme失敗とcomposition失敗を分けるための固定入力で、現在の評価promptが読む主入力'
    },
    ...(needsAdditionalBoundaryInput
      ? [{
        signal: 'ローカルSTTの単語時刻または独立に生成した音声境界候補',
        inputUse: 'required_next' as const,
        reason: '期待境界が発話途中にあり、発話単位だけでは境界を支える情報が足りない'
      }]
      : []),
    {
      signal: 'expectedCutsの開始・終了時刻',
      inputUse: 'eval_only_forbidden',
      reason: '採点基準そのものであり、composition入力へ入れると正解漏えいになる'
    },
    ...(hasExactAudioBoundary(input.expectedCut)
      ? [{
        signal: '音声比較で確定したbestAlignedSourceStartMs / bestAlignedSourceEndMs',
        inputUse: 'eval_only_forbidden' as const,
        reason: '既存切り抜きとの照合で得た正解区間なので、通常のcomposition評価入力には入れない'
      }]
      : []),
    ...(input.expectedCut.visualVerification
      ? [{
        signal: 'Web版Geminiの左右映像確認結果',
        inputUse: 'eval_only_forbidden' as const,
        reason: '正解fixtureの品質保証で使う情報であり、promptの候補選択入力ではない'
      }]
      : [])
  ];
}

function nextAction(boundaries: BoundarySupport[]): string {
  if (boundaries.every((boundary) => boundary.supportedByCurrentPromptInput)) {
    return '現在の発話境界入力だけでexpected境界を表現できるため、compositionプロンプト比較を続けられる。';
  }
  return 'v009でpromptだけを調整する前に、ローカルSTTの単語時刻または独立した音声境界候補をfixture入力として追加できる形にする。expectedの時刻や音声比較で確定した正解区間は入力へ入れない。';
}

async function inspectFixture(fixtureId: string): Promise<FixturePolicy> {
  const fixtureDir = path.join(evalRoot, 'fixtures', fixtureId);
  const fixturePath = path.join(fixtureDir, 'fixture.json');
  const expectedPath = path.join(evalRoot, 'expected', `${fixtureId}.json`);
  const fixture = await readJson<FixtureFile>(fixturePath);
  const transcriptPath = path.join(fixtureDir, fixture.transcriptPath);
  const transcript = await readJson<TranscriptFile>(transcriptPath);
  const expected = await readJson<ExpectedFile>(expectedPath);
  const expectedCut = expected.expectedCuts[0];
  if (!expectedCut) {
    throw new Error(`${expectedPath} に expectedCuts がありません`);
  }

  const segments = normalizeSegments(transcript);
  const boundaries = [
    boundarySupport(segments, expectedCut.sourceStartMs, 'start'),
    boundarySupport(segments, expectedCut.sourceEndMs, 'end')
  ];

  return {
    fixtureId: fixture.fixtureId,
    transcriptPath: relativeEvalPath(transcriptPath),
    expectedPath: relativeEvalPath(expectedPath),
    currentInputCanExpressExpectedCut: boundaries.every((boundary) => boundary.supportedByCurrentPromptInput),
    boundarySupport: boundaries,
    signalPolicies: signalPolicies({ expectedCut, boundarySupport: boundaries }),
    nextAction: nextAction(boundaries)
  };
}

function segmentText(segment?: TranscriptSegment): string {
  if (!segment) {
    return '該当なし';
  }
  return `発話${segment.id} ${segment.startMs}-${segment.endMs}ms「${segment.text}」`;
}

function boundaryLine(boundary: BoundarySupport): string {
  return `- ${boundary.side}: ${boundary.boundaryMs}ms / ${boundary.relation} / ${boundary.supportedByCurrentPromptInput ? '現在入力で表現可能' : '追加入力が必要'} / ${segmentText(boundary.segment)} / ${boundary.reason}`;
}

function policyLine(policy: SignalPolicy): string {
  return `- ${policy.inputUse}: ${policy.signal} / ${policy.reason}`;
}

function buildReport(result: PolicyResult, outputPath: string): string {
  const lines = [
    '# 境界入力シグナル方針',
    '',
    `- 結果JSON: ${relativeEvalPath(outputPath)}`,
    `- fixture数: ${result.fixtureCount}`,
    '',
    '## 目的',
    '',
    'composition評価で、発話途中の境界を扱うために入力へ足してよい情報と、正解漏えいになる情報を分ける。',
    'このレポートはSTTもLLMも実行しない。',
    ''
  ];

  for (const fixture of result.fixtures) {
    lines.push(`## ${fixture.fixtureId}`);
    lines.push('');
    lines.push(`- 文字起こし: ${fixture.transcriptPath}`);
    lines.push(`- 期待値: ${fixture.expectedPath}`);
    lines.push(`- 現在入力だけでexpected境界を表現できるか: ${fixture.currentInputCanExpressExpectedCut ? 'yes' : 'no'}`);
    lines.push('');
    lines.push('### 境界');
    lines.push('');
    lines.push(...fixture.boundarySupport.map(boundaryLine));
    lines.push('');
    lines.push('### 入力シグナル方針');
    lines.push('');
    lines.push(...fixture.signalPolicies.map(policyLine));
    lines.push('');
    lines.push('### 次の作業');
    lines.push('');
    lines.push(`- ${fixture.nextAction}`);
    lines.push('');
  }

  while (lines.at(-1) === '') {
    lines.pop();
  }
  return `${lines.join('\n')}\n`;
}

async function main() {
  const options = parseOptions(process.argv.slice(2));
  const result: PolicyResult = {
    kind: 'clip_composition_boundary_signal_policy',
    runAt: new Date().toISOString(),
    fixtureCount: options.fixtureIds.length,
    fixtures: []
  };

  for (const fixtureId of options.fixtureIds) {
    result.fixtures.push(await inspectFixture(fixtureId));
  }

  const outputPath = path.join(evalRoot, 'outputs', `boundary-signal-policy-${options.outputId}.json`);
  const reportPath = path.join(evalRoot, 'reports', `boundary-signal-policy-${options.outputId}.md`);
  await mkdir(path.dirname(outputPath), { recursive: true });
  await mkdir(path.dirname(reportPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(result, null, 2)}\n`, 'utf8');
  await writeFile(reportPath, buildReport(result, outputPath), 'utf8');

  console.log(`json: ${relativeEvalPath(outputPath)}`);
  console.log(`report: ${relativeEvalPath(reportPath)}`);
  for (const fixture of result.fixtures) {
    console.log(`${fixture.fixtureId}: current input ${fixture.currentInputCanExpressExpectedCut ? 'can' : 'cannot'} express expected boundaries`);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
