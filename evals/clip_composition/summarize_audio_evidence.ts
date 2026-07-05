import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

type CliOptions = {
  scoreResultPath: string;
  outputId: string;
};

type Cut = {
  sourceStartMs: number;
  sourceEndMs: number;
  reason?: string;
  [key: string]: unknown;
};

type ScoreResult = {
  runAt: string;
  fixtureId: string;
  draftId?: string;
  promptVersion: string;
  model: string;
  params: Record<string, unknown>;
  selectedCuts: Cut[];
  expectedCuts: Cut[];
  themeCoverage?: {
    themeSidePossibility?: string;
    compositionSidePossibility?: string;
    coverageSummary?: string;
  };
};

type AudioVerification = {
  status?: string;
  method?: string;
  resultPath?: string;
  reportPath?: string;
  clipDurationMs?: number;
  sourceSliceStartMs?: number;
  sourceSliceEndMs?: number;
  bestOffsetMs?: number;
  envelopeCorrelation?: number;
  speechEnvelopeCorrelation?: number;
  directCorrelationAtEnvelopeOffset?: number;
  note?: string;
  [key: string]: unknown;
};

type AudioComparisonEvidence = {
  status: 'loaded' | 'missing' | 'unsupported';
  resultPath?: string;
  reportPath?: string;
  kind?: string;
  comparisonMode?: string;
  envelopeCorrelation?: number;
  directCorrelationAtEnvelopeOffset?: number;
  localBestSourceStartMs?: number;
  localBestSourceEndMs?: number;
  absoluteBestSourceStartMs?: number;
  absoluteBestSourceEndMs?: number;
  note: string;
};

type AudioEvidenceResult = {
  kind: 'clip_composition_audio_evidence_summary';
  runAt: string;
  scoreResultPath: string;
  fixtureId: string;
  draftId?: string;
  promptVersion: string;
  model: string;
  params: Record<string, unknown>;
  sourceVideoId?: string;
  clipVideoId?: string;
  audioVerification: AudioVerification | null;
  audioComparisonEvidence: AudioComparisonEvidence;
  visualVerification: Record<string, unknown> | null;
  promptSelectedCut: Cut & { durationMs: number };
  audioConfirmedCut: Cut & { durationMs: number };
  difference: {
    startDeltaMs: number;
    endDeltaMs: number;
    durationDeltaMs: number;
    relation: string;
    interpretation: string;
  };
  themeVsComposition: {
    themeSidePossibility?: string;
    compositionSidePossibility?: string;
    coverageSummary?: string;
    provisionalJudgement: string;
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

  const scoreResultPath = values.get('scoreResult')?.trim();
  if (!scoreResultPath) {
    throw new Error('--scoreResult に採点済み result.json を指定してください');
  }

  return {
    scoreResultPath: resolveWorkspacePath(scoreResultPath),
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

function recordFrom(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function arrayFrom(value: unknown, label: string): unknown[] {
  if (!Array.isArray(value)) {
    throw new Error(`${label} は配列である必要があります`);
  }
  return value;
}

function stringFrom(value: unknown, label: string): string {
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`${label} は空でない文字列である必要があります`);
  }
  return value;
}

function optionalString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value : undefined;
}

function numberFrom(value: unknown, label: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error(`${label} は数値である必要があります`);
  }
  return value;
}

function optionalNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function validateCut(value: unknown, label: string): Cut {
  const record = recordFrom(value);
  const reason = optionalString(record.reason);
  return {
    ...record,
    sourceStartMs: numberFrom(record.sourceStartMs, `${label}.sourceStartMs`),
    sourceEndMs: numberFrom(record.sourceEndMs, `${label}.sourceEndMs`),
    ...(reason ? { reason } : {})
  };
}

