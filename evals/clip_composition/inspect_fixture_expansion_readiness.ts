#!/usr/bin/env node
import { existsSync } from 'node:fs';
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

type CliOptions = {
  fixtureIds?: string[];
  targetPaths?: string[];
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
  segments?: unknown[];
};

type ExpectedCut = {
  sourceStartMs: number;
  sourceEndMs: number;
  reason?: string;
  clipId?: string;
  verificationStatus?: string;
  usableForCompositionPromptEval?: boolean;
  audioVerification?: {
    status?: string;
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
  expectedCuts?: ExpectedCut[];
};

type BoundaryRelation = 'segment_start' | 'segment_end' | 'inside_segment' | 'outside_transcript';

type BoundarySupport = {
  boundaryMs: number;
  side: 'start' | 'end';
  relation: BoundaryRelation;
  segment?: TranscriptSegment;
  offsetFromSegmentStartMs?: number;
  offsetToSegmentEndMs?: number;
};

type BoundaryPayload = {
  fixtureId?: string;
  boundarySignalInput?: {
    units?: unknown[];
    transitions?: unknown[];
  };
  evaluationOnly?: {
    expectedBoundaryValuesFoundInBoundarySignalInput?: unknown[];
  };
};

type FixtureReadiness = {
  fixtureId: string;
  expectedPath: string;
  transcriptPath: string;
  clipId?: string;
  verificationStatus?: string;
  usableForCompositionPromptEval?: boolean;
  boundarySupport: BoundarySupport[];
  boundarySignalPayloads: Array<{
    path: string;
    unitCount: number;
    transitionCount: number;
    expectedLeakCount: number;
  }>;
  role: 'boundary_transition_candidate' | 'control_fixture' | 'legacy_or_unverified_fixture' | 'not_eval_usable' | 'missing_expected';
  nextAction: string;
};

type SttTargetFile = {
  targetId: string;
  title?: string;
  alignment?: {
    resultPath?: string;
    reportPath?: string;
    audioCompareResultPath?: string;
    audioCompareReportPath?: string;
    visualVerificationPath?: string;
  };
};

type ChunkWindow = {
  chunkIndex: number;
  clipStartMs: number;
  clipEndMs: number;
  sourceStartMs: number;
  sourceEndMs: number;
  relationToPrevious?: 'first' | 'gap' | 'touching' | 'overlap';
  sourceGapFromPreviousMs?: number;
  textCoverage?: number;
  envelopeCorrelation?: number;
};

type TargetReadiness = {
  targetId: string;
  title?: string;
  targetPath: string;
  expectedFixtureIds: string[];
  alignmentResultPath?: string;
  alignmentReportPath?: string;
  audioCompareResultPath?: string;
  audioCompareReportPath?: string;
  visualVerificationPath?: string;
  visualVerificationStatus?: string;
  audioChunkWindows: ChunkWindow[];
  hasPositiveSourceGaps: boolean;
  role: 'already_has_expected' | 'candidate_requires_multicut_or_different_clip' | 'candidate_needs_verification' | 'missing_alignment';
  nextAction: string;
};

type ReadinessReport = {
  kind: 'clip_composition_fixture_expansion_readiness';
  runAt: string;
  fixtures: FixtureReadiness[];
  targets: TargetReadiness[];
  summary: string[];
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

  return {
    fixtureIds: values.get('fixtures')?.split(',').map((item) => sanitizePathPart(item.trim())).filter(Boolean),
    targetPaths: values.get('targets')?.split(',').map((item) => resolveWorkspacePath(item.trim())).filter(Boolean),
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

function relativeWorkspacePath(filePath: string): string {
  return path.relative(workspaceRoot(), filePath);
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

async function defaultFixtureIds(): Promise<string[]> {
  const fixtureDir = path.join(evalRoot, 'fixtures');
  const names = await readdir(fixtureDir);
  return names
    .filter((name) => existsSync(path.join(evalRoot, 'expected', `${name}.json`)))
    .sort();
}

async function defaultTargetPaths(): Promise<string[]> {
  const targetDir = path.join(evalRoot, 'stt-targets');
  const names = await readdir(targetDir);
  return names
    .filter((name) => name.endsWith('.json'))
    .sort()
    .map((name) => path.join(targetDir, name));
}

function inspectBoundary(segments: TranscriptSegment[], boundaryMs: number, side: 'start' | 'end'): BoundarySupport {
  const segmentStart = segments.find((segment) => segment.startMs === boundaryMs);
  if (segmentStart) {
    return { boundaryMs, side, relation: 'segment_start', segment: segmentStart };
  }
  const segmentEnd = segments.find((segment) => segment.endMs === boundaryMs);
  if (segmentEnd) {
    return { boundaryMs, side, relation: 'segment_end', segment: segmentEnd };
  }
  const containing = segments.find((segment) => boundaryMs > segment.startMs && boundaryMs < segment.endMs);
  if (containing) {
    return {
      boundaryMs,
      side,
      relation: 'inside_segment',
      segment: containing,
      offsetFromSegmentStartMs: boundaryMs - containing.startMs,
      offsetToSegmentEndMs: containing.endMs - boundaryMs
    };
  }
  return { boundaryMs, side, relation: 'outside_transcript' };
}

async function boundarySignalPayloadsForFixture(fixtureId: string): Promise<FixtureReadiness['boundarySignalPayloads']> {
  const outputDir = path.join(evalRoot, 'outputs');
  const names = await readdir(outputDir);
  const payloads: FixtureReadiness['boundarySignalPayloads'] = [];
  for (const name of names.filter((item) => item.startsWith('boundary-signal-payload-') && item.endsWith('.json')).sort()) {
    const filePath = path.join(outputDir, name);
    const payload = await readJson<BoundaryPayload>(filePath).catch(() => undefined);
    if (!payload || payload.fixtureId !== fixtureId) {
      continue;
    }
    payloads.push({
      path: relativeWorkspacePath(filePath),
      unitCount: payload.boundarySignalInput?.units?.length ?? 0,
      transitionCount: payload.boundarySignalInput?.transitions?.length ?? 0,
      expectedLeakCount: payload.evaluationOnly?.expectedBoundaryValuesFoundInBoundarySignalInput?.length ?? 0
    });
  }
  return payloads;
}

function fixtureRole(input: {
  expectedCut?: ExpectedCut;
  boundarySupport: BoundarySupport[];
  boundarySignalPayloads: FixtureReadiness['boundarySignalPayloads'];
}): Pick<FixtureReadiness, 'role' | 'nextAction'> {
  if (!input.expectedCut) {
    return {
      role: 'missing_expected',
      nextAction: 'expectedCuts がないため、composition prompt比較には使えません。'
    };
  }
  if (input.expectedCut.usableForCompositionPromptEval === false) {
    return {
      role: 'not_eval_usable',
      nextAction: 'expected側でcomposition評価に使わない指定があるため、別fixtureを使います。'
    };
  }
  if (input.expectedCut.usableForCompositionPromptEval !== true) {
    return {
      role: 'legacy_or_unverified_fixture',
      nextAction: 'composition評価に使える指定がないため、回帰確認には使わず、必要ならexpectedの検証状態を更新します。'
    };
  }
  const hasInsideBoundary = input.boundarySupport.some((boundary) => boundary.relation === 'inside_segment');
  if (!hasInsideBoundary) {
    return {
      role: 'control_fixture',
      nextAction: '期待境界が発話境界と一致しているため、境界遷移promptの回帰確認用として使います。'
    };
  }
  if (input.boundarySignalPayloads.some((payload) => payload.expectedLeakCount === 0 && payload.transitionCount > 0)) {
    return {
      role: 'boundary_transition_candidate',
      nextAction: '発話途中の期待境界と、expectedを含まない境界候補payloadがあるため、境界遷移promptの検証対象にできます。'
    };
  }
  return {
    role: 'not_eval_usable',
    nextAction: '発話途中の期待境界があるため、先にexpectedを含まない境界候補payloadを作る必要があります。'
  };
}

async function inspectFixture(fixtureId: string): Promise<FixtureReadiness> {
  const fixtureDir = path.join(evalRoot, 'fixtures', fixtureId);
  const expectedPath = path.join(evalRoot, 'expected', `${fixtureId}.json`);
  const fixture = await readJson<FixtureFile>(path.join(fixtureDir, 'fixture.json'));
  const transcriptPath = path.join(fixtureDir, fixture.transcriptPath);
  const transcript = await readJson<TranscriptFile>(transcriptPath);
  const expected = existsSync(expectedPath) ? await readJson<ExpectedFile>(expectedPath) : undefined;
  const expectedCut = expected?.expectedCuts?.[0];
  const segments = normalizeSegments(transcript);
  const boundarySupport = expectedCut
    ? [
      inspectBoundary(segments, expectedCut.sourceStartMs, 'start'),
      inspectBoundary(segments, expectedCut.sourceEndMs, 'end')
    ]
    : [];
  const boundarySignalPayloads = await boundarySignalPayloadsForFixture(fixture.fixtureId);
  const role = fixtureRole({ expectedCut, boundarySupport, boundarySignalPayloads });
  return {
    fixtureId: fixture.fixtureId,
    expectedPath: relativeWorkspacePath(expectedPath),
    transcriptPath: relativeWorkspacePath(transcriptPath),
    ...(expectedCut?.clipId ? { clipId: expectedCut.clipId } : {}),
    ...(expectedCut?.verificationStatus ? { verificationStatus: expectedCut.verificationStatus } : {}),
    ...(typeof expectedCut?.usableForCompositionPromptEval === 'boolean' ? { usableForCompositionPromptEval: expectedCut.usableForCompositionPromptEval } : {}),
    boundarySupport,
    boundarySignalPayloads,
    ...role
  };
}

function outputPathFromTarget(targetId: string, kind: 'alignment' | 'audioCompare'): string {
  const fileName = kind === 'alignment'
    ? `alignment-${targetId}_youtube_auto_v001.json`
    : `audio-compare-chunks-${targetId}_youtube_auto_v001.json`;
  return path.join(evalRoot, 'outputs', fileName);
}

function reportPathFromTarget(targetId: string, kind: 'alignment' | 'audioCompare'): string {
  const fileName = kind === 'alignment'
    ? `alignment-${targetId}_youtube_auto_v001.md`
    : `audio-compare-chunks-${targetId}_youtube_auto_v001.md`;
  return path.join(evalRoot, 'reports', fileName);
}

async function readVisualStatus(targetId: string): Promise<{ path?: string; status?: string }> {
  const dir = path.join(evalRoot, 'outputs', targetId, 'visual_verification');
  if (!existsSync(dir)) {
    return {};
  }
  const names = (await readdir(dir)).filter((name) => name.endsWith('.json')).sort();
  const latest = names.at(-1);
  if (!latest) {
    return {};
  }
  const filePath = path.join(dir, latest);
  const payload = await readJson<unknown>(filePath).catch(() => undefined);
  const status = recordFrom(recordFrom(payload).response).status;
  return {
    path: relativeWorkspacePath(filePath),
    ...(typeof status === 'string' ? { status } : {})
  };
}

function chunkWindowsFromAudioCompare(payload: unknown): ChunkWindow[] {
  const comparisons = recordFrom(payload).comparisons;
  if (!Array.isArray(comparisons)) {
    return [];
  }
  const windows = comparisons.flatMap((item): Omit<ChunkWindow, 'relationToPrevious' | 'sourceGapFromPreviousMs'>[] => {
    const comparison = recordFrom(item);
    const audio = recordFrom(comparison.audio);
    const query = recordFrom(audio.query);
    const bestSourceWindow = recordFrom(audio.bestSourceWindow);
    const envelope = recordFrom(audio.envelope);
    const textMatch = recordFrom(comparison.textMatch);
    const chunkIndex = comparison.chunkIndex;
    const clipStartMs = query.startMs;
    const clipEndMs = query.endMs;
    const sourceStartMs = bestSourceWindow.sourceStartMs;
    const sourceEndMs = bestSourceWindow.sourceEndMs;
    if (
      typeof chunkIndex !== 'number' ||
      typeof clipStartMs !== 'number' ||
      typeof clipEndMs !== 'number' ||
      typeof sourceStartMs !== 'number' ||
      typeof sourceEndMs !== 'number'
    ) {
      return [];
    }
    return [{
      chunkIndex,
      clipStartMs,
      clipEndMs,
      sourceStartMs,
      sourceEndMs,
      ...(typeof textMatch.clipCoverage === 'number' ? { textCoverage: textMatch.clipCoverage } : {}),
      ...(typeof envelope.maxCorrelation === 'number' ? { envelopeCorrelation: envelope.maxCorrelation } : {})
    }];
  }).sort((left, right) => left.chunkIndex - right.chunkIndex);

  return windows.map((window, index) => {
    if (index === 0) {
      return { ...window, relationToPrevious: 'first' };
    }
    const previous = windows[index - 1];
    const gap = window.sourceStartMs - previous.sourceEndMs;
    return {
      ...window,
      sourceGapFromPreviousMs: gap,
      relationToPrevious: gap > 0 ? 'gap' : gap === 0 ? 'touching' : 'overlap'
    };
  });
}

function targetRole(input: {
  expectedFixtureIds: string[];
  alignmentResultPath?: string;
  audioChunkWindows: ChunkWindow[];
  hasPositiveSourceGaps: boolean;
}): Pick<TargetReadiness, 'role' | 'nextAction'> {
  if (input.expectedFixtureIds.length > 0) {
    return {
      role: 'already_has_expected',
      nextAction: 'すでにexpected付きfixtureがあるため、そのfixture側のreadinessを優先します。'
    };
  }
  if (!input.alignmentResultPath) {
    return {
      role: 'missing_alignment',
      nextAction: 'チャンク照合結果がないため、30秒チャンク照合からやり直します。'
    };
  }
  if (input.audioChunkWindows.length > 1 && input.hasPositiveSourceGaps) {
    return {
      role: 'candidate_requires_multicut_or_different_clip',
      nextAction: '切り抜き連続チャンクが元動画側の離れた範囲に対応しているため、単一区間fixtureとして凍結せず、複数区間expected対応か別の短尺連続候補を選びます。'
    };
  }
  return {
    role: 'candidate_needs_verification',
    nextAction: 'expected化前に、候補秒数の目視またはWeb Gemini確認を行います。'
  };
}

async function inspectTarget(targetPath: string, fixtures: FixtureReadiness[]): Promise<TargetReadiness> {
  const target = await readJson<SttTargetFile>(targetPath);
  const alignmentPath = target.alignment?.resultPath
    ? resolveWorkspacePath(target.alignment.resultPath)
    : outputPathFromTarget(target.targetId, 'alignment');
  const audioComparePath = target.alignment?.audioCompareResultPath
    ? resolveWorkspacePath(target.alignment.audioCompareResultPath)
    : outputPathFromTarget(target.targetId, 'audioCompare');
  const alignmentReportPath = target.alignment?.reportPath
    ? resolveWorkspacePath(target.alignment.reportPath)
    : reportPathFromTarget(target.targetId, 'alignment');
  const audioCompareReportPath = target.alignment?.audioCompareReportPath
    ? resolveWorkspacePath(target.alignment.audioCompareReportPath)
    : reportPathFromTarget(target.targetId, 'audioCompare');
  const audioCompare = existsSync(audioComparePath) ? await readJson<unknown>(audioComparePath) : undefined;
  const audioChunkWindows = audioCompare ? chunkWindowsFromAudioCompare(audioCompare) : [];
  const expectedFixtureIds = fixtures
    .filter((fixture) => fixture.clipId === target.targetId)
    .map((fixture) => fixture.fixtureId);
  const hasPositiveSourceGaps = audioChunkWindows.some((window) => window.relationToPrevious === 'gap');
  const visual = await readVisualStatus(target.targetId);
  const role = targetRole({
    expectedFixtureIds,
    alignmentResultPath: existsSync(alignmentPath) ? alignmentPath : undefined,
    audioChunkWindows,
    hasPositiveSourceGaps
  });
  return {
    targetId: target.targetId,
    ...(target.title ? { title: target.title } : {}),
    targetPath: relativeWorkspacePath(targetPath),
    expectedFixtureIds,
    ...(existsSync(alignmentPath) ? { alignmentResultPath: relativeWorkspacePath(alignmentPath) } : {}),
    ...(existsSync(alignmentReportPath) ? { alignmentReportPath: relativeWorkspacePath(alignmentReportPath) } : {}),
    ...(existsSync(audioComparePath) ? { audioCompareResultPath: relativeWorkspacePath(audioComparePath) } : {}),
    ...(existsSync(audioCompareReportPath) ? { audioCompareReportPath: relativeWorkspacePath(audioCompareReportPath) } : {}),
    ...(visual.path ? { visualVerificationPath: visual.path } : {}),
    ...(visual.status ? { visualVerificationStatus: visual.status } : {}),
    audioChunkWindows,
    hasPositiveSourceGaps,
    ...role
  };
}

function boundarySummary(boundaries: BoundarySupport[]): string {
  if (boundaries.length === 0) {
    return 'expectedなし';
  }
  return boundaries.map((boundary) => `${boundary.side}:${boundary.relation}`).join(', ');
}

function chunkSummary(windows: ChunkWindow[]): string {
  if (windows.length === 0) {
    return 'なし';
  }
  return windows.map((window) => {
    const gap = window.sourceGapFromPreviousMs === undefined ? '' : ` / 前から${window.sourceGapFromPreviousMs}ms`;
    return `chunk${window.chunkIndex + 1} ${window.sourceStartMs}-${window.sourceEndMs}ms${gap}`;
  }).join('<br>');
}

function buildSummary(report: Pick<ReadinessReport, 'fixtures' | 'targets'>): string[] {
  const boundaryCandidates = report.fixtures.filter((fixture) => fixture.role === 'boundary_transition_candidate');
  const controls = report.fixtures.filter((fixture) => fixture.role === 'control_fixture');
  const legacy = report.fixtures.filter((fixture) => fixture.role === 'legacy_or_unverified_fixture');
  const multicutTargets = report.targets.filter((target) => target.role === 'candidate_requires_multicut_or_different_clip');
  return [
    `境界遷移を検証できるfixtureは ${boundaryCandidates.length} 件。`,
    `回帰確認用の境界一致fixtureは ${controls.length} 件。`,
    `composition評価用として未検証のfixtureは ${legacy.length} 件。`,
    `単一区間fixtureとして保留すべき候補は ${multicutTargets.length} 件。`
  ];
}

function buildReport(report: ReadinessReport, outputPath: string): string {
  const lines = [
    '# fixture拡張readiness',
    '',
    `- 結果JSON: ${relativeEvalPath(outputPath)}`,
    '',
    '## まとめ',
    '',
    ...report.summary.map((line) => `- ${line}`),
    '',
    '## expected付きfixture',
    '',
    '| fixture | 役割 | composition評価 | 境界 | 境界候補payload | 次の処理 |',
    '| --- | --- | --- | --- | ---: | --- |'
  ];

  for (const fixture of report.fixtures) {
    lines.push(
      `| ${fixture.fixtureId} | ${fixture.role} | ${fixture.usableForCompositionPromptEval === undefined ? '未指定' : fixture.usableForCompositionPromptEval ? 'yes' : 'no'} | ${boundarySummary(fixture.boundarySupport)} | ${fixture.boundarySignalPayloads.length} | ${fixture.nextAction} |`
    );
  }

  lines.push('');
  lines.push('## STT target候補');
  lines.push('');
  lines.push('| target | 役割 | expected fixture | 視覚確認 | 音声チャンク対応 | 次の処理 |');
  lines.push('| --- | --- | --- | --- | --- | --- |');
  for (const target of report.targets) {
    lines.push(
      `| ${target.targetId} | ${target.role} | ${target.expectedFixtureIds.join(', ') || 'なし'} | ${target.visualVerificationStatus ?? '未確認'} | ${chunkSummary(target.audioChunkWindows)} | ${target.nextAction} |`
    );
  }

  lines.push('');
  lines.push('## 読み取り');
  lines.push('');
  lines.push('- v010相当の境界遷移promptを試す前に、境界遷移候補が有効かを2件目で確認する必要がある。');
  lines.push('- `r_ztjHaHmcg` は切り抜きチャンクが元動画側の離れた範囲に対応しているため、単一区間expectedへ押し込まない。');
  lines.push('- 現時点では `UpRyakf5j80_clip_audio_v001` が境界遷移検証、`IMQYaT_RWRA_context_v001` が回帰確認の役割。2件目の境界遷移fixtureは追加候補探しが必要。');
  lines.push('');
  return lines.join('\n');
}

async function main(): Promise<void> {
  const options = parseOptions(process.argv.slice(2));
  const fixtureIds = options.fixtureIds ?? await defaultFixtureIds();
  const fixtures = await Promise.all(fixtureIds.map((fixtureId) => inspectFixture(fixtureId)));
  const targetPaths = options.targetPaths ?? await defaultTargetPaths();
  const targets = await Promise.all(targetPaths.map((targetPath) => inspectTarget(targetPath, fixtures)));
  const partial = { fixtures, targets };
  const report: ReadinessReport = {
    kind: 'clip_composition_fixture_expansion_readiness',
    runAt: new Date().toISOString(),
    ...partial,
    summary: buildSummary(partial)
  };

  const outputDir = path.join(evalRoot, 'outputs');
  const reportDir = path.join(evalRoot, 'reports');
  await mkdir(outputDir, { recursive: true });
  await mkdir(reportDir, { recursive: true });
  const outputPath = path.join(outputDir, `fixture-expansion-readiness-${options.outputId}.json`);
  const reportPath = path.join(reportDir, `fixture-expansion-readiness-${options.outputId}.md`);
  await writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  await writeFile(reportPath, buildReport(report, outputPath), 'utf8');
  console.log(`json: ${relativeWorkspacePath(outputPath)}`);
  console.log(`report: ${relativeWorkspacePath(reportPath)}`);
  for (const line of report.summary) {
    console.log(line);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
