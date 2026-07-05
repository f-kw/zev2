import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

type CliOptions = {
  resultPath: string;
  transcriptPath?: string;
  outputId: string;
};

type Cut = {
  sourceStartMs: number;
  sourceEndMs: number;
  reason?: string;
  usedSpeechIds?: number[];
  audioVerification?: AudioVerification;
};

type AudioVerification = {
  clipDurationMs?: number;
  sourceSliceStartMs?: number;
  sourceSliceEndMs?: number;
  sourceSliceBestOffsetMs?: number;
  sourceSliceBestEndMs?: number;
  bestAlignedSourceStartMs?: number;
  bestAlignedSourceEndMs?: number;
  envelopeCorrelation?: number;
  directCorrelationAtEnvelopeOffset?: number;
  reportPath?: string;
  resultPath?: string;
};

type ScoreResult = {
  fixtureId: string;
  draftId?: string;
  promptVersion: string;
  model: string;
  params: Record<string, unknown>;
  selectedCuts: Cut[];
  expectedCuts: Cut[];
  diff?: {
    startDeltaMs?: number;
    endDeltaMs?: number;
    overlapSummary?: string;
  };
  themeCoverage?: {
    candidateStartMs?: number;
    candidateEndMs?: number;
    coverageSummary?: string;
    themeSidePossibility?: string;
    compositionSidePossibility?: string;
  };
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

type BoundaryInspection = {
  boundaryMs: number;
  relation: 'segment_start' | 'segment_end' | 'inside_segment' | 'outside_transcript';
  segment?: TranscriptSegment;
  overlappingSegments?: TranscriptSegment[];
  offsetFromSegmentStartMs?: number;
  offsetToSegmentEndMs?: number;
};

type AudioBoundaryInspection = {
  kind: 'clip_composition_prompt_audio_boundary_inspection';
  runAt: string;
  fixtureId: string;
  promptVersion: string;
  model: string;
  params: Record<string, unknown>;
  resultPath: string;
  transcriptPath: string;
  audioEvidence: {
    audioConfirmedSourceStartMs: number;
    audioConfirmedSourceEndMs: number;
    audioConfirmedDurationMs: number;
    sourceSliceStartMs?: number;
    sourceSliceEndMs?: number;
    sourceSliceBestOffsetMs?: number;
    sourceSliceBestEndMs?: number;
    envelopeCorrelation?: number;
    directCorrelationAtEnvelopeOffset?: number;
    reportPath?: string;
    resultPath?: string;
  };
  selectedCut: {
    sourceStartMs: number;
    sourceEndMs: number;
    durationMs: number;
    reason?: string;
    usedSpeechIds?: number[];
  };
  expectedCut: {
    sourceStartMs: number;
    sourceEndMs: number;
    durationMs: number;
    reason?: string;
  };
  promptVsAudio: {
    selectedStartRelativeToAudioStartMs: number;
    selectedEndRelativeToAudioStartMs: number;
    selectedStartsBeforeAudioMs: number;
    selectedStartsAfterAudioMs: number;
    selectedEndsBeforeAudioMs: number;
    selectedEndsAfterAudioMs: number;
    selectedDurationMinusAudioDurationMs: number;
    interpretation: string;
  };
  transcriptBoundaries: {
    selectedStart: BoundaryInspection;
    selectedEnd: BoundaryInspection;
    expectedStart: BoundaryInspection;
    expectedEnd: BoundaryInspection;
  };
  usedSpeechCheck: {
    selectedStartContainingSpeechId?: number;
    selectedEndContainingSpeechId?: number;
    usedSpeechIds?: number[];
    selectedStartSpeechListed?: boolean;
    selectedEndSpeechListed?: boolean;
  };
  themeCoverage?: ScoreResult['themeCoverage'];
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

  const resultPath = values.get('result')?.trim();
  if (!resultPath) {
    throw new Error('--result に採点済み result.json を指定してください');
  }

  return {
    resultPath: resolveWorkspacePath(resultPath),
    transcriptPath: values.get('transcript')?.trim() ? resolveWorkspacePath(values.get('transcript')!.trim()) : undefined,
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

async function readJson<T>(filePath: string): Promise<T> {
  return JSON.parse(await readFile(filePath, 'utf8')) as T;
}

function recordFrom(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function numberFrom(value: unknown, label: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error(`${label} は数値である必要があります`);
  }
  return value;
}

function stringFrom(value: unknown, label: string): string {
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`${label} は空でない文字列である必要があります`);
  }
  return value;
}

function normalizeCut(value: unknown, label: string): Cut {
  const record = recordFrom(value);
  return {
    sourceStartMs: numberFrom(record.sourceStartMs, `${label}.sourceStartMs`),
    sourceEndMs: numberFrom(record.sourceEndMs, `${label}.sourceEndMs`),
    ...(typeof record.reason === 'string' ? { reason: record.reason } : {}),
    ...(Array.isArray(record.usedSpeechIds)
      ? { usedSpeechIds: record.usedSpeechIds.filter((item): item is number => typeof item === 'number') }
      : {}),
    ...(recordFrom(record.audioVerification) ? { audioVerification: recordFrom(record.audioVerification) as AudioVerification } : {})
  };
}

function normalizeScoreResult(value: unknown, resultPath: string): ScoreResult {
  const record = recordFrom(value);
  const selectedCuts = Array.isArray(record.selectedCuts) ? record.selectedCuts : [];
  const expectedCuts = Array.isArray(record.expectedCuts) ? record.expectedCuts : [];
  return {
    fixtureId: stringFrom(record.fixtureId, `${resultPath}.fixtureId`),
    ...(typeof record.draftId === 'string' ? { draftId: record.draftId } : {}),
    promptVersion: stringFrom(record.promptVersion, `${resultPath}.promptVersion`),
    model: stringFrom(record.model, `${resultPath}.model`),
    params: recordFrom(record.params),
    selectedCuts: selectedCuts.map((item, index) => normalizeCut(item, `${resultPath}.selectedCuts[${index}]`)),
    expectedCuts: expectedCuts.map((item, index) => normalizeCut(item, `${resultPath}.expectedCuts[${index}]`)),
    diff: recordFrom(record.diff) as ScoreResult['diff'],
    themeCoverage: recordFrom(record.themeCoverage) as ScoreResult['themeCoverage']
  };
}

function normalizeSegments(file: TranscriptFile): TranscriptSegment[] {
  return (file.segments ?? []).flatMap((item, index) => {
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

function inspectBoundary(segments: TranscriptSegment[], boundaryMs: number): BoundaryInspection {
  const overlappingSegments = segments.filter((segment) => boundaryMs >= segment.startMs && boundaryMs <= segment.endMs);
  const exactStart = segments.find((segment) => segment.startMs === boundaryMs);
  if (exactStart) {
    return {
      boundaryMs,
      relation: 'segment_start',
      segment: exactStart,
      ...(overlappingSegments.length > 0 ? { overlappingSegments } : {}),
      offsetFromSegmentStartMs: 0,
      offsetToSegmentEndMs: exactStart.endMs - boundaryMs
    };
  }
  const exactEnd = segments.find((segment) => segment.endMs === boundaryMs);
  if (exactEnd) {
    return {
      boundaryMs,
      relation: 'segment_end',
      segment: exactEnd,
      ...(overlappingSegments.length > 0 ? { overlappingSegments } : {}),
      offsetFromSegmentStartMs: boundaryMs - exactEnd.startMs,
      offsetToSegmentEndMs: 0
    };
  }
  const containing = segments.find((segment) => boundaryMs > segment.startMs && boundaryMs < segment.endMs);
  if (containing) {
    return {
      boundaryMs,
      relation: 'inside_segment',
      segment: containing,
      ...(overlappingSegments.length > 0 ? { overlappingSegments } : {}),
      offsetFromSegmentStartMs: boundaryMs - containing.startMs,
      offsetToSegmentEndMs: containing.endMs - boundaryMs
    };
  }
  return { boundaryMs, relation: 'outside_transcript' };
}

function duration(cut: Pick<Cut, 'sourceStartMs' | 'sourceEndMs'>): number {
  return cut.sourceEndMs - cut.sourceStartMs;
}

function audioStart(expected: Cut): number {
  return expected.audioVerification?.bestAlignedSourceStartMs ?? expected.sourceStartMs;
}

function audioEnd(expected: Cut): number {
  return expected.audioVerification?.bestAlignedSourceEndMs ?? expected.sourceEndMs;
}

function buildInterpretation(input: {
  selectedStartsBeforeAudioMs: number;
  selectedStartsAfterAudioMs: number;
  selectedEndsBeforeAudioMs: number;
  selectedEndsAfterAudioMs: number;
}): string {
  const parts: string[] = [];
  if (input.selectedStartsBeforeAudioMs > 0) {
    parts.push(`選択開始は音声一致で確認した切り抜き開始より${input.selectedStartsBeforeAudioMs}ms前です。`);
  }
  if (input.selectedStartsAfterAudioMs > 0) {
    parts.push(`選択開始は音声一致で確認した切り抜き開始より${input.selectedStartsAfterAudioMs}ms後です。`);
  }
  if (input.selectedEndsBeforeAudioMs > 0) {
    parts.push(`選択終了は音声一致で確認した切り抜き終了より${input.selectedEndsBeforeAudioMs}ms前です。`);
  }
  if (input.selectedEndsAfterAudioMs > 0) {
    parts.push(`選択終了は音声一致で確認した切り抜き終了より${input.selectedEndsAfterAudioMs}ms後です。`);
  }
  return parts.length > 0 ? parts.join(' ') : '選択区間は音声一致で確認した切り抜き全体の範囲と一致しています。';
}

function msText(ms: number): string {
  const sign = ms < 0 ? '-' : '';
  const absMs = Math.abs(ms);
  const totalSeconds = Math.floor(absMs / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const milliseconds = absMs % 1000;
  const body = hours > 0
    ? `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(3, '0')}`
    : `${minutes}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(3, '0')}`;
  return `${sign}${body}`;
}

function boundaryLine(label: string, inspection: BoundaryInspection): string {
  if (!inspection.segment) {
    return `- ${label}: ${inspection.boundaryMs}ms / 文字起こし区間外`;
  }
  const offsets = inspection.relation === 'inside_segment'
    ? ` / 発話開始から${inspection.offsetFromSegmentStartMs}ms、発話終了まで${inspection.offsetToSegmentEndMs}ms`
    : '';
  const overlaps = inspection.overlappingSegments && inspection.overlappingSegments.length > 1
    ? ` / 同時に重なる発話: ${inspection.overlappingSegments.map((segment) => segment.id).join(', ')}`
    : '';
  return `- ${label}: ${inspection.boundaryMs}ms / 発話${inspection.segment.id} / ${inspection.relation}${offsets}${overlaps} / ${inspection.segment.text}`;
}

function buildInspection(input: {
  resultPath: string;
  transcriptPath: string;
  result: ScoreResult;
  segments: TranscriptSegment[];
}): AudioBoundaryInspection {
  const selected = input.result.selectedCuts[0];
  const expected = input.result.expectedCuts[0];
  if (!selected) {
    throw new Error(`${input.resultPath} に選択区間がありません`);
  }
  if (!expected) {
    throw new Error(`${input.resultPath} に期待区間がありません`);
  }

  const audioConfirmedSourceStartMs = audioStart(expected);
  const audioConfirmedSourceEndMs = audioEnd(expected);
  const selectedStartsBeforeAudioMs = Math.max(0, audioConfirmedSourceStartMs - selected.sourceStartMs);
  const selectedStartsAfterAudioMs = Math.max(0, selected.sourceStartMs - audioConfirmedSourceStartMs);
  const selectedEndsBeforeAudioMs = Math.max(0, audioConfirmedSourceEndMs - selected.sourceEndMs);
  const selectedEndsAfterAudioMs = Math.max(0, selected.sourceEndMs - audioConfirmedSourceEndMs);
  const selectedStart = inspectBoundary(input.segments, selected.sourceStartMs);
  const selectedEnd = inspectBoundary(input.segments, selected.sourceEndMs);

  return {
    kind: 'clip_composition_prompt_audio_boundary_inspection',
    runAt: new Date().toISOString(),
    fixtureId: input.result.fixtureId,
    promptVersion: input.result.promptVersion,
    model: input.result.model,
    params: input.result.params,
    resultPath: relativeWorkspacePath(input.resultPath),
    transcriptPath: relativeWorkspacePath(input.transcriptPath),
    audioEvidence: {
      audioConfirmedSourceStartMs,
      audioConfirmedSourceEndMs,
      audioConfirmedDurationMs: audioConfirmedSourceEndMs - audioConfirmedSourceStartMs,
      ...(typeof expected.audioVerification?.sourceSliceStartMs === 'number' ? { sourceSliceStartMs: expected.audioVerification.sourceSliceStartMs } : {}),
      ...(typeof expected.audioVerification?.sourceSliceEndMs === 'number' ? { sourceSliceEndMs: expected.audioVerification.sourceSliceEndMs } : {}),
      ...(typeof expected.audioVerification?.sourceSliceBestOffsetMs === 'number' ? { sourceSliceBestOffsetMs: expected.audioVerification.sourceSliceBestOffsetMs } : {}),
      ...(typeof expected.audioVerification?.sourceSliceBestEndMs === 'number' ? { sourceSliceBestEndMs: expected.audioVerification.sourceSliceBestEndMs } : {}),
      ...(typeof expected.audioVerification?.envelopeCorrelation === 'number' ? { envelopeCorrelation: expected.audioVerification.envelopeCorrelation } : {}),
      ...(typeof expected.audioVerification?.directCorrelationAtEnvelopeOffset === 'number' ? { directCorrelationAtEnvelopeOffset: expected.audioVerification.directCorrelationAtEnvelopeOffset } : {}),
      ...(expected.audioVerification?.reportPath ? { reportPath: expected.audioVerification.reportPath } : {}),
      ...(expected.audioVerification?.resultPath ? { resultPath: expected.audioVerification.resultPath } : {})
    },
    selectedCut: {
      sourceStartMs: selected.sourceStartMs,
      sourceEndMs: selected.sourceEndMs,
      durationMs: duration(selected),
      ...(selected.reason ? { reason: selected.reason } : {}),
      ...(selected.usedSpeechIds ? { usedSpeechIds: selected.usedSpeechIds } : {})
    },
    expectedCut: {
      sourceStartMs: expected.sourceStartMs,
      sourceEndMs: expected.sourceEndMs,
      durationMs: duration(expected),
      ...(expected.reason ? { reason: expected.reason } : {})
    },
    promptVsAudio: {
      selectedStartRelativeToAudioStartMs: selected.sourceStartMs - audioConfirmedSourceStartMs,
      selectedEndRelativeToAudioStartMs: selected.sourceEndMs - audioConfirmedSourceStartMs,
      selectedStartsBeforeAudioMs,
      selectedStartsAfterAudioMs,
      selectedEndsBeforeAudioMs,
      selectedEndsAfterAudioMs,
      selectedDurationMinusAudioDurationMs: duration(selected) - (audioConfirmedSourceEndMs - audioConfirmedSourceStartMs),
      interpretation: buildInterpretation({
        selectedStartsBeforeAudioMs,
        selectedStartsAfterAudioMs,
        selectedEndsBeforeAudioMs,
        selectedEndsAfterAudioMs
      })
    },
    transcriptBoundaries: {
      selectedStart,
      selectedEnd,
      expectedStart: inspectBoundary(input.segments, expected.sourceStartMs),
      expectedEnd: inspectBoundary(input.segments, expected.sourceEndMs)
    },
    usedSpeechCheck: {
      ...(selectedStart.segment ? { selectedStartContainingSpeechId: selectedStart.segment.id } : {}),
      ...(selectedEnd.segment ? { selectedEndContainingSpeechId: selectedEnd.segment.id } : {}),
      ...(selected.usedSpeechIds ? { usedSpeechIds: selected.usedSpeechIds } : {}),
      ...(selected.usedSpeechIds && selectedStart.segment ? { selectedStartSpeechListed: selected.usedSpeechIds.includes(selectedStart.segment.id) } : {}),
      ...(selected.usedSpeechIds && selectedEnd.segment ? { selectedEndSpeechListed: selected.usedSpeechIds.includes(selectedEnd.segment.id) } : {})
    },
    themeCoverage: input.result.themeCoverage
  };
}

function buildReport(inspection: AudioBoundaryInspection, outputPath: string): string {
  const lines = [
    '# prompt選択区間と音声一致区間の境界確認',
    '',
    `- fixture: ${inspection.fixtureId}`,
    `- prompt版数: ${inspection.promptVersion}`,
    `- モデル: ${inspection.model}`,
    `- パラメータ: ${JSON.stringify(inspection.params)}`,
    `- 採点結果: ${inspection.resultPath}`,
    `- 文字起こし: ${inspection.transcriptPath}`,
    `- 結果JSON: ${relativeWorkspacePath(outputPath)}`,
    '',
    '## 音声比較で確認した切り抜き箇所',
    '',
    `- 元動画上の対応区間: ${inspection.audioEvidence.audioConfirmedSourceStartMs}ms - ${inspection.audioEvidence.audioConfirmedSourceEndMs}ms (${msText(inspection.audioEvidence.audioConfirmedDurationMs)})`,
    ...(typeof inspection.audioEvidence.sourceSliceStartMs === 'number' && typeof inspection.audioEvidence.sourceSliceBestOffsetMs === 'number'
      ? [`- 元動画スライス内の一致開始: ${inspection.audioEvidence.sourceSliceBestOffsetMs}ms`]
      : []),
    ...(typeof inspection.audioEvidence.envelopeCorrelation === 'number'
      ? [`- 音量包絡の相関: ${inspection.audioEvidence.envelopeCorrelation}`]
      : []),
    ...(typeof inspection.audioEvidence.directCorrelationAtEnvelopeOffset === 'number'
      ? [`- 生波形の直接相関: ${inspection.audioEvidence.directCorrelationAtEnvelopeOffset}`]
      : []),
    ...(inspection.audioEvidence.reportPath ? [`- 音声比較レポート: ${inspection.audioEvidence.reportPath}`] : []),
    '',
    `## ${inspection.promptVersion} が選んだ区間`,
    '',
    `- 選択区間: ${inspection.selectedCut.sourceStartMs}ms - ${inspection.selectedCut.sourceEndMs}ms (${msText(inspection.selectedCut.durationMs)})`,
    `- 期待区間: ${inspection.expectedCut.sourceStartMs}ms - ${inspection.expectedCut.sourceEndMs}ms (${msText(inspection.expectedCut.durationMs)})`,
    `- 音声一致区間との差: ${inspection.promptVsAudio.interpretation}`,
    `- 選択区間の長さ差: ${inspection.promptVsAudio.selectedDurationMinusAudioDurationMs}ms`,
    '',
    '## 文字起こし境界',
    '',
    boundaryLine('選択開始', inspection.transcriptBoundaries.selectedStart),
    boundaryLine('選択終了', inspection.transcriptBoundaries.selectedEnd),
    boundaryLine('期待開始', inspection.transcriptBoundaries.expectedStart),
    boundaryLine('期待終了', inspection.transcriptBoundaries.expectedEnd),
    '',
    '## usedSpeechIdsとの照合',
    '',
    `- 選択開始を含む発話が理由側の発話一覧に入っているか: ${inspection.usedSpeechCheck.selectedStartSpeechListed === undefined ? '不明' : inspection.usedSpeechCheck.selectedStartSpeechListed ? 'yes' : 'no'}`,
    `- 選択終了を含む発話が理由側の発話一覧に入っているか: ${inspection.usedSpeechCheck.selectedEndSpeechListed === undefined ? '不明' : inspection.usedSpeechCheck.selectedEndSpeechListed ? 'yes' : 'no'}`,
    '',
    '## 読み取り',
    '',
    '- 音声比較で確認した切り抜き全体は、expectedの区間としてすでに固定されている。',
    '- このpromptの選択はexpectedを包含しているが、音声一致区間より前後へ広い。',
    '- 次の改善対象はthemeではなくcomposition側の境界選択で、特に発話途中の終端を扱う入力粒度が足りていない。'
  ];

  return `${lines.join('\n')}\n`;
}

async function main() {
  const options = parseOptions(process.argv.slice(2));
  const result = normalizeScoreResult(await readJson<unknown>(options.resultPath), options.resultPath);
  const transcriptPath = options.transcriptPath ?? path.join(evalRoot, 'fixtures', result.fixtureId, 'transcript.json');
  const transcript = await readJson<TranscriptFile>(transcriptPath);
  const segments = normalizeSegments(transcript);
  const inspection = buildInspection({
    resultPath: options.resultPath,
    transcriptPath,
    result,
    segments
  });

  const outputPath = path.join(evalRoot, 'outputs', `prompt-audio-boundary-${options.outputId}.json`);
  const reportPath = path.join(evalRoot, 'reports', `prompt-audio-boundary-${options.outputId}.md`);
  await mkdir(path.dirname(outputPath), { recursive: true });
  await mkdir(path.dirname(reportPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(inspection, null, 2)}\n`, 'utf8');
  await writeFile(reportPath, buildReport(inspection, outputPath), 'utf8');

  console.log(`json: ${relativeWorkspacePath(outputPath)}`);
  console.log(`report: ${relativeWorkspacePath(reportPath)}`);
  console.log(inspection.promptVsAudio.interpretation);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