function validateScoreResult(value: unknown, scoreResultPath: string): ScoreResult {
  const record = recordFrom(value);
  const selectedCuts = arrayFrom(record.selectedCuts, `${scoreResultPath}.selectedCuts`);
  const expectedCuts = arrayFrom(record.expectedCuts, `${scoreResultPath}.expectedCuts`);
  const draftId = optionalString(record.draftId);
  return {
    runAt: stringFrom(record.runAt, `${scoreResultPath}.runAt`),
    fixtureId: stringFrom(record.fixtureId, `${scoreResultPath}.fixtureId`),
    ...(draftId ? { draftId } : {}),
    promptVersion: stringFrom(record.promptVersion, `${scoreResultPath}.promptVersion`),
    model: stringFrom(record.model, `${scoreResultPath}.model`),
    params: recordFrom(record.params),
    selectedCuts: selectedCuts.map((item, index) => validateCut(item, `${scoreResultPath}.selectedCuts[${index}]`)),
    expectedCuts: expectedCuts.map((item, index) => validateCut(item, `${scoreResultPath}.expectedCuts[${index}]`)),
    themeCoverage: recordFrom(record.themeCoverage)
  };
}

function readAudioVerification(expectedCut: Cut): AudioVerification | null {
  const value = expectedCut.audioVerification;
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  const record = recordFrom(value);
  return {
    ...record,
    status: optionalString(record.status),
    method: optionalString(record.method),
    resultPath: optionalString(record.resultPath),
    reportPath: optionalString(record.reportPath),
    clipDurationMs: optionalNumber(record.clipDurationMs),
    sourceSliceStartMs: optionalNumber(record.sourceSliceStartMs),
    sourceSliceEndMs: optionalNumber(record.sourceSliceEndMs),
    bestOffsetMs: optionalNumber(record.bestOffsetMs),
    envelopeCorrelation: optionalNumber(record.envelopeCorrelation),
    speechEnvelopeCorrelation: optionalNumber(record.speechEnvelopeCorrelation),
    directCorrelationAtEnvelopeOffset: optionalNumber(record.directCorrelationAtEnvelopeOffset),
    note: optionalString(record.note)
  };
}

async function loadAudioComparisonEvidence(audioVerification: AudioVerification | null): Promise<AudioComparisonEvidence> {
  const resultPath = audioVerification?.resultPath;
  if (!resultPath) {
    return {
      status: 'missing',
      note: '期待区間に音声比較結果のパスがありません。'
    };
  }

  const resolvedPath = resolveWorkspacePath(resultPath);
  if (!existsSync(resolvedPath)) {
    return {
      status: 'missing',
      resultPath,
      reportPath: audioVerification.reportPath,
      note: '期待区間が参照している音声比較結果ファイルが見つかりません。'
    };
  }

  const payload = recordFrom(await readJson<unknown>(resolvedPath));
  const kind = optionalString(payload.kind);
  if (kind === 'clip_composition_aligned_audio_chunk_comparison') {
    return evidenceFromAlignedAudioChunks(payload, audioVerification, resultPath);
  }

  if (kind === 'clip_composition_audio_candidate_comparison') {
    return evidenceFromAudioCandidateComparison(payload, audioVerification, resultPath);
  }

  return {
    status: 'unsupported',
    resultPath,
    reportPath: audioVerification.reportPath,
    kind,
    note: 'この音声比較結果の形式は、要約スクリプトがまだ読み取れません。'
  };
}

function evidenceFromAlignedAudioChunks(
  payload: Record<string, unknown>,
  audioVerification: AudioVerification,
  resultPath: string
): AudioComparisonEvidence {
  const comparisons = arrayFrom(payload.comparisons, `${resultPath}.comparisons`);
  const first = recordFrom(comparisons[0]);
  const audio = recordFrom(first.audio);
  const bestSourceWindow = recordFrom(audio.bestSourceWindow);
  const envelope = recordFrom(audio.envelope);
  const direct = recordFrom(audio.direct);
  const localBestSourceStartMs = optionalNumber(bestSourceWindow.sourceStartMs);
  const localBestSourceEndMs = optionalNumber(bestSourceWindow.sourceEndMs);
  const sourceSliceStartMs = audioVerification.sourceSliceStartMs;
  return {
    status: 'loaded',
    resultPath,
    reportPath: audioVerification.reportPath,
    kind: optionalString(payload.kind),
    comparisonMode: 'clip_audio_against_source_candidate_window',
    envelopeCorrelation: optionalNumber(envelope.maxCorrelation),
    directCorrelationAtEnvelopeOffset: optionalNumber(direct.correlationAtEnvelopeOffset),
    localBestSourceStartMs,
    localBestSourceEndMs,
    ...(sourceSliceStartMs !== undefined && localBestSourceStartMs !== undefined
      ? { absoluteBestSourceStartMs: sourceSliceStartMs + localBestSourceStartMs }
      : {}),
    ...(sourceSliceStartMs !== undefined && localBestSourceEndMs !== undefined
      ? { absoluteBestSourceEndMs: sourceSliceStartMs + localBestSourceEndMs }
      : {}),
    note: '保存済みの音声比較結果から、切り抜き音声が元動画候補範囲内のどこへ寄ったかを読み取りました。'
  };
}

