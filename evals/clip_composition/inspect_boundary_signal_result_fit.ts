#!/usr/bin/env node
import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

type CliOptions = {
  resultPath: string;
  boundaryPayloadPath: string;
  outputId: string;
};

type Cut = {
  sourceStartMs: number;
  sourceEndMs: number;
  reason?: string;
};

type ScoreResult = {
  fixtureId: string;
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
};

type BoundarySignalUnit = {
  signalId: string;
  sourceStartMs: number;
  sourceEndMs: number;
  text: string;
  sourceSegmentId?: number;
  matchesFixtureSpeechId?: number;
};

type BoundaryTransition = {
  transitionId: string;
  previousSignalId: string;
  nextSignalId: string;
  previousEndMs: number;
  nextStartMs: number;
  relation: string;
  overlapMs?: number;
  gapMs?: number;
};

type BoundaryPayload = {
  fixtureId: string;
  boundarySignalInput: {
    wordTimestampsPath: string;
    units: BoundarySignalUnit[];
    transitions: BoundaryTransition[];
  };
  evaluationOnly?: {
    expectedBoundaryValuesFoundInBoundarySignalInput?: unknown[];
  };
};

type BoundaryPoint = {
  boundaryMs: number;
  source: 'unit_start' | 'unit_end' | 'transition_previous_end' | 'transition_next_start';
  signalId?: string;
  transitionId?: string;
  text?: string;
  relation?: string;
  sourceSegmentId?: number;
  matchesFixtureSpeechId?: number;
};

type BoundaryFit = BoundaryPoint & {
  deltaMs: number;
  absoluteDeltaMs: number;
};

