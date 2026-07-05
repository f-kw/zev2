import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

type CliOptions = {
  reviewPath: string;
  targetPath: string;
  sourceSttId: string;
  decisionPath?: string;
  fixtureId?: string;
  themeTitle?: string;
  themeSummary?: string;
  themeCompositionNote?: string;
  outputId: string;
  writeFixture: boolean;
  humanConfirmed: boolean;
};

type ReviewExpectedCut = {
  sourceStartMs: number;
  sourceEndMs: number;
  reason: string;
  sourceVideoId?: string;
  sourceUrl?: string;
  clipId?: string;
  clipUrl?: string;
  verificationStatus?: string;
  usableForClipLocationEval?: boolean;
  usableForCompositionPromptEval?: boolean;
  multicutPartIndex?: number;
  clipStartMs?: number;
  clipEndMs?: number;
  evidence?: Record<string, unknown>;
};

type ReviewPacket = {
  kind?: string;
  targetId: string;
  title?: string;
  sourceId?: string;
  draftExpectedFixtureId?: string;
  evidenceInputs?: {
    candidatePath?: string;
    visualSummaryPath?: string;
    audioCompareResultPath?: string;
  };
  freezeReadiness?: {
    canFreezeAsSingleCut?: boolean;
    canFreezeAsMulticutAfterHumanReview?: boolean;
    expectedCutsFrozenNow?: boolean;
    reason?: string;
  };
  expectedFileDraft?: {
    draftId: string;
    fixtureId: string;
    expectedCuts: ReviewExpectedCut[];
  };
  fixedThemeReview?: {
    status?: string;
    instruction?: string;
    evidenceTextForHuman?: string[];
  };
};

type TargetFile = {
  targetId: string;
  title?: string;
  clip?: {
    id?: string;
    url?: string;
    localVideoPath?: string;
    durationSec?: number;
  };
  sourceCandidates?: Array<{
    id?: string;
    sttId?: string;
    url?: string;
    localVideoPath?: string;
    durationSec?: number;
  }>;
};

type WordTimestampFile = {
  sourceUri?: string;
  language?: string;
  words?: Array<{
    text: string;
    startMs: number;
    endMs: number;
    speaker?: string;
  }>;
};

type HumanDecisionFile = {
  kind?: string;
  fixtureId?: string;
  humanConfirmation?: {
    allChunksConfirmed?: boolean;
    checkedBy?: string;
    checkedAt?: string;
    note?: string;
  };
  fixedTheme?: {
    title?: string;
    summary?: string;
    compositionNote?: string;
  };
  chunks?: Array<{
    cutIndex: number;
    status?: 'confirmed' | 'uncertain' | 'rejected' | 'pending';
    note?: string;
  }>;
};

type TranscriptSegment = {
  id: number;
  startMs: number;
  endMs: number;
  text: string;
  speaker?: string;
  multicutPartIndex: number;
};