function evidenceFromAudioCandidateComparison(
  payload: Record<string, unknown>,
  audioVerification: AudioVerification,
  resultPath: string
): AudioComparisonEvidence {
  const comparisons = arrayFrom(payload.comparisons, `${resultPath}.comparisons`);
  const sourceSpeechAnchorStartMs = optionalNumber(audioVerification.sourceSpeechAnchorStartMs);
  const target = comparisons
    .map((item) => recordFrom(item))
    .find((item) => optionalNumber(recordFrom(item.alignment).sourceStartMs) === sourceSpeechAnchorStartMs) ?? recordFrom(comparisons[0]);
  const speechOnly = recordFrom(target.speechOnly);
  const envelope = recordFrom(speechOnly.envelope);
  const direct = recordFrom(speechOnly.direct);
  return {
    status: 'loaded',
    resultPath,
    reportPath: audioVerification.reportPath,
    kind: optionalString(payload.kind),
    comparisonMode: 'speech_anchor_audio_against_source_candidates',
    envelopeCorrelation: optionalNumber(envelope.maxCorrelation),
    directCorrelationAtEnvelopeOffset: optionalNumber(direct.correlationAtEnvelopeOffset),
    note: '保存済みの音声比較結果から、切り抜き内の発話アンカーが元動画候補へ寄ったことを読み取りました。'
  };
}

function addDuration(cut: Cut): Cut & { durationMs: number } {
  return {
    ...cut,
    durationMs: cut.sourceEndMs - cut.sourceStartMs
  };
}

function relationBetween(selected: Cut, expected: Cut): string {
  if (selected.sourceStartMs === expected.sourceStartMs && selected.sourceEndMs === expected.sourceEndMs) {
    return 'same_as_audio_confirmed_cut';
  }
  if (selected.sourceStartMs <= expected.sourceStartMs && selected.sourceEndMs >= expected.sourceEndMs) {
    return 'prompt_includes_audio_confirmed_cut';
  }
  if (selected.sourceStartMs >= expected.sourceStartMs && selected.sourceEndMs <= expected.sourceEndMs) {
    return 'prompt_inside_audio_confirmed_cut';
  }
  if (selected.sourceEndMs <= expected.sourceStartMs || selected.sourceStartMs >= expected.sourceEndMs) {
    return 'no_overlap';
  }
  return 'partial_overlap';
}

function interpretationFor(selected: Cut, expected: Cut, relation: string): string {
  const startDeltaMs = selected.sourceStartMs - expected.sourceStartMs;
  const endDeltaMs = selected.sourceEndMs - expected.sourceEndMs;
  const parts = [`開始差分は${formatDelta(startDeltaMs)}、終了差分は${formatDelta(endDeltaMs)}です。`];
  if (relation === 'same_as_audio_confirmed_cut') {
    parts.push('LLM選択区間は音声確認済み区間と一致しています。');
  } else if (relation === 'prompt_includes_audio_confirmed_cut') {
    parts.push('LLM選択区間は音声確認済み区間を含んでいます。');
  } else if (relation === 'prompt_inside_audio_confirmed_cut') {
    parts.push('LLM選択区間は音声確認済み区間の内側にあります。');
  } else if (relation === 'partial_overlap') {
    parts.push('LLM選択区間と音声確認済み区間は一部だけ重なっています。');
  } else {
    parts.push('LLM選択区間と音声確認済み区間は重なっていません。');
  }

  if (endDeltaMs > 0) {
    parts.push('終端は音声確認済み区間より後ろです。');
  } else if (endDeltaMs < 0) {
    parts.push('終端は音声確認済み区間より前です。');
  } else {
    parts.push('終端は音声確認済み区間と同じです。');
  }
  return parts.join('');
}

