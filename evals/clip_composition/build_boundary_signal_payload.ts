import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

type CliOptions = {
  fixtureId: string;
  outputId: string;
  wordTimestampsPath?: string;
};

type FixtureFile = {
  fixtureId: string;
  draftId: string;
  transcriptPath: string;
  themesPath: string;
  selectedThemeId: string;
  copiedFrom?: unknown;
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

type ThemeFile = {
  themes?: Array<{
    id: string;
    relatedSpeechIds?: number[];
  }>;
};

type WordTimestamp = {
  text: string;
  startMs: number;
  endMs: number;
  speaker?: string;
  segmentId?: number;
};

type WordTimestampFile = {
  words?: unknown[];
};

type ExpectedFile = {
  expectedCuts?: Array<{
    sourceStartMs?: number;
    sourceEndMs?: number;
  }>;
};

type BoundarySignalUnit = {
  signalId: string;
  sourceStartMs: number;
  sourceEndMs: number;
  text: string;
  speaker?: string;
  sourceSegmentId?: number;
  matchesFixtureSpeechId?: number;
};

type BoundaryTransition = {
  transitionId: string;
  previousSignalId: string;
  nextSignalId: string;
  previousEndMs: number;
  nextStartMs: number;
  relation: 'overlap' | 'gap' | 'touching';
  overlapMs?: number;
  gapMs?: number;
};

type BoundarySignalPayload = {
  kind: 'clip_composition_boundary_signal_payload';
  runAt: string;
  fixtureId: string;
  draftId: string;
  boundarySignalInput: {
    source: 'fixture_source_word_timestamps';
    note: string;
    selectedThemeId: string;
    candidateRange: {
      sourceStartMs: number;
      sourceEndMs: number;
      basis: string;
    };
    wordTimestampsPath: string;
    units: BoundarySignalUnit[];
    transitions: BoundaryTransition[];
    outputContractHint: {
      usage: string;
      forbiddenUse: string;
    };
  };
  evaluationOnly: {
    expectedPath: string;
    expectedBoundaryValuesFoundInBoundarySignalInput: Array<{
      side: 'start' | 'end';
      valueMs: number;
      paths: string[];
    }>;
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

  return {
    fixtureId: sanitizePathPart(fixtureId),
    outputId: sanitizePathPart(values.get('outputId')?.trim() || timestampForFile()),
    wordTimestampsPath: values.get('wordTimestamps')?.trim()
      ? resolveWorkspacePath(values.get('wordTimestamps')!.trim())
      : undefined
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

function normalizeWords(wordFile: WordTimestampFile): WordTimestamp[] {
  return (wordFile.words ?? []).flatMap((item) => {
    const record = recordFrom(item);
    const text = typeof record.text === 'string' ? record.text.trim() : '';
    const startMs = record.startMs;
    const endMs = record.endMs;
    if (!text || typeof startMs !== 'number' || typeof endMs !== 'number') {
      return [];
    }
    return [{
      text,
      startMs,
      endMs,
      ...(typeof record.speaker === 'string' ? { speaker: record.speaker } : {}),
      ...(typeof record.segmentId === 'number' ? { segmentId: record.segmentId } : {})
    }];
  }).sort((left, right) => left.startMs - right.startMs || left.endMs - right.endMs);
}

function selectedTheme(themeFile: ThemeFile, selectedThemeId: string) {
  const theme = (themeFile.themes ?? []).find((item) => item.id === selectedThemeId);
  if (!theme) {
    throw new Error(`選択済みテーマが見つかりません: ${selectedThemeId}`);
  }
  return theme;
}

function candidateSegments(segments: TranscriptSegment[], speechIds: number[]): TranscriptSegment[] {
  const idSet = new Set(speechIds);
  const selected = segments.filter((segment) => idSet.has(segment.id));
  if (selected.length === 0) {
    throw new Error('選択済みテーマに対応する発話が見つかりません');
  }
  return selected;
}

function candidateRange(segments: TranscriptSegment[]) {
  return {
    sourceStartMs: Math.min(...segments.map((segment) => segment.startMs)),
    sourceEndMs: Math.max(...segments.map((segment) => segment.endMs))
  };
}

function overlapsRange(item: Pick<WordTimestamp, 'startMs' | 'endMs'>, range: { sourceStartMs: number; sourceEndMs: number }): boolean {
  return item.startMs <= range.sourceEndMs && item.endMs >= range.sourceStartMs;
}

function matchingFixtureSpeechId(word: WordTimestamp, segments: TranscriptSegment[]): number | undefined {
  return segments.find((segment) => (
    segment.startMs === word.startMs &&
    segment.endMs === word.endMs &&
    segment.text === word.text
  ))?.id;
}

function buildUnits(words: WordTimestamp[], segments: TranscriptSegment[], range: { sourceStartMs: number; sourceEndMs: number }): BoundarySignalUnit[] {
  return words.filter((word) => overlapsRange(word, range)).map((word, index) => ({
    signalId: `signal_${String(index + 1).padStart(3, '0')}`,
    sourceStartMs: word.startMs,
    sourceEndMs: word.endMs,
    text: word.text,
    ...(word.speaker ? { speaker: word.speaker } : {}),
    ...(typeof word.segmentId === 'number' ? { sourceSegmentId: word.segmentId } : {}),
    ...(matchingFixtureSpeechId(word, segments) ? { matchesFixtureSpeechId: matchingFixtureSpeechId(word, segments) } : {})
  }));
}

function relationFor(previousEndMs: number, nextStartMs: number): BoundaryTransition['relation'] {
  if (nextStartMs < previousEndMs) {
    return 'overlap';
  }
  if (nextStartMs > previousEndMs) {
    return 'gap';
  }
  return 'touching';
}

function buildTransitions(units: BoundarySignalUnit[]): BoundaryTransition[] {
  const transitions: BoundaryTransition[] = [];
  for (let index = 0; index < units.length - 1; index += 1) {
    const previous = units[index]!;
    const next = units[index + 1]!;
    const relation = relationFor(previous.sourceEndMs, next.sourceStartMs);
    transitions.push({
      transitionId: `transition_${String(index + 1).padStart(3, '0')}`,
      previousSignalId: previous.signalId,
      nextSignalId: next.signalId,
      previousEndMs: previous.sourceEndMs,
      nextStartMs: next.sourceStartMs,
      relation,
      ...(relation === 'overlap' ? { overlapMs: previous.sourceEndMs - next.sourceStartMs } : {}),
      ...(relation === 'gap' ? { gapMs: next.sourceStartMs - previous.sourceEndMs } : {})
    });
  }
  return transitions;
}

function copiedWordTimestampPath(fixture: FixtureFile): string | undefined {
  const copiedFrom = Array.isArray(fixture.copiedFrom) ? fixture.copiedFrom : [];
  const candidate = copiedFrom.find((item): item is string => typeof item === 'string' && item.endsWith('/word-timestamps.json'));
  return candidate ? path.join(evalRoot, candidate) : undefined;
}

function collectNumberPaths(value: unknown, target: number): string[] {
  const paths: string[] = [];

  function visit(current: unknown, pathParts: Array<string | number>): void {
    if (typeof current === 'number') {
      if (current === target) {
        paths.push(pathToString(pathParts));
      }
      return;
    }
    if (Array.isArray(current)) {
      current.forEach((item, index) => visit(item, [...pathParts, index]));
      return;
    }
    const record = recordFrom(current);
    for (const [key, child] of Object.entries(record)) {
      visit(child, [...pathParts, key]);
    }
  }

  visit(value, ['boundarySignalInput']);
  return paths;
}

function pathToString(parts: Array<string | number>): string {
  return parts.reduce((text, part) => (
    typeof part === 'number' ? `${text}[${part}]` : text ? `${text}.${part}` : part
  ), '');
}

async function expectedLeakCheck(input: {
  expectedPath: string;
  boundarySignalInput: BoundarySignalPayload['boundarySignalInput'];
}): Promise<BoundarySignalPayload['evaluationOnly']['expectedBoundaryValuesFoundInBoundarySignalInput']> {
  if (!existsSync(input.expectedPath)) {
    return [];
  }
  const expected = await readJson<ExpectedFile>(input.expectedPath);
  const cut = expected.expectedCuts?.[0];
  if (!cut) {
    return [];
  }
  return ([
    { side: 'start' as const, valueMs: cut.sourceStartMs },
    { side: 'end' as const, valueMs: cut.sourceEndMs }
  ]).flatMap((item) => {
    if (typeof item.valueMs !== 'number') {
      return [];
    }
    const paths = collectNumberPaths(input.boundarySignalInput, item.valueMs);
    return paths.length > 0 ? [{ side: item.side, valueMs: item.valueMs, paths }] : [];
  });
}

async function buildPayload(options: CliOptions): Promise<BoundarySignalPayload> {
  const fixtureDir = path.join(evalRoot, 'fixtures', options.fixtureId);
  const fixture = await readJson<FixtureFile>(path.join(fixtureDir, 'fixture.json'));
  const transcript = await readJson<TranscriptFile>(path.join(fixtureDir, fixture.transcriptPath));
  const themes = await readJson<ThemeFile>(path.join(fixtureDir, fixture.themesPath));
  const theme = selectedTheme(themes, fixture.selectedThemeId);
  const segments = normalizeSegments(transcript);
  const candidate = candidateSegments(segments, theme.relatedSpeechIds ?? []);
  const range = candidateRange(candidate);
  const wordPath = options.wordTimestampsPath ?? copiedWordTimestampPath(fixture);
  if (!wordPath) {
    throw new Error('単語時刻ファイルをfixture.copiedFromから特定できません。--wordTimestamps を指定してください');
  }
  const words = normalizeWords(await readJson<WordTimestampFile>(wordPath));
  const units = buildUnits(words, segments, range);
  const boundarySignalInput: BoundarySignalPayload['boundarySignalInput'] = {
    source: 'fixture_source_word_timestamps',
    note: 'selectedThemeの候補発話範囲と重なる字幕時刻だけを抽出した境界候補。expectedCuts、音声比較で確定した正解時刻、Web版Gemini確認結果は含めない。',
    selectedThemeId: fixture.selectedThemeId,
    candidateRange: {
      ...range,
      basis: 'selectedTheme.relatedSpeechIds に対応するfixture文字起こし発話の最小開始時刻と最大終了時刻'
    },
    wordTimestampsPath: relativeWorkspacePath(wordPath),
    units,
    transitions: buildTransitions(units),
    outputContractHint: {
      usage: 'composition prompt can inspect these observed caption boundaries when choosing a cut within the fixed theme range',
      forbiddenUse: 'do not treat these signals as expectedCuts or verified ground truth'
    }
  };
  const expectedPath = path.join(evalRoot, 'expected', `${fixture.fixtureId}.json`);
  return {
    kind: 'clip_composition_boundary_signal_payload',
    runAt: new Date().toISOString(),
    fixtureId: fixture.fixtureId,
    draftId: fixture.draftId,
    boundarySignalInput,
    evaluationOnly: {
      expectedPath: relativeWorkspacePath(expectedPath),
      expectedBoundaryValuesFoundInBoundarySignalInput: await expectedLeakCheck({ expectedPath, boundarySignalInput })
    }
  };
}

function msText(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const milliseconds = ms % 1000;
  return `${minutes}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(3, '0')}`;
}

function buildReport(payload: BoundarySignalPayload, outputPath: string): string {
  const lines = [
    '# 境界候補payload',
    '',
    `- fixture: ${payload.fixtureId}`,
    `- 結果JSON: ${relativeWorkspacePath(outputPath)}`,
    `- 単語時刻: ${payload.boundarySignalInput.wordTimestampsPath}`,
    `- 候補範囲: ${payload.boundarySignalInput.candidateRange.sourceStartMs}ms - ${payload.boundarySignalInput.candidateRange.sourceEndMs}ms`,
    `- 境界候補単位: ${payload.boundarySignalInput.units.length}件`,
    `- 遷移: ${payload.boundarySignalInput.transitions.length}件`,
    '',
    '## 目的',
    '',
    'v009で発話途中の境界を扱えるように、expectedから独立した字幕時刻の境界候補を作る。',
    'このpayload本体は、selectedThemeの候補発話範囲と重なる字幕時刻だけを含み、expectedCutsや音声比較で確定した正解時刻は含めない。',
    '',
    '## 漏えい確認',
    '',
    payload.evaluationOnly.expectedBoundaryValuesFoundInBoundarySignalInput.length === 0
      ? '- expectedの開始・終了時刻と同じ数値はpayload本体に見つからない。'
      : '- expectedの開始・終了時刻と同じ数値がpayload本体に見つかったため、このままprompt入力に使わない。',
    ...payload.evaluationOnly.expectedBoundaryValuesFoundInBoundarySignalInput.map((hit) => (
      `- ${hit.side}: ${hit.valueMs}ms / ${hit.paths.join(', ')}`
    )),
    '',
    '## 遷移',
    ''
  ];

  for (const transition of payload.boundarySignalInput.transitions) {
    const previous = payload.boundarySignalInput.units.find((unit) => unit.signalId === transition.previousSignalId);
    const next = payload.boundarySignalInput.units.find((unit) => unit.signalId === transition.nextSignalId);
    lines.push(
      `- ${transition.transitionId}: ${transition.relation} / prevEnd ${transition.previousEndMs}ms (${msText(transition.previousEndMs)}) / nextStart ${transition.nextStartMs}ms (${msText(transition.nextStartMs)}) / ${previous?.text ?? 'unknown'} -> ${next?.text ?? 'unknown'}`
    );
  }

  return `${lines.join('\n')}\n`;
}

async function main() {
  const options = parseOptions(process.argv.slice(2));
  const payload = await buildPayload(options);
  const outputPath = path.join(evalRoot, 'outputs', `boundary-signal-payload-${options.outputId}.json`);
  const reportPath = path.join(evalRoot, 'reports', `boundary-signal-payload-${options.outputId}.md`);
  await mkdir(path.dirname(outputPath), { recursive: true });
  await mkdir(path.dirname(reportPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  await writeFile(reportPath, buildReport(payload, outputPath), 'utf8');
  console.log(`json: ${relativeWorkspacePath(outputPath)}`);
  console.log(`report: ${relativeWorkspacePath(reportPath)}`);
  console.log(`expected boundary leak hits: ${payload.evaluationOnly.expectedBoundaryValuesFoundInBoundarySignalInput.length}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
