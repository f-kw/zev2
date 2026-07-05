import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

type CliOptions = {
  targetPath: string;
  audioComparePath?: string;
  outputId: string;
};

type SttTarget = {
  targetId: string;
  title?: string;
  clip?: {
    id?: string;
    url?: string;
    localVideoPath?: string;
  };
  sourceCandidates?: Array<{
    id?: string;
    url?: string;
    localVideoPath?: string;
  }>;
  alignment?: {
    audioCompareResultPath?: string;
    audioCompareReportPath?: string;
    visualVerificationPath?: string;
  };
};

type AudioComparisonFile = {
  kind?: string;
  sourceId?: string;
  clipVideoPath?: string;
  sourceVideoPath?: string;
  alignmentFile?: string;
  comparisons?: unknown[];
};

type MulticutCandidate = {
  cutIndex: number;
  clipStartMs: number;
  clipEndMs: number;
  sourceStartMs: number;
  sourceEndMs: number;
  clipDurationMs: number;
  sourceDurationMs: number;
  sourceGapFromPreviousMs?: number;
  relationToPrevious: 'first' | 'gap' | 'touching' | 'overlap';
  textCoverage?: {
    clip: number;
    source: number;
    matchedChars?: number;
    queryChars?: number;
    sourceChars?: number;
  };
  audioEvidence?: {
    envelopeCorrelation?: number;
    directCorrelationAtEnvelopeOffset?: number;
    bestOffsetMs?: number;
  };
  clipText?: string;
  sourceText?: string;
  verificationStatus: 'needs_chunk_visual_confirmation';
};