function provisionalJudgement(result: ScoreResult): string {
  const themeText = result.themeCoverage?.themeSidePossibility ?? '';
  const compositionText = result.themeCoverage?.compositionSidePossibility ?? '';
  if (compositionText && themeText) {
    return `theme側: ${themeText} / composition側: ${compositionText}`;
  }
  if (compositionText) {
    return `composition側: ${compositionText}`;
  }
  if (themeText) {
    return `theme側: ${themeText}`;
  }
  return '採点結果にtheme側とcomposition側を分けた判定がありません。';
}

function buildResult(input: {
  scoreResultPath: string;
  scoreResult: ScoreResult;
  audioVerification: AudioVerification | null;
  audioComparisonEvidence: AudioComparisonEvidence;
}): AudioEvidenceResult {
  const selected = input.scoreResult.selectedCuts[0];
  const expected = input.scoreResult.expectedCuts[0];
  if (!selected) {
    throw new Error('採点結果にLLM選択区間がありません');
  }
  if (!expected) {
    throw new Error('採点結果に期待区間がありません');
  }

  const relation = relationBetween(selected, expected);
  const sourceVideoId = optionalString(expected.sourceVideoId);
  const clipVideoId = optionalString(expected.clipId);
  return {
    kind: 'clip_composition_audio_evidence_summary',
    runAt: new Date().toISOString(),
    scoreResultPath: path.relative(workspaceRoot(), input.scoreResultPath),
    fixtureId: input.scoreResult.fixtureId,
    ...(input.scoreResult.draftId ? { draftId: input.scoreResult.draftId } : {}),
    promptVersion: input.scoreResult.promptVersion,
    model: input.scoreResult.model,
    params: input.scoreResult.params,
    ...(sourceVideoId ? { sourceVideoId } : {}),
    ...(clipVideoId ? { clipVideoId } : {}),
    audioVerification: input.audioVerification,
    audioComparisonEvidence: input.audioComparisonEvidence,
    visualVerification: recordOrNull(expected.visualVerification),
    promptSelectedCut: addDuration(selected),
    audioConfirmedCut: addDuration(expected),
    difference: {
      startDeltaMs: selected.sourceStartMs - expected.sourceStartMs,
      endDeltaMs: selected.sourceEndMs - expected.sourceEndMs,
      durationDeltaMs: (selected.sourceEndMs - selected.sourceStartMs) - (expected.sourceEndMs - expected.sourceStartMs),
      relation,
      interpretation: interpretationFor(selected, expected, relation)
    },
    themeVsComposition: {
      ...(input.scoreResult.themeCoverage?.themeSidePossibility ? { themeSidePossibility: input.scoreResult.themeCoverage.themeSidePossibility } : {}),
      ...(input.scoreResult.themeCoverage?.compositionSidePossibility ? { compositionSidePossibility: input.scoreResult.themeCoverage.compositionSidePossibility } : {}),
      ...(input.scoreResult.themeCoverage?.coverageSummary ? { coverageSummary: input.scoreResult.themeCoverage.coverageSummary } : {}),
      provisionalJudgement: provisionalJudgement(input.scoreResult)
    }
  };
}

function recordOrNull(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
}

function formatDelta(value: number): string {
  return value > 0 ? `+${value}ms` : `${value}ms`;
}