type FrozenPreview = {
  kind: 'clip_composition_multicut_fixture_freeze_preview';
  runAt: string;
  writeFixture: boolean;
  humanConfirmed: boolean;
  fixtureWriteReady: boolean;
  missingHumanInputs: string[];
  reviewPath: string;
  targetPath: string;
  sourceSttId: string;
  humanDecisionPath?: string;
  fixtureId: string;
  plannedWrites: {
    fixtureDir: string;
    fixturePath: string;
    transcriptPath: string;
    themesPath: string;
    expectedPath: string;
  };
  fixtureDraft: Record<string, unknown>;
  transcriptDraft: Record<string, unknown>;
  themesDraft: Record<string, unknown> | null;
  expectedDraft: Record<string, unknown>;
  cutTranscriptSummary: Array<{
    partIndex: number;
    sourceStartMs: number;
    sourceEndMs: number;
    segmentCount: number;
    textPreview: string;
  }>;
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

  const reviewPath = values.get('review')?.trim();
  if (!reviewPath) {
    throw new Error('--review に人間確認パケットJSONを指定してください');
  }
  const targetPath = values.get('target')?.trim();
  if (!targetPath) {
    throw new Error('--target に stt-targets のJSONを指定してください');
  }
  const sourceSttId = values.get('sourceSttId')?.trim();
  if (!sourceSttId) {
    throw new Error('--sourceSttId を指定してください');
  }

  return {
    reviewPath: resolveWorkspacePath(reviewPath),
    targetPath: resolveWorkspacePath(targetPath),
    sourceSttId: sanitizePathPart(sourceSttId),
    ...(values.get('decision')?.trim() ? { decisionPath: resolveWorkspacePath(values.get('decision')!.trim()) } : {}),
    ...(values.get('fixture')?.trim() ? { fixtureId: sanitizePathPart(values.get('fixture')!.trim()) } : {}),
    ...(values.get('themeTitle')?.trim() ? { themeTitle: values.get('themeTitle')!.trim() } : {}),
    ...(values.get('themeSummary')?.trim() ? { themeSummary: values.get('themeSummary')!.trim() } : {}),
    ...(values.get('themeCompositionNote')?.trim() ? { themeCompositionNote: values.get('themeCompositionNote')!.trim() } : {}),
    outputId: sanitizePathPart(values.get('outputId')?.trim() || timestampForFile()),
    writeFixture: values.get('writeFixture') === 'true',
    humanConfirmed: values.get('humanConfirmed') === 'true'
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

function applyHumanDecision(options: CliOptions, decision: HumanDecisionFile | undefined): CliOptions {
  if (!decision) {
    return options;
  }

  const chunks = decision.chunks ?? [];
  const allChunksConfirmed = decision.humanConfirmation?.allChunksConfirmed === true &&
    chunks.length > 0 &&
    chunks.every((chunk) => chunk.status === 'confirmed');
  return {
    ...options,
    ...(decision.fixtureId && !options.fixtureId ? { fixtureId: sanitizePathPart(decision.fixtureId) } : {}),
    themeTitle: options.themeTitle ?? decision.fixedTheme?.title,
    themeSummary: options.themeSummary ?? decision.fixedTheme?.summary,
    themeCompositionNote: options.themeCompositionNote ?? decision.fixedTheme?.compositionNote,
    humanConfirmed: options.humanConfirmed || allChunksConfirmed
  };
}

function requireExpectedCuts(review: ReviewPacket): ReviewExpectedCut[] {
  const cuts = review.expectedFileDraft?.expectedCuts;
  if (!Array.isArray(cuts) || cuts.length === 0) {
    throw new Error('人間確認パケットにexpectedCuts草案がありません');
  }
  for (const [index, cut] of cuts.entries()) {
    if (typeof cut.sourceStartMs !== 'number' || typeof cut.sourceEndMs !== 'number' || cut.sourceEndMs <= cut.sourceStartMs) {
      throw new Error(`expectedCuts草案 ${index + 1} の開始/終了が不正です`);
    }
  }
  return cuts;
}

function findSource(target: TargetFile, review: ReviewPacket, sourceSttId: string) {
  const sources = target.sourceCandidates ?? [];
  const source = sources.find((candidate) =>
    candidate.sttId === sourceSttId ||
    candidate.id === sourceSttId ||
    (review.sourceId && candidate.id === review.sourceId)
  );
  if (!source) {
    throw new Error(`targetに元動画候補が見つかりません: ${sourceSttId}`);
  }
  return source;
}

function sttWordPath(sourceSttId: string): string {
  return path.join(evalRoot, 'stt', sourceSttId, 'source', 'word-timestamps.json');
}

function wordsInRange(
  words: NonNullable<WordTimestampFile['words']>,
  cut: ReviewExpectedCut
): NonNullable<WordTimestampFile['words']> {
  return words
    .filter((word) => word.endMs > cut.sourceStartMs && word.startMs < cut.sourceEndMs)
    .sort((left, right) => left.startMs - right.startMs);
}

function textFromSegments(segments: Array<{ text: string }>): string {
  return segments.map((segment) => segment.text).join('');
}

function buildTranscript(input: {
  review: ReviewPacket;
  target: TargetFile;
  source: NonNullable<TargetFile['sourceCandidates']>[number];
  words: NonNullable<WordTimestampFile['words']>;
  expectedCuts: ReviewExpectedCut[];
  copiedAt: string;
}) {
  const segments: TranscriptSegment[] = [];
  const speechUnitGroups: number[][] = [];
  const cutTranscriptSummary: FrozenPreview['cutTranscriptSummary'] = [];

  for (const [cutIndex, cut] of input.expectedCuts.entries()) {
    const words = wordsInRange(input.words, cut);
    if (words.length === 0) {
      throw new Error(`expectedCuts草案 ${cutIndex + 1} に対応する単語タイムスタンプがありません`);
    }

    const group: number[] = [];
    for (const word of words) {
      const id = segments.length + 1;
      const segment = {
        id,
        startMs: Math.max(word.startMs, cut.sourceStartMs),
        endMs: Math.min(word.endMs, cut.sourceEndMs),
        text: word.text,
        ...(word.speaker ? { speaker: word.speaker } : {}),
        multicutPartIndex: cutIndex
      };
      if (segment.endMs < segment.startMs) {
        continue;
      }
      segments.push(segment);
      group.push(id);
    }

    speechUnitGroups.push(group);
    cutTranscriptSummary.push({
      partIndex: cutIndex,
      sourceStartMs: cut.sourceStartMs,
      sourceEndMs: cut.sourceEndMs,
      segmentCount: group.length,
      textPreview: textFromSegments(segments.filter((segment) => group.includes(segment.id))).slice(0, 160)
    });
  }

  return {
    transcript: {
      kind: 'transcript_json',
      mode: 'zev-local-stt-multicut-review',
      sourceUri: input.source.url,
      sampleSource: {
        title: input.target.title ?? input.review.title,
        path: input.source.localVideoPath,
        sourceRanges: input.expectedCuts.map((cut, index) => ({
          partIndex: index,
          sourceStartMs: cut.sourceStartMs,
          sourceEndMs: cut.sourceEndMs
        }))
      },
      notes: [
        'clip_composition評価環境で、複数区間expected候補を人間確認後に固定するための文字起こし草案。',
        'speechUnitGroupsは複数区間expectedの各区間に対応する。',
        '評価実行時はruntime/artifactsを読まず、このfixture配下のファイルだけを読む。'
      ],
      generatedAt: input.copiedAt,
      language: 'ja-JP',
      durationSec: Math.round(input.expectedCuts.reduce((sum, cut) => sum + (cut.sourceEndMs - cut.sourceStartMs), 0) / 1000 * 1000) / 1000,
      segmentCount: segments.length,
      segments,
      speechUnitGroups
    },
    cutTranscriptSummary
  };
}

function buildThemes(input: {
  options: CliOptions;
  review: ReviewPacket;
  sourceUrl?: string;
  segments: TranscriptSegment[];
  speechUnitGroups: number[][];
  copiedAt: string;
}): Record<string, unknown> | null {
  if (!input.options.themeTitle || !input.options.themeSummary) {
    return null;
  }

  const relatedSpeechIds = input.speechUnitGroups.flat();
  const representativeSpeechIds = input.speechUnitGroups[0] ?? relatedSpeechIds;
  const representativeText = textFromSegments(input.segments.filter((segment) => representativeSpeechIds.includes(segment.id)));
  return {
    kind: 'theme_json',
    mode: 'human-reverse-written-multicut-theme',
    generatedAt: input.copiedAt,
    sourceUri: input.sourceUrl,
    themes: [
      {
        id: 'theme_multicut_review_1',
        title: input.options.themeTitle,
        summary: input.options.themeSummary,
        representativeText,
        representativeSpeechIds,
        relatedSpeechIds,
        whyItCanBeClipped: '人間が確認した複数区間expectedの内容から逆算した固定テーマで、compositionだけを評価するため。',
        compositionNote: input.options.themeCompositionNote
          ?? 'このfixtureでは、複数の元動画区間を同じ切り抜きテーマに属する編集元場面として扱う。',
        evidenceRefs: [
          {
            kind: 'multicut_review_packet',
            refId: input.review.draftExpectedFixtureId,
            meaning: '音声/STT照合とGemini左右比較をまとめた人間確認パケット'
          }
        ]
      }
    ]
  };
}

function missingHumanInputs(options: CliOptions): string[] {
  const missing: string[] = [];
  if (!options.humanConfirmed) {
    missing.push('--humanConfirmed true');
  }
  if (!options.themeTitle) {
    missing.push('--themeTitle');
  }
  if (!options.themeSummary) {
    missing.push('--themeSummary');
  }
  return missing;
}

function buildExpected(input: {
  review: ReviewPacket;
  target: TargetFile;
  source: NonNullable<TargetFile['sourceCandidates']>[number];
  expectedCuts: ReviewExpectedCut[];
  fixtureId: string;
  options: CliOptions;
  decision?: HumanDecisionFile;
}) {
  const decisionNote = input.decision?.humanConfirmation?.note;
  const checkedBy = input.decision?.humanConfirmation?.checkedBy ?? 'human';
  const checkedAt = input.decision?.humanConfirmation?.checkedAt ?? new Date().toISOString();
  return {
    draftId: input.fixtureId,
    fixtureId: input.fixtureId,
    expectedCuts: input.expectedCuts.map((cut, index) => ({
      ...cut,
      reason: cut.reason,
      sourceVideoId: cut.sourceVideoId ?? input.source.id,
      sourceUrl: cut.sourceUrl ?? input.source.url,
      sourceSttId: input.options.sourceSttId,
      clipId: cut.clipId ?? input.target.clip?.id,
      clipUrl: cut.clipUrl ?? input.target.clip?.url,
      verificationStatus: input.options.humanConfirmed
        ? 'audio_stt_gemini_confirmed_human_visual_confirmed'
        : cut.verificationStatus ?? 'audio_stt_gemini_confirmed_human_visual_pending',
      usableForClipLocationEval: true,
      usableForCompositionPromptEval: input.options.humanConfirmed,
      multicutPartIndex: typeof cut.multicutPartIndex === 'number' ? cut.multicutPartIndex : index,
      humanVisualVerification: input.options.humanConfirmed
        ? {
          status: 'confirmed',
          checkedBy,
          checkedAt,
          note: decisionNote ?? '人間が左右比較動画を確認し、複数区間expectedとして固定した。'
        }
        : {
          status: 'pending',
          note: '人間確認前のpreview。expected/にはまだ固定しない。'
        }
    }))
  };
}

function buildReport(preview: FrozenPreview, resultPath: string): string {
  const lines = [
    '# 複数区間fixture凍結preview',
    '',
    `- 結果JSON: ${path.relative(evalRoot, resultPath)}`,
    `- fixture ID: ${preview.fixtureId}`,
    `- 書き込み実行: ${preview.writeFixture ? 'yes' : 'no'}`,
    `- 人間確認済み: ${preview.humanConfirmed ? 'yes' : 'no'}`,
    `- fixture書き込み可能: ${preview.fixtureWriteReady ? 'yes' : 'no'}`,
    '',
    '## 不足している人間入力',
    ''
  ];

  if (preview.missingHumanInputs.length === 0) {
    lines.push('- なし');
  } else {
    for (const item of preview.missingHumanInputs) {
      lines.push(`- ${item}`);
    }
  }

  lines.push('');
  lines.push('## 書き込み予定先');
  lines.push('');
  lines.push(`- fixture: ${preview.plannedWrites.fixturePath}`);
  lines.push(`- transcript: ${preview.plannedWrites.transcriptPath}`);
  lines.push(`- themes: ${preview.plannedWrites.themesPath}`);
  lines.push(`- expected: ${preview.plannedWrites.expectedPath}`);
  lines.push('');
  lines.push('## 区間別文字起こし');
  lines.push('');
  lines.push('| part | source | segments | preview |');
  lines.push('| ---: | --- | ---: | --- |');
  for (const item of preview.cutTranscriptSummary) {
    lines.push(`| ${item.partIndex + 1} | ${item.sourceStartMs}-${item.sourceEndMs} | ${item.segmentCount} | ${item.textPreview} |`);
  }
  lines.push('');
  lines.push('## 本体影響');
  lines.push('');
  lines.push('- runtime/ への書き込みなし');
  lines.push('- 本番UI/API/キュー/DBへの変更なし');
  lines.push('');
  return `${lines.join('\n')}\n`;
}

async function main(): Promise<void> {
  const rawOptions = parseOptions(process.argv.slice(2));
  const decision = rawOptions.decisionPath ? await readJson<HumanDecisionFile>(rawOptions.decisionPath) : undefined;
  const options = applyHumanDecision(rawOptions, decision);
  const review = await readJson<ReviewPacket>(options.reviewPath);
  const target = await readJson<TargetFile>(options.targetPath);
  const expectedCuts = requireExpectedCuts(review);
  const source = findSource(target, review, options.sourceSttId);
  const wordPayload = await readJson<WordTimestampFile>(sttWordPath(options.sourceSttId));
  const words = wordPayload.words ?? [];
  if (words.length === 0) {
    throw new Error(`単語タイムスタンプがありません: ${sttWordPath(options.sourceSttId)}`);
  }

  const fixtureId = options.fixtureId ?? sanitizePathPart(review.draftExpectedFixtureId ?? `${review.targetId}_multicut_review_v001`);
  const copiedAt = new Date().toISOString();
  const { transcript, cutTranscriptSummary } = buildTranscript({
    review,
    target,
    source,
    words,
    expectedCuts,
    copiedAt
  });
  const themesDraft = buildThemes({
    options,
    review,
    sourceUrl: source.url,
    segments: transcript.segments as TranscriptSegment[],
    speechUnitGroups: transcript.speechUnitGroups as number[][],
    copiedAt
  });
  const expectedDraft = buildExpected({ review, target, source, expectedCuts, fixtureId, options, decision });
  const missing = missingHumanInputs(options);
  const fixtureWriteReady = missing.length === 0;
  if (options.writeFixture && !fixtureWriteReady) {
    throw new Error(`fixtureへ書き込むには人間確認と固定テーマが必要です: ${missing.join(', ')}`);
  }

  const fixtureDir = path.join(evalRoot, 'fixtures', fixtureId);
  const plannedWrites = {
    fixtureDir: relativeWorkspacePath(fixtureDir),
    fixturePath: relativeWorkspacePath(path.join(fixtureDir, 'fixture.json')),
    transcriptPath: relativeWorkspacePath(path.join(fixtureDir, 'transcript.json')),
    themesPath: relativeWorkspacePath(path.join(fixtureDir, 'themes.json')),
    expectedPath: relativeWorkspacePath(path.join(evalRoot, 'expected', `${fixtureId}.json`))
  };
  const fixtureDraft = {
    fixtureId,
    draftId: fixtureId,
    description: '人間確認済みの複数区間expectedでcompositionプロンプト評価を行うfixture。',
    copiedFrom: [
      relativeWorkspacePath(options.reviewPath),
      relativeWorkspacePath(options.targetPath),
      `stt/${options.sourceSttId}/source/word-timestamps.json`
    ],
    copiedAt,
    sourceUri: source.url,
    transcriptPath: 'transcript.json',
    themesPath: 'themes.json',
    selectedThemeId: 'theme_multicut_review_1',
    notes: [
      '評価実行時はruntime/artifactsを読まず、このfixture配下のファイルだけを読む。',
      'expectedCutsは複数の元動画側区間で構成される。',
      '固定テーマは人間が正解区間から逆算して書く。',
      '単一区間expectedとしては扱わない。'
    ]
  };

  const preview: FrozenPreview = {
    kind: 'clip_composition_multicut_fixture_freeze_preview',
    runAt: copiedAt,
    writeFixture: options.writeFixture,
    humanConfirmed: options.humanConfirmed,
    fixtureWriteReady,
    missingHumanInputs: missing,
    reviewPath: relativeWorkspacePath(options.reviewPath),
    targetPath: relativeWorkspacePath(options.targetPath),
    sourceSttId: options.sourceSttId,
    fixtureId,
    plannedWrites,
    fixtureDraft,
    transcriptDraft: transcript,
    themesDraft,
    expectedDraft,
    ...(options.decisionPath ? { humanDecisionPath: relativeWorkspacePath(options.decisionPath) } : {}),
    cutTranscriptSummary,
    productionImpact: {
      writesRuntime: false,
      touchesProductionUi: false,
      touchesProductionApi: false,
      touchesProductionQueue: false,
      touchesDatabase: false
    }
  };

  if (options.writeFixture) {
    await mkdir(fixtureDir, { recursive: true });
    await writeFile(path.join(fixtureDir, 'fixture.json'), `${JSON.stringify(fixtureDraft, null, 2)}\n`, 'utf8');
    await writeFile(path.join(fixtureDir, 'transcript.json'), `${JSON.stringify(transcript, null, 2)}\n`, 'utf8');
    await writeFile(path.join(fixtureDir, 'themes.json'), `${JSON.stringify(themesDraft, null, 2)}\n`, 'utf8');
    await writeFile(path.join(evalRoot, 'expected', `${fixtureId}.json`), `${JSON.stringify(expectedDraft, null, 2)}\n`, 'utf8');
  }

  const outputDir = path.join(evalRoot, 'outputs');
  const reportDir = path.join(evalRoot, 'reports');
  await mkdir(outputDir, { recursive: true });
  await mkdir(reportDir, { recursive: true });
  const baseName = `multicut-fixture-freeze-preview-${fixtureId}-${options.outputId}`;
  const resultPath = path.join(outputDir, `${baseName}.json`);
  const reportPath = path.join(reportDir, `${baseName}.md`);
  await writeFile(resultPath, `${JSON.stringify(preview, null, 2)}\n`, 'utf8');
  await writeFile(reportPath, buildReport(preview, resultPath), 'utf8');

  console.log(`result: ${resultPath}`);
  console.log(`report: ${reportPath}`);
  console.log(`fixture write ready: ${fixtureWriteReady ? 'yes' : 'no'}`);
  console.log(`write fixture: ${options.writeFixture ? 'yes' : 'no'}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
