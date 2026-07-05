import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

type CliOptions = {
  candidatePath: string;
  visualSummaryPath: string;
  outputId: string;
};

type CandidateCut = {
  cutIndex: number;
  clipStartMs: number;
  clipEndMs: number;
  sourceStartMs: number;
  sourceEndMs: number;
  sourceGapFromPreviousMs?: number;
  relationToPrevious: string;
  textCoverage?: {
    clip?: number;
    source?: number;
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
  verificationStatus?: string;
};

type CandidatePlan = {
  kind?: string;
  targetId: string;
  title?: string;
  targetPath?: string;
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
  audioCompareResultPath?: string;
  proposedExpectedCuts?: CandidateCut[];
  sourceContinuity?: {
    hasPositiveSourceGaps?: boolean;
    positiveGapCount?: number;
    largestPositiveGapMs?: number;
    summary?: string;
  };
  fixedThemePreparation?: {
    status?: string;
    suggestedHumanTask?: string;
    evidenceTextForHuman?: string[];
  };
};

type VisualChunk = {
  cutIndex: number;
  visualVerificationPath?: string;
  reportPath?: string;
  uploadedVideoPath?: string;
  clipStartMs: number;
  clipEndMs: number;
  sourceStartMs: number;
  sourceEndMs: number;
  geminiStatus?: string;
  operatorAssessment?: string;
  usableForExpectedCutsByGemini?: boolean;
  notes?: string[];
};

type VisualSummary = {
  kind?: string;
  targetId: string;
  targetTitle?: string;
  sourceId?: string;
  model?: string;
  params?: Record<string, unknown>;
  evidenceInputs?: Record<string, unknown>;
  sourceContinuity?: {
    isSingleContinuousSourceCut?: boolean;
    positiveSourceGapsMs?: number[];
    meaning?: string;
  };
  chunkResults?: VisualChunk[];
  aggregateDecision?: {
    allChunksConfirmedByGemini?: boolean;
    allChunksUsableForExpectedCutsByGemini?: boolean;
    canFreezeAsSingleCut?: boolean;
    canFreezeAsMulticutAfterHumanReview?: boolean;
    expectedCutsFrozenNow?: boolean;
    reasonExpectedNotFrozen?: string;
    meaning?: string;
  };
};

type ReviewCut = {
  cutIndex: number;
  clipStartMs: number;
  clipEndMs: number;
  sourceStartMs: number;
  sourceEndMs: number;
  sourceGapFromPreviousMs?: number;
  relationToPrevious: string;
  reason: string;
  evidence: {
    textCoverage?: CandidateCut['textCoverage'];
    audioEvidence?: CandidateCut['audioEvidence'];
    visualVerification: {
      status: string;
      model: string;
      verificationPath?: string;
      reportPath?: string;
      uploadedVideoPath?: string;
      notes: string[];
    };
  };
  reviewState: 'needs_human_visual_confirmation';
};

type ReviewPacket = {
  kind: 'clip_composition_multicut_expected_review_packet';
  runAt: string;
  targetId: string;
  title?: string;
  sourceId?: string;
  draftExpectedFixtureId: string;
  evidenceInputs: {
    candidatePath: string;
    visualSummaryPath: string;
    audioCompareResultPath?: string;
  };
  freezeReadiness: {
    canFreezeAsSingleCut: false;
    canFreezeAsMulticutAfterHumanReview: boolean;
    expectedCutsFrozenNow: false;
    reason: string;
  };
  expectedCutsDraft: ReviewCut[];
  expectedFileDraft: {
    draftId: string;
    fixtureId: string;
    expectedCuts: Array<{
      sourceStartMs: number;
      sourceEndMs: number;
      reason: string;
      sourceVideoId?: string;
      sourceUrl?: string;
      clipId?: string;
      clipUrl?: string;
      verificationStatus: 'audio_stt_gemini_confirmed_human_visual_pending';
      usableForClipLocationEval: true;
      usableForCompositionPromptEval: false;
      multicutPartIndex: number;
      clipStartMs: number;
      clipEndMs: number;
      evidence: ReviewCut['evidence'];
    }>;
  };
  humanReviewChecklist: string[];
  fixedThemeReview: {
    status: 'needs_human_reverse_written_theme';
    instruction: string;
    evidenceTextForHuman: string[];
    suggestedThemeDraftForReview: null;
  };
  productionImpact: {
    writesRuntime: false;
    touchesProductionUi: false;
    touchesProductionApi: false;
    touchesProductionQueue: false;
    touchesDatabase: false;
    writesExpectedDirectory: false;
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

  const candidatePath = values.get('candidate')?.trim();
  if (!candidatePath) {
    throw new Error('--candidate に複数区間候補JSONを指定してください');
  }
  const visualSummaryPath = values.get('visualSummary')?.trim();
  if (!visualSummaryPath) {
    throw new Error('--visualSummary にGemini確認サマリーJSONを指定してください');
  }

  return {
    candidatePath: resolveWorkspacePath(candidatePath),
    visualSummaryPath: resolveWorkspacePath(visualSummaryPath),
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

function requireArray<T>(value: T[] | undefined, label: string): T[] {
  if (!Array.isArray(value) || value.length === 0) {
    throw new Error(`${label} がありません`);
  }
  return value;
}

function requireNumber(value: unknown, label: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error(`${label} は数値である必要があります`);
  }
  return value;
}

function assertSameRange(candidate: CandidateCut, visual: VisualChunk): void {
  const pairs: Array<[number, number, string]> = [
    [candidate.clipStartMs, visual.clipStartMs, '切り抜き側開始位置'],
    [candidate.clipEndMs, visual.clipEndMs, '切り抜き側終了位置'],
    [candidate.sourceStartMs, visual.sourceStartMs, '元動画側開始位置'],
    [candidate.sourceEndMs, visual.sourceEndMs, '元動画側終了位置']
  ];
  for (const [left, right, label] of pairs) {
    if (left !== right) {
      throw new Error(`チャンク${candidate.cutIndex + 1}の${label}が候補とGemini確認で一致しません: ${left} != ${right}`);
    }
  }
}

function buildReviewCut(candidate: CandidateCut, visual: VisualChunk, model: string): ReviewCut {
  assertSameRange(candidate, visual);
  const notes = Array.isArray(visual.notes) ? visual.notes.filter((item): item is string => typeof item === 'string') : [];
  const visualStatus = visual.operatorAssessment ?? visual.geminiStatus ?? 'unknown';
  return {
    cutIndex: candidate.cutIndex,
    clipStartMs: candidate.clipStartMs,
    clipEndMs: candidate.clipEndMs,
    sourceStartMs: candidate.sourceStartMs,
    sourceEndMs: candidate.sourceEndMs,
    ...(candidate.sourceGapFromPreviousMs !== undefined ? { sourceGapFromPreviousMs: candidate.sourceGapFromPreviousMs } : {}),
    relationToPrevious: candidate.relationToPrevious,
    reason: `切り抜き側チャンク${candidate.cutIndex + 1}が、音声/STT照合とGemini左右比較で元動画側候補区間に対応したため。`,
    evidence: {
      ...(candidate.textCoverage ? { textCoverage: candidate.textCoverage } : {}),
      ...(candidate.audioEvidence ? { audioEvidence: candidate.audioEvidence } : {}),
      visualVerification: {
        status: visualStatus,
        model,
        ...(visual.visualVerificationPath ? { verificationPath: visual.visualVerificationPath } : {}),
        ...(visual.reportPath ? { reportPath: visual.reportPath } : {}),
        ...(visual.uploadedVideoPath ? { uploadedVideoPath: visual.uploadedVideoPath } : {}),
        notes
      }
    },
    reviewState: 'needs_human_visual_confirmation'
  };
}

function buildReviewPacket(input: {
  options: CliOptions;
  candidate: CandidatePlan;
  visualSummary: VisualSummary;
}): ReviewPacket {
  if (input.candidate.targetId !== input.visualSummary.targetId) {
    throw new Error(`対象IDが一致しません: ${input.candidate.targetId} != ${input.visualSummary.targetId}`);
  }

  const candidateCuts = requireArray(input.candidate.proposedExpectedCuts, '複数区間候補');
  const visualChunks = requireArray(input.visualSummary.chunkResults, 'Gemini確認チャンク');
  if (candidateCuts.length !== visualChunks.length) {
    throw new Error(`候補数とGemini確認数が一致しません: ${candidateCuts.length} != ${visualChunks.length}`);
  }

  const visualByIndex = new Map(visualChunks.map((chunk) => [chunk.cutIndex, chunk]));
  const model = input.visualSummary.model ?? 'unknown';
  const expectedCutsDraft = candidateCuts.map((candidateCut) => {
    requireNumber(candidateCut.cutIndex, `候補チャンク${candidateCut.cutIndex}の番号`);
    const visual = visualByIndex.get(candidateCut.cutIndex);
    if (!visual) {
      throw new Error(`候補チャンク${candidateCut.cutIndex + 1}に対応するGemini確認がありません`);
    }
    if (visual.geminiStatus !== 'confirmed') {
      throw new Error(`チャンク${candidateCut.cutIndex + 1}はGeminiでconfirmedではありません: ${visual.geminiStatus ?? '未記録'}`);
    }
    if (visual.usableForExpectedCutsByGemini !== true) {
      throw new Error(`チャンク${candidateCut.cutIndex + 1}はGemini確認上expected候補として使えません`);
    }
    return buildReviewCut(candidateCut, visual, model);
  });

  const allGeminiConfirmed = input.visualSummary.aggregateDecision?.allChunksConfirmedByGemini === true;
  const allGeminiUsable = input.visualSummary.aggregateDecision?.allChunksUsableForExpectedCutsByGemini === true;
  const hasPositiveSourceGaps = input.candidate.sourceContinuity?.hasPositiveSourceGaps === true
    || (input.visualSummary.sourceContinuity?.positiveSourceGapsMs?.length ?? 0) > 0;
  const draftExpectedFixtureId = `${sanitizePathPart(input.candidate.targetId)}_multicut_review_v001`;

  return {
    kind: 'clip_composition_multicut_expected_review_packet',
    runAt: new Date().toISOString(),
    targetId: input.candidate.targetId,
    ...(input.candidate.title ? { title: input.candidate.title } : {}),
    ...(input.visualSummary.sourceId ?? input.candidate.source?.id ? { sourceId: input.visualSummary.sourceId ?? input.candidate.source?.id } : {}),
    draftExpectedFixtureId,
    evidenceInputs: {
      candidatePath: relativeWorkspacePath(input.options.candidatePath),
      visualSummaryPath: relativeWorkspacePath(input.options.visualSummaryPath),
      ...(input.candidate.audioCompareResultPath ? { audioCompareResultPath: input.candidate.audioCompareResultPath } : {})
    },
    freezeReadiness: {
      canFreezeAsSingleCut: false,
      canFreezeAsMulticutAfterHumanReview: allGeminiConfirmed && allGeminiUsable,
      expectedCutsFrozenNow: false,
      reason: hasPositiveSourceGaps
        ? '元動画側に空白があるため単一区間では固定しない。Gemini確認は揃ったので、人間の目視確認後に複数区間expectedとして固定できる。'
        : 'Gemini確認は揃ったが、初回正解データのため人間の目視確認後に固定する。'
    },
    expectedCutsDraft,
    expectedFileDraft: {
      draftId: draftExpectedFixtureId,
      fixtureId: draftExpectedFixtureId,
      expectedCuts: expectedCutsDraft.map((cut) => ({
        sourceStartMs: cut.sourceStartMs,
        sourceEndMs: cut.sourceEndMs,
        reason: cut.reason,
        ...(input.candidate.source?.id ? { sourceVideoId: input.candidate.source.id } : {}),
        ...(input.candidate.source?.url ? { sourceUrl: input.candidate.source.url } : {}),
        ...(input.candidate.clip?.id ? { clipId: input.candidate.clip.id } : {}),
        ...(input.candidate.clip?.url ? { clipUrl: input.candidate.clip.url } : {}),
        verificationStatus: 'audio_stt_gemini_confirmed_human_visual_pending',
        usableForClipLocationEval: true,
        usableForCompositionPromptEval: false,
        multicutPartIndex: cut.cutIndex,
        clipStartMs: cut.clipStartMs,
        clipEndMs: cut.clipEndMs,
        evidence: cut.evidence
      }))
    },
    humanReviewChecklist: [
      '4本の左右比較動画を開き、左の切り抜き側と右の元動画側が同じ元場面か確認する。',
      'チャンク2はGemini応答の番号だけずれているため、時刻範囲と映像内容を重点確認する。',
      '4区間の元動画側に空白があるため、単一区間expectedとして固定しない。',
      '確認できた場合だけ、expected/ へ複数区間expectedとしてコピーする。',
      '固定テーマは、この4区間の内容から人間が1行で逆算して書く。'
    ],
    fixedThemeReview: {
      status: 'needs_human_reverse_written_theme',
      instruction: input.candidate.fixedThemePreparation?.suggestedHumanTask
        ?? '確認済みの複数区間を見て、「この切り抜き師は何をテーマとして切ったか」を人間が1行で逆算して書く。',
      evidenceTextForHuman: input.candidate.fixedThemePreparation?.evidenceTextForHuman ?? [],
      suggestedThemeDraftForReview: null
    },
    productionImpact: {
      writesRuntime: false,
      touchesProductionUi: false,
      touchesProductionApi: false,
      touchesProductionQueue: false,
      touchesDatabase: false,
      writesExpectedDirectory: false
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

function buildReport(packet: ReviewPacket, resultPath: string): string {
  const lines = [
    '# 複数区間expected 人間確認パケット',
    '',
    `- 対象: ${packet.targetId}`,
    ...(packet.title ? [`- タイトル: ${packet.title}`] : []),
    ...(packet.sourceId ? [`- 元動画候補: ${packet.sourceId}`] : []),
    `- 結果JSON: ${path.relative(evalRoot, resultPath)}`,
    `- 候補JSON: ${packet.evidenceInputs.candidatePath}`,
    `- Gemini確認サマリー: ${packet.evidenceInputs.visualSummaryPath}`,
    '',
    '## 凍結判断',
    '',
    `- 単一区間として固定: ${packet.freezeReadiness.canFreezeAsSingleCut ? 'yes' : 'no'}`,
    `- 人間確認後に複数区間として固定可能: ${packet.freezeReadiness.canFreezeAsMulticutAfterHumanReview ? 'yes' : 'no'}`,
    `- 今expectedへ固定済み: ${packet.freezeReadiness.expectedCutsFrozenNow ? 'yes' : 'no'}`,
    `- 理由: ${packet.freezeReadiness.reason}`,
    '',
    '## expectedCuts草案',
    '',
    '| part | clip | source | review | evidence |',
    '| ---: | --- | --- | --- | --- |'
  ];

  for (const cut of packet.expectedCutsDraft) {
    const evidence = [
      cut.evidence.textCoverage?.clip !== undefined ? `STT ${Math.round(cut.evidence.textCoverage.clip * 1000) / 10}%` : undefined,
      cut.evidence.audioEvidence?.envelopeCorrelation !== undefined ? `audio ${cut.evidence.audioEvidence.envelopeCorrelation}` : undefined,
      cut.evidence.visualVerification.status
    ].filter((item): item is string => Boolean(item)).join(' / ');
    lines.push(`| ${cut.cutIndex + 1} | ${msLabel(cut.clipStartMs)}-${msLabel(cut.clipEndMs)} | ${msLabel(cut.sourceStartMs)}-${msLabel(cut.sourceEndMs)} | ${cut.reviewState} | ${evidence} |`);
  }

  lines.push('');
  lines.push('## 人間確認チェック');
  lines.push('');
  for (const item of packet.humanReviewChecklist) {
    lines.push(`- ${item}`);
  }
  lines.push('');
  lines.push('## 固定テーマ');
  lines.push('');
  lines.push(`- 状態: ${packet.fixedThemeReview.status}`);
  lines.push(`- 作業: ${packet.fixedThemeReview.instruction}`);
  lines.push('- このパケットではAIが固定テーマを確定しない。');
  lines.push('');
  lines.push('## 本体影響');
  lines.push('');
  lines.push('- runtime/ への書き込みなし');
  lines.push('- 本番UI/API/キュー/DBへの変更なし');
  lines.push('- expected/ への書き込みなし');
  lines.push('');
  return `${lines.join('\n')}\n`;
}

async function main(): Promise<void> {
  const options = parseOptions(process.argv.slice(2));
  const candidate = await readJson<CandidatePlan>(options.candidatePath);
  const visualSummary = await readJson<VisualSummary>(options.visualSummaryPath);
  const packet = buildReviewPacket({ options, candidate, visualSummary });

  const outputDir = path.join(evalRoot, 'outputs');
  const reportDir = path.join(evalRoot, 'reports');
  await mkdir(outputDir, { recursive: true });
  await mkdir(reportDir, { recursive: true });

  const baseName = `multicut-expected-review-${sanitizePathPart(packet.targetId)}-${options.outputId}`;
  const resultPath = path.join(outputDir, `${baseName}.json`);
  const reportPath = path.join(reportDir, `${baseName}.md`);
  await writeFile(resultPath, `${JSON.stringify(packet, null, 2)}\n`, 'utf8');
  await writeFile(reportPath, buildReport(packet, resultPath), 'utf8');

  console.log(`result: ${resultPath}`);
  console.log(`report: ${reportPath}`);
  console.log(packet.freezeReadiness.reason);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