function buildReport(result: AudioEvidenceResult, resultPath: string): string {
  const audio = result.audioVerification;
  const comparison = result.audioComparisonEvidence;
  const lines = [
    '# clip_composition 音声根拠サマリー',
    '',
    `- 入力fixture: ${result.fixtureId}`,
    `- 使用プロンプト版数: ${result.promptVersion}`,
    `- 使用モデル名: ${result.model}`,
    `- 使用パラメータ: ${JSON.stringify(result.params)}`,
    `- 採点結果: ${result.scoreResultPath}`,
    `- 結果JSON: ${path.relative(evalRoot, resultPath)}`,
    '',
    '## 結論',
    '',
    result.difference.interpretation,
    '',
    '## 音声確認済み区間',
    '',
    `- 区間: ${result.audioConfirmedCut.sourceStartMs}ms - ${result.audioConfirmedCut.sourceEndMs}ms`,
    `- 長さ: ${result.audioConfirmedCut.durationMs}ms`,
    `- 理由: ${result.audioConfirmedCut.reason ?? '記録なし'}`,
    `- 音声確認状態: ${audio?.status ?? '記録なし'}`,
    `- 確認方法: ${audio?.method ?? '記録なし'}`,
    `- 音声比較結果: ${comparison.resultPath ?? '記録なし'}`,
    `- 音声比較レポート: ${comparison.reportPath ?? '記録なし'}`,
    `- 音声比較の読み取り: ${comparison.note}`
  ];

  if (comparison.envelopeCorrelation !== undefined) {
    lines.push(`- 音量包絡相関: ${comparison.envelopeCorrelation}`);
  }
  if (comparison.directCorrelationAtEnvelopeOffset !== undefined) {
    lines.push(`- 包絡位置での生波形相関: ${comparison.directCorrelationAtEnvelopeOffset}`);
  }
  if (comparison.absoluteBestSourceStartMs !== undefined && comparison.absoluteBestSourceEndMs !== undefined) {
    lines.push(`- 音声比較から読める絶対範囲: ${comparison.absoluteBestSourceStartMs}ms - ${comparison.absoluteBestSourceEndMs}ms`);
  }
  if (audio?.note) {
    lines.push(`- 音声確認メモ: ${audio.note}`);
  }

  lines.push(
    '',
    '## LLM選択区間',
    '',
    `- 区間: ${result.promptSelectedCut.sourceStartMs}ms - ${result.promptSelectedCut.sourceEndMs}ms`,
    `- 長さ: ${result.promptSelectedCut.durationMs}ms`,
    `- 理由: ${result.promptSelectedCut.reason ?? '記録なし'}`,
    '',
    '## 差分',
    '',
    `- 開始位置の差: ${formatDelta(result.difference.startDeltaMs)}`,
    `- 終了位置の差: ${formatDelta(result.difference.endDeltaMs)}`,
    `- 長さの差: ${formatDelta(result.difference.durationDeltaMs)}`,
    `- 関係: ${result.difference.relation}`,
    '',
    '## 暫定判定',
    '',
    `- ${result.themeVsComposition.provisionalJudgement}`
  );

  return `${lines.join('\n')}\n`;
}

async function main(): Promise<void> {
  const options = parseOptions(process.argv.slice(2));
  const scoreResult = validateScoreResult(await readJson<unknown>(options.scoreResultPath), options.scoreResultPath);
  const expected = scoreResult.expectedCuts[0];
  if (!expected) {
    throw new Error('採点結果に期待区間がありません');
  }

  const audioVerification = readAudioVerification(expected);
  const audioComparisonEvidence = await loadAudioComparisonEvidence(audioVerification);
  const result = buildResult({
    scoreResultPath: options.scoreResultPath,
    scoreResult,
    audioVerification,
    audioComparisonEvidence
  });

  const baseName = sanitizePathPart(`audio-evidence-${result.fixtureId}-${result.promptVersion}-${options.outputId}`);
  const outputDir = path.join(evalRoot, 'outputs');
  const reportDir = path.join(evalRoot, 'reports');
  await mkdir(outputDir, { recursive: true });
  await mkdir(reportDir, { recursive: true });
  const resultPath = path.join(outputDir, `${baseName}.json`);
  const reportPath = path.join(reportDir, `${baseName}.md`);
  await writeFile(resultPath, `${JSON.stringify(result, null, 2)}\n`, 'utf8');
  await writeFile(reportPath, buildReport(result, resultPath), 'utf8');

  console.log(`result: ${resultPath}`);
  console.log(`report: ${reportPath}`);
  console.log(result.difference.interpretation);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