type CandidatePlan = {
  kind: 'clip_composition_multicut_expected_candidate_plan';
  runAt: string;
  targetId: string;
  title?: string;
  targetPath: string;
  clip?: {
    id?: string;
    url?: string;
    localVideoPath?: string;
  };
  source?: {
    id?: string;
    url?: string;
    localVideoPath?: string;
  };
  audioCompareResultPath: string;
  audioCompareReportPath?: string;
  existingRejectedVisualVerificationPath?: string;
  freezeDecision: {
    canFreezeAsSingleCut: boolean;
    canFreezeAsMulticutNow: boolean;
    reason: string;
  };
  proposedExpectedCuts: MulticutCandidate[];
  sourceContinuity: {
    hasPositiveSourceGaps: boolean;
    positiveGapCount: number;
    largestPositiveGapMs?: number;
    summary: string;
  };
  fixedThemePreparation: {
    status: 'needs_human_reverse_written_theme';
    suggestedHumanTask: string;
    evidenceTextForHuman: string[];
  };
  nextActions: string[];
  productionImpact: {
    writesRuntime: false;
    touchesProductionUi: false;
    touchesProductionApi: false;
    touchesProductionQueue: false;
    touchesDatabase: false;
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

  const targetPath = values.get('target')?.trim();
  if (!targetPath) {
    throw new Error('--target に stt-targets のJSONを指定してください');
  }

  return {
    targetPath: resolveWorkspacePath(targetPath),
    audioComparePath: values.get('audioCompare')?.trim() ? resolveWorkspacePath(values.get('audioCompare')!.trim()) : undefined,
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

function optionalString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value : undefined;
}

function optionalNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function numberFrom(value: unknown, label: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error(`${label} は数値である必要があります`);
  }
  return value;
}

function defaultAudioComparePath(target: SttTarget): string {
  const resultPath = target.alignment?.audioCompareResultPath;
  if (!resultPath) {
    throw new Error('targetに音声比較結果パスがありません。--audioCompare を指定してください');
  }
  return resolveWorkspacePath(resultPath);
}

function relationToPrevious(previous: MulticutCandidate | undefined, sourceStartMs: number): {
  relation: MulticutCandidate['relationToPrevious'];
  gap?: number;
} {
  if (!previous) {
    return { relation: 'first' };
  }

  const gap = sourceStartMs - previous.sourceEndMs;
  if (gap > 0) {
    return { relation: 'gap', gap };
  }
  if (gap === 0) {
    return { relation: 'touching', gap };
  }
  return { relation: 'overlap', gap };
}

function buildCandidates(audioCompare: AudioComparisonFile): MulticutCandidate[] {
  if (audioCompare.kind !== 'clip_composition_aligned_audio_chunk_comparison') {
    throw new Error('複数区間候補化に対応している音声比較形式ではありません');
  }
  if (!Array.isArray(audioCompare.comparisons) || audioCompare.comparisons.length === 0) {
    throw new Error('音声比較結果にチャンク比較がありません');
  }

  const result: MulticutCandidate[] = [];
  for (const [index, item] of audioCompare.comparisons.entries()) {
    const record = recordFrom(item);
    const audio = recordFrom(record.audio);
    const query = recordFrom(audio.query);
    const bestSourceWindow = recordFrom(audio.bestSourceWindow);
    const textMatch = recordFrom(record.textMatch);
    const envelope = recordFrom(recordFrom(audio.envelope));
    const direct = recordFrom(recordFrom(audio.direct));
    const sourceStartMs = numberFrom(bestSourceWindow.sourceStartMs, `comparisons[${index}].audio.bestSourceWindow.sourceStartMs`);
    const sourceEndMs = numberFrom(bestSourceWindow.sourceEndMs, `comparisons[${index}].audio.bestSourceWindow.sourceEndMs`);
    const clipStartMs = numberFrom(query.startMs, `comparisons[${index}].audio.query.startMs`);
    const clipEndMs = numberFrom(query.endMs, `comparisons[${index}].audio.query.endMs`);
    const previous = result.at(-1);
    const relation = relationToPrevious(previous, sourceStartMs);
    result.push({
      cutIndex: index,
      clipStartMs,
      clipEndMs,
      sourceStartMs,
      sourceEndMs,
      clipDurationMs: clipEndMs - clipStartMs,
      sourceDurationMs: sourceEndMs - sourceStartMs,
      ...(relation.gap !== undefined ? { sourceGapFromPreviousMs: relation.gap } : {}),
      relationToPrevious: relation.relation,
      textCoverage: {
        clip: numberFrom(textMatch.clipCoverage, `comparisons[${index}].textMatch.clipCoverage`),
        source: numberFrom(textMatch.sourceCoverage, `comparisons[${index}].textMatch.sourceCoverage`),
        matchedChars: optionalNumber(textMatch.matchedChars),
        queryChars: optionalNumber(textMatch.queryChars),
        sourceChars: optionalNumber(textMatch.sourceChars)
      },
      audioEvidence: {
        envelopeCorrelation: optionalNumber(envelope.maxCorrelation),
        directCorrelationAtEnvelopeOffset: optionalNumber(direct.correlationAtEnvelopeOffset),
        bestOffsetMs: optionalNumber(envelope.bestOffsetMs)
      },
      ...(optionalString(record.clipText) ? { clipText: optionalString(record.clipText) } : {}),
      ...(optionalString(record.sourceText) ? { sourceText: optionalString(record.sourceText) } : {}),
      verificationStatus: 'needs_chunk_visual_confirmation'
    });
  }

  return result;
}

function continuitySummary(cuts: MulticutCandidate[]): CandidatePlan['sourceContinuity'] {
  const positiveGaps = cuts
    .map((cut) => cut.sourceGapFromPreviousMs)
    .filter((gap): gap is number => typeof gap === 'number' && gap > 0);
  const largestPositiveGapMs = positiveGaps.length > 0 ? Math.max(...positiveGaps) : undefined;
  return {
    hasPositiveSourceGaps: positiveGaps.length > 0,
    positiveGapCount: positiveGaps.length,
    ...(largestPositiveGapMs !== undefined ? { largestPositiveGapMs } : {}),
    summary: positiveGaps.length > 0
      ? `元動画側で正のギャップが${positiveGaps.length}件あるため、単一区間expectedとして凍結すると切り抜きにない元配信部分を含みます。`
      : '元動画側の候補範囲は連続または重なりとして読めるため、単一区間化できる可能性があります。'
  };
}

function buildThemeEvidence(cuts: MulticutCandidate[]): string[] {
  return cuts.map((cut) => {
    const text = cut.clipText ?? cut.sourceText ?? '';
    return `チャンク${cut.cutIndex + 1}: ${text}`;
  });
}

function buildPlan(input: {
  options: CliOptions;
  target: SttTarget;
  audioCompare: AudioComparisonFile;
  audioComparePath: string;
  proposedExpectedCuts: MulticutCandidate[];
}): CandidatePlan {
  const source = input.target.sourceCandidates?.[0];
  const continuity = continuitySummary(input.proposedExpectedCuts);
  return {
    kind: 'clip_composition_multicut_expected_candidate_plan',
    runAt: new Date().toISOString(),
    targetId: input.target.targetId,
    ...(input.target.title ? { title: input.target.title } : {}),
    targetPath: relativeWorkspacePath(input.options.targetPath),
    clip: {
      id: input.target.clip?.id,
      url: input.target.clip?.url,
      localVideoPath: input.target.clip?.localVideoPath
    },
    source: {
      id: source?.id,
      url: source?.url,
      localVideoPath: source?.localVideoPath
    },
    audioCompareResultPath: relativeWorkspacePath(input.audioComparePath),
    ...(input.target.alignment?.audioCompareReportPath ? { audioCompareReportPath: input.target.alignment.audioCompareReportPath } : {}),
    ...(input.target.alignment?.visualVerificationPath ? { existingRejectedVisualVerificationPath: input.target.alignment.visualVerificationPath } : {}),
    freezeDecision: {
      canFreezeAsSingleCut: !continuity.hasPositiveSourceGaps,
      canFreezeAsMulticutNow: false,
      reason: continuity.hasPositiveSourceGaps
        ? '複数の元動画側ギャップがあるため単一区間では凍結しない。各チャンクをWeb Geminiまたは人間の目で確認するまで、複数区間expectedとしても凍結しない。'
        : '単一区間化できる可能性はあるが、目視確認が終わるまで凍結しない。'
    },
    proposedExpectedCuts: input.proposedExpectedCuts,
    sourceContinuity: continuity,
    fixedThemePreparation: {
      status: 'needs_human_reverse_written_theme',
      suggestedHumanTask: '確認済みの複数区間を見て、「この切り抜き師は何をテーマとして切ったか」を人間が1行で逆算して書く。',
      evidenceTextForHuman: buildThemeEvidence(input.proposedExpectedCuts)
    },
    nextActions: [
      '各チャンクについて、切り抜き側範囲と元動画側候補範囲の左右比較動画を作る。',
      'Web版Geminiまたは人間の目で、各チャンクが同じ元ネタか確認する。',
      '確認済みチャンクだけをexpectedCuts候補に残し、確認不能なチャンクは除外または再探索する。',
      '固定テーマは確認済み区間から人間が逆算して書く。',
      '現在の単一区間採点スクリプトが複数expectedCutsを全件評価できるようにしてから、composition評価へ入れる。'
    ],
    productionImpact: {
      writesRuntime: false,
      touchesProductionUi: false,
      touchesProductionApi: false,
      touchesProductionQueue: false,
      touchesDatabase: false
    }
  };
}

function msLabel(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const milliseconds = ms % 1000;
  return `${minutes}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(3, '0')}`;
}

function percent(value: number | undefined): string {
  return value === undefined ? '記録なし' : `${Math.round(value * 1000) / 10}%`;
}

function buildReport(plan: CandidatePlan, resultPath: string): string {
  const lines = [
    '# 複数区間expected候補プラン',
    '',
    `- 対象: ${plan.targetId}`,
    ...(plan.title ? [`- タイトル: ${plan.title}`] : []),
    `- 結果JSON: ${path.relative(evalRoot, resultPath)}`,
    `- 音声比較結果: ${plan.audioCompareResultPath}`,
    '',
    '## 凍結判断',
    '',
    `- 単一区間として凍結可能: ${plan.freezeDecision.canFreezeAsSingleCut ? 'yes' : 'no'}`,
    `- 複数区間として今すぐ凍結可能: ${plan.freezeDecision.canFreezeAsMulticutNow ? 'yes' : 'no'}`,
    `- 理由: ${plan.freezeDecision.reason}`,
    `- 連続性: ${plan.sourceContinuity.summary}`,
    '',
    '## 候補区間',
    ''
  ];

  for (const cut of plan.proposedExpectedCuts) {
    lines.push(`### チャンク ${cut.cutIndex + 1}`);
    lines.push('');
    lines.push(`- 切り抜き側: ${msLabel(cut.clipStartMs)} - ${msLabel(cut.clipEndMs)}`);
    lines.push(`- 元動画側: ${msLabel(cut.sourceStartMs)} - ${msLabel(cut.sourceEndMs)}`);
    lines.push(`- 前チャンクとの関係: ${cut.relationToPrevious}${cut.sourceGapFromPreviousMs !== undefined ? ` (${cut.sourceGapFromPreviousMs}ms)` : ''}`);
    lines.push(`- テキスト一致: 切り抜き側 ${percent(cut.textCoverage?.clip)} / 元動画側 ${percent(cut.textCoverage?.source)}`);
    lines.push(`- 音量包絡相関: ${cut.audioEvidence?.envelopeCorrelation ?? '記録なし'}`);
    lines.push(`- 確認状態: ${cut.verificationStatus}`);
    lines.push(`- 切り抜き文字起こし: ${cut.clipText ?? '記録なし'}`);
    lines.push('');
  }

  lines.push('## 固定テーマ準備');
  lines.push('');
  lines.push(`- 状態: ${plan.fixedThemePreparation.status}`);
  lines.push(`- 作業: ${plan.fixedThemePreparation.suggestedHumanTask}`);
  lines.push('');
  lines.push('## 次の作業');
  lines.push('');
  for (const action of plan.nextActions) {
    lines.push(`- ${action}`);
  }

  return `${lines.join('\n')}\n`;
}

async function main(): Promise<void> {
  const options = parseOptions(process.argv.slice(2));
  const target = await readJson<SttTarget>(options.targetPath);
  const audioComparePath = options.audioComparePath ?? defaultAudioComparePath(target);
  const audioCompare = await readJson<AudioComparisonFile>(audioComparePath);
  const proposedExpectedCuts = buildCandidates(audioCompare);
  const plan = buildPlan({ options, target, audioCompare, audioComparePath, proposedExpectedCuts });

  const outputDir = path.join(evalRoot, 'outputs');
  const reportDir = path.join(evalRoot, 'reports');
  await mkdir(outputDir, { recursive: true });
  await mkdir(reportDir, { recursive: true });

  const baseName = `multicut-expected-candidate-${sanitizePathPart(target.targetId)}-${options.outputId}`;
  const resultPath = path.join(outputDir, `${baseName}.json`);
  const reportPath = path.join(reportDir, `${baseName}.md`);
  await writeFile(resultPath, `${JSON.stringify(plan, null, 2)}\n`, 'utf8');
  await writeFile(reportPath, buildReport(plan, resultPath), 'utf8');

  console.log(`result: ${resultPath}`);
  console.log(`report: ${reportPath}`);
  console.log(plan.sourceContinuity.summary);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