type BoundaryFitReport = {
  kind: 'clip_composition_boundary_signal_result_fit';
  runAt: string;
  resultPath: string;
  boundaryPayloadPath: string;
  fixtureId: string;
  promptVersion: string;
  model: string;
  params: Record<string, unknown>;
  selectedCut: Cut;
  expectedCut: Cut;
  diff: ScoreResult['diff'];
  boundarySignalInput: {
    wordTimestampsPath: string;
    unitCount: number;
    transitionCount: number;
    expectedBoundaryValuesFoundInBoundarySignalInput: unknown[];
  };
  nearest: {
    selectedStart: BoundaryFit[];
    selectedEnd: BoundaryFit[];
    expectedStart: BoundaryFit[];
    expectedEnd: BoundaryFit[];
  };
  interpretation: string[];
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
  const boundaryPayloadPath = values.get('boundaryPayload')?.trim();
  if (!boundaryPayloadPath) {
    throw new Error('--boundaryPayload に境界候補payload JSONを指定してください');
  }

  return {
    resultPath: resolveWorkspacePath(resultPath),
    boundaryPayloadPath: resolveWorkspacePath(boundaryPayloadPath),
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

function requireCut(cuts: Cut[] | undefined, label: string): Cut {
  const cut = cuts?.[0];
  if (
    !cut ||
    typeof cut.sourceStartMs !== 'number' ||
    typeof cut.sourceEndMs !== 'number' ||
    cut.sourceEndMs <= cut.sourceStartMs
  ) {
    throw new Error(`${label} に有効な区間がありません`);
  }
  return cut;
}

function boundaryPoints(payload: BoundaryPayload): BoundaryPoint[] {
  const points: BoundaryPoint[] = [];
  for (const unit of payload.boundarySignalInput.units) {
    points.push({
      boundaryMs: unit.sourceStartMs,
      source: 'unit_start',
      signalId: unit.signalId,
      text: unit.text,
      sourceSegmentId: unit.sourceSegmentId,
      matchesFixtureSpeechId: unit.matchesFixtureSpeechId
    });
    points.push({
      boundaryMs: unit.sourceEndMs,
      source: 'unit_end',
      signalId: unit.signalId,
      text: unit.text,
      sourceSegmentId: unit.sourceSegmentId,
      matchesFixtureSpeechId: unit.matchesFixtureSpeechId
    });
  }
  for (const transition of payload.boundarySignalInput.transitions) {
    points.push({
      boundaryMs: transition.previousEndMs,
      source: 'transition_previous_end',
      transitionId: transition.transitionId,
      signalId: transition.previousSignalId,
      relation: transition.relation
    });
    points.push({
      boundaryMs: transition.nextStartMs,
      source: 'transition_next_start',
      transitionId: transition.transitionId,
      signalId: transition.nextSignalId,
      relation: transition.relation
    });
  }
  return points;
}

function nearest(points: BoundaryPoint[], targetMs: number): BoundaryFit[] {
  return points
    .map((point) => ({
      ...point,
      deltaMs: point.boundaryMs - targetMs,
      absoluteDeltaMs: Math.abs(point.boundaryMs - targetMs)
    }))
    .sort((left, right) => (
      left.absoluteDeltaMs - right.absoluteDeltaMs ||
      left.boundaryMs - right.boundaryMs ||
      left.source.localeCompare(right.source)
    ));
}

function exactBoundary(fits: BoundaryFit[], targetMs: number): BoundaryFit | undefined {
  return fits.find((fit) => fit.boundaryMs === targetMs);
}

function sourceLabel(fit: BoundaryFit | undefined): string {
  if (!fit) {
    return '該当なし';
  }
  const id = fit.transitionId ? `${fit.transitionId}/${fit.signalId ?? ''}` : fit.signalId ?? '';
  const text = fit.text ? `「${fit.text}」` : '';
  return `${fit.boundaryMs}ms ${fit.source}${id ? ` ${id}` : ''}${text ? ` ${text}` : ''} (${formatDelta(fit.deltaMs)})`;
}

function formatDelta(value: number): string {
  const sign = value > 0 ? '+' : '';
  return `${sign}${value}ms`;
}

function buildInterpretation(input: {
  selectedCut: Cut;
  expectedCut: Cut;
  selectedEndNearest: BoundaryFit[];
  expectedEndNearest: BoundaryFit[];
  payload: BoundaryPayload;
}): string[] {
  const selectedEndExact = exactBoundary(input.selectedEndNearest, input.selectedCut.sourceEndMs);
  const expectedEndBest = input.expectedEndNearest[0];
  const lines = [
    `モデルの終了位置は ${sourceLabel(selectedEndExact ?? input.selectedEndNearest[0])} に対応している。`,
    `音声比較で固定した終了位置に最も近い境界候補は ${sourceLabel(expectedEndBest)}。`
  ];
  if (selectedEndExact && expectedEndBest && selectedEndExact.boundaryMs !== expectedEndBest.boundaryMs) {
    lines.push(
      `モデルは期待終了に最も近い候補ではなく、${formatDelta(selectedEndExact.boundaryMs - expectedEndBest.boundaryMs)} 後ろの境界を選んでいる。`
    );
  }
  const leakCount = input.payload.evaluationOnly?.expectedBoundaryValuesFoundInBoundarySignalInput?.length ?? 0;
  lines.push(
    leakCount === 0
      ? '境界候補payloadにはexpectedの開始・終了値そのものは含まれていない。'
      : `境界候補payloadにexpectedの値が ${leakCount} 件見つかっているため、prompt入力としては使えない。`
  );
  return lines;
}

function buildReport(fit: BoundaryFitReport, outputPath: string): string {
  const nearestLine = (label: string, items: BoundaryFit[]) => {
    const first = items[0];
    return `- ${label}: ${sourceLabel(first)}`;
  };
  return [
    '# 境界候補と採点結果の照合',
    '',
    `- fixture: ${fit.fixtureId}`,
    `- prompt版数: ${fit.promptVersion}`,
    `- モデル: ${fit.model}`,
    `- パラメータ: ${JSON.stringify(fit.params)}`,
    `- 採点結果: ${fit.resultPath}`,
    `- 境界候補payload: ${fit.boundaryPayloadPath}`,
    `- 結果JSON: ${relativeEvalPath(outputPath)}`,
    `- 境界候補単位: ${fit.boundarySignalInput.unitCount}`,
    `- 遷移: ${fit.boundarySignalInput.transitionCount}`,
    `- expected時刻のpayload混入: ${fit.boundarySignalInput.expectedBoundaryValuesFoundInBoundarySignalInput.length}件`,
    '',
    '## 区間',
    '',
    `- モデル選択: ${fit.selectedCut.sourceStartMs}ms - ${fit.selectedCut.sourceEndMs}ms`,
    `- 期待区間: ${fit.expectedCut.sourceStartMs}ms - ${fit.expectedCut.sourceEndMs}ms`,
    `- 開始差分: ${formatDelta(fit.diff?.startDeltaMs ?? fit.selectedCut.sourceStartMs - fit.expectedCut.sourceStartMs)}`,
    `- 終了差分: ${formatDelta(fit.diff?.endDeltaMs ?? fit.selectedCut.sourceEndMs - fit.expectedCut.sourceEndMs)}`,
    '',
    '## 最寄り境界候補',
    '',
    nearestLine('モデル開始に最も近い候補', fit.nearest.selectedStart),
    nearestLine('モデル終了に最も近い候補', fit.nearest.selectedEnd),
    nearestLine('期待開始に最も近い候補', fit.nearest.expectedStart),
    nearestLine('期待終了に最も近い候補', fit.nearest.expectedEnd),
    '',
    '## 読み取り',
    '',
    ...fit.interpretation.map((line) => `- ${line}`),
    '',
    '## 注意',
    '',
    '- この照合は採点後の分析であり、expectedの値をcomposition promptへ渡すものではない。',
    '- 境界候補は正解ではなく、次のprompt入力を作るときにどの種類の境界が有効そうかを見る材料として扱う。'
  ].join('\n') + '\n';
}

async function main(): Promise<void> {
  const options = parseOptions(process.argv.slice(2));
  const result = await readJson<ScoreResult>(options.resultPath);
  const payload = await readJson<BoundaryPayload>(options.boundaryPayloadPath);
  const selectedCut = requireCut(result.selectedCuts, 'モデル選択');
  const expectedCut = requireCut(result.expectedCuts, '期待区間');
  const points = boundaryPoints(payload);
  if (points.length === 0) {
    throw new Error('境界候補payloadに照合できる境界がありません');
  }

  const nearestFit = {
    selectedStart: nearest(points, selectedCut.sourceStartMs),
    selectedEnd: nearest(points, selectedCut.sourceEndMs),
    expectedStart: nearest(points, expectedCut.sourceStartMs),
    expectedEnd: nearest(points, expectedCut.sourceEndMs)
  };
  const output: BoundaryFitReport = {
    kind: 'clip_composition_boundary_signal_result_fit',
    runAt: new Date().toISOString(),
    resultPath: relativeWorkspacePath(options.resultPath),
    boundaryPayloadPath: relativeWorkspacePath(options.boundaryPayloadPath),
    fixtureId: result.fixtureId,
    promptVersion: result.promptVersion,
    model: result.model,
    params: result.params,
    selectedCut,
    expectedCut,
    diff: result.diff,
    boundarySignalInput: {
      wordTimestampsPath: payload.boundarySignalInput.wordTimestampsPath,
      unitCount: payload.boundarySignalInput.units.length,
      transitionCount: payload.boundarySignalInput.transitions.length,
      expectedBoundaryValuesFoundInBoundarySignalInput: payload.evaluationOnly?.expectedBoundaryValuesFoundInBoundarySignalInput ?? []
    },
    nearest: nearestFit,
    interpretation: buildInterpretation({
      selectedCut,
      expectedCut,
      selectedEndNearest: nearestFit.selectedEnd,
      expectedEndNearest: nearestFit.expectedEnd,
      payload
    })
  };

  const outputDir = path.join(evalRoot, 'outputs');
  const reportDir = path.join(evalRoot, 'reports');
  await mkdir(outputDir, { recursive: true });
  await mkdir(reportDir, { recursive: true });
  const outputPath = path.join(outputDir, `boundary-signal-result-fit-${options.outputId}.json`);
  const reportPath = path.join(reportDir, `boundary-signal-result-fit-${options.outputId}.md`);
  await writeFile(outputPath, `${JSON.stringify(output, null, 2)}\n`, 'utf8');
  await writeFile(reportPath, buildReport(output, outputPath), 'utf8');
  console.log(`json: ${relativeWorkspacePath(outputPath)}`);
  console.log(`report: ${relativeWorkspacePath(reportPath)}`);
  console.log(output.interpretation.join('\n'));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
