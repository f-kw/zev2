import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

type CliOptions = {
  fixtureId: string;
  targetFile: string;
  sourceSttId: string;
  themeTitle: string;
  themeSummary: string;
};

type TargetFile = {
  targetId: string;
  title: string;
  clip: {
    id: string;
    url: string;
  };
  sourceCandidates: Array<{
    id: string;
    sttId?: string;
    url: string;
    localVideoPath?: string;
  }>;
  alignment?: {
    resultPath?: string;
    reportPath?: string;
    audioCompareResultPath?: string;
    audioCompareReportPath?: string;
  };
};

type WordTimestampFile = {
  sourceUri?: string;
  words?: Array<{
    text: string;
    startMs: number;
    endMs: number;
    speaker?: string;
    segmentId?: number;
  }>;
};

type AudioCompareResult = {
  comparisons?: Array<{
    sourceId: string;
    sttId: string;
    alignment?: {
      clipCoverage?: number;
      sourceCoverage?: number;
    };
    fullTimeline?: {
      reference?: {
        startMs: number;
        endMs: number;
      };
    };
    speechOnly?: {
      query?: {
        startMs: number;
        endMs: number;
      };
      reference?: {
        startMs: number;
        endMs: number;
      };
      envelope?: {
        maxCorrelation?: number;
        bestOffsetMs?: number;
      };
    };
  }>;
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

  const targetFile = values.get('target')?.trim();
  if (!targetFile) {
    throw new Error('--target evals/clip_composition/stt-targets/IMQYaT_RWRA.json を指定してください');
  }

  const sourceSttId = values.get('sourceSttId')?.trim();
  if (!sourceSttId) {
    throw new Error('--sourceSttId を指定してください');
  }

  return {
    fixtureId: sanitizePathPart(fixtureId),
    targetFile: path.resolve(targetFile),
    sourceSttId: sanitizePathPart(sourceSttId),
    themeTitle: values.get('themeTitle')?.trim() || '笑い声がトルコ行進曲に聞こえる女騎士いじり',
    themeSummary: values.get('themeSummary')?.trim() || '女騎士のように現れた相手への反応と、印象的な笑い声で短尺として成立する場面。'
  };
}

function sanitizePathPart(value: string): string {
  return value.replace(/[^a-zA-Z0-9_-]/g, '_');
}

async function readJson<T>(filePath: string): Promise<T> {
  return JSON.parse(await readFile(filePath, 'utf8')) as T;
}

function resolveWorkspacePath(filePath: string | undefined): string | undefined {
  if (!filePath) {
    return undefined;
  }
  return path.isAbsolute(filePath) ? filePath : path.join(workspaceRoot(), filePath);
}

function sttWordPath(itemId: string): string {
  return path.join(evalRoot, 'stt', itemId, 'source', 'word-timestamps.json');
}

function findSource(target: TargetFile, sourceSttId: string) {
  const source = target.sourceCandidates.find((candidate) => (candidate.sttId ?? candidate.id) === sourceSttId);
  if (!source) {
    throw new Error(`targetにsourceSttIdがありません: ${sourceSttId}`);
  }
  return source;
}

function rangeText(words: Array<{ text: string }>): string {
  return words.map((word) => word.text).join('');
}

function requiredRange(value: { startMs?: number; endMs?: number } | undefined, label: string) {
  if (!value || typeof value.startMs !== 'number' || typeof value.endMs !== 'number' || value.endMs <= value.startMs) {
    throw new Error(`${label} の開始時刻と終了時刻を確認できません`);
  }
  return {
    sourceStartMs: value.startMs,
    sourceEndMs: value.endMs
  };
}

async function main() {
  const options = parseOptions(process.argv.slice(2));
  const target = await readJson<TargetFile>(options.targetFile);
  const source = findSource(target, options.sourceSttId);
  const audioCompareResultPath = resolveWorkspacePath(target.alignment?.audioCompareResultPath);
  if (!audioCompareResultPath || !existsSync(audioCompareResultPath)) {
    throw new Error('音声比較結果が見つかりません');
  }

  const audioCompare = await readJson<AudioCompareResult>(audioCompareResultPath);
  const audioMatch = audioCompare.comparisons?.find((item) => item.sttId === options.sourceSttId || item.sourceId === source.id);
  if (!audioMatch) {
    throw new Error(`音声比較結果にsourceSttIdがありません: ${options.sourceSttId}`);
  }

  const candidateRange = requiredRange(audioMatch.fullTimeline?.reference, '切り抜き全体に対応する候補窓');
  const expectedRange = requiredRange(audioMatch.speechOnly?.reference, '発話部分に対応する期待区間');
  const audioAlignedStartMs = audioMatch.speechOnly?.reference && audioMatch.speechOnly.envelope?.bestOffsetMs !== undefined
    ? audioMatch.speechOnly.reference.startMs + audioMatch.speechOnly.envelope.bestOffsetMs
    : undefined;
  const audioAlignedEndMs = audioAlignedStartMs !== undefined && audioMatch.speechOnly?.query
    ? audioAlignedStartMs + (audioMatch.speechOnly.query.endMs - audioMatch.speechOnly.query.startMs)
    : undefined;

  const wordPayload = await readJson<WordTimestampFile>(sttWordPath(options.sourceSttId));
  const candidateWords = (wordPayload.words ?? [])
    .filter((word) => word.endMs > candidateRange.sourceStartMs && word.startMs < candidateRange.sourceEndMs)
    .sort((left, right) => left.startMs - right.startMs);
  if (candidateWords.length === 0) {
    throw new Error('候補窓に単語時刻がありません');
  }

  const segments = candidateWords.map((word, index) => ({
    id: index + 1,
    startMs: Math.max(word.startMs, candidateRange.sourceStartMs),
    endMs: Math.min(word.endMs, candidateRange.sourceEndMs),
    text: word.text,
    ...(word.speaker ? { speaker: word.speaker } : {})
  })).filter((segment) => segment.endMs >= segment.startMs);
  const candidateSpeechIds = segments.map((segment) => segment.id);
  const representativeSpeechIds = segments
    .filter((segment) => segment.endMs > expectedRange.sourceStartMs && segment.startMs < expectedRange.sourceEndMs)
    .map((segment) => segment.id);
  if (representativeSpeechIds.length === 0) {
    throw new Error('期待区間に対応する発話IDがありません');
  }

  const representativeText = rangeText(segments.filter((segment) => representativeSpeechIds.includes(segment.id)));
  const now = new Date().toISOString();
  const fixtureDir = path.join(evalRoot, 'fixtures', options.fixtureId);
  await mkdir(fixtureDir, { recursive: true });

  const fixture = {
    fixtureId: options.fixtureId,
    draftId: options.fixtureId,
    description: '音声比較の切り抜き全体対応区間を候補窓として持つ、composition評価用fixture。',
    copiedFrom: [
      `stt/${options.sourceSttId}/source/word-timestamps.json`,
      target.alignment?.audioCompareResultPath
    ].filter(Boolean),
    copiedAt: now,
    sourceUri: source.url,
    transcriptPath: 'transcript.json',
    themesPath: 'themes.json',
    selectedThemeId: 'theme_audio_context_1',
    notes: [
      '評価実行時はruntime/artifactsを読まず、このfixture配下のファイルだけを読む。',
      '候補窓は音声比較結果の切り抜き全体対応区間から作る。',
      '期待区間は同じ音声比較結果の発話部分対応区間から作る。',
      '固定テーマは音声確認済みの期待区間から人間が逆算したもの。'
    ]
  };

  const transcript = {
    kind: 'transcript_json',
    mode: 'zev-local-stt',
    sourceUri: source.url,
    sampleSource: {
      title: target.title,
      path: source.localVideoPath,
      sourceRange: candidateRange
    },
    notes: [
      'clip_composition評価環境で、音声比較の切り抜き全体対応区間を候補窓として固定した文字起こし。',
      '代表発話IDは音声比較で確認した期待区間に対応する。'
    ],
    generatedAt: now,
    language: 'ja-JP',
    durationSec: Math.round((candidateRange.sourceEndMs - candidateRange.sourceStartMs) / 1000 * 1000) / 1000,
    segmentCount: segments.length,
    segments,
    speechUnitGroups: [candidateSpeechIds]
  };

  const theme = {
    kind: 'theme_json',
    mode: 'transcript-content-options',
    generatedAt: now,
    sourceUri: source.url,
    themes: [
      {
        id: 'theme_audio_context_1',
        title: options.themeTitle,
        summary: options.themeSummary,
        representativeText,
        representativeSpeechIds,
        relatedSpeechIds: candidateSpeechIds,
        whyItCanBeClipped: '短い発話だけで場面の面白さが伝わり、音声比較で切り抜き元候補と対応しているため。',
        compositionNote: '候補窓の中から、女騎士のように見えた相手への反応と投げている描写が単独で伝わる範囲だけを使う。',
        evidenceRefs: [
          {
            kind: 'time_range',
            refId: 'audio_context_candidate_range',
            meaning: `${source.url} ${candidateRange.sourceStartMs}ms-${candidateRange.sourceEndMs}ms`
          },
          {
            kind: 'time_range',
            refId: 'audio_verified_expected_range',
            meaning: `${source.url} ${expectedRange.sourceStartMs}ms-${expectedRange.sourceEndMs}ms`
          }
        ]
      }
    ]
  };

  const expected = {
    draftId: options.fixtureId,
    fixtureId: options.fixtureId,
    expectedCuts: [
      {
        ...expectedRange,
        reason: '音声比較で切り抜き発話と元配信候補の発話部分が強く一致し、候補窓の中で単独で意味が通る中心区間のため。',
        sourceVideoId: source.id,
        sourceUrl: source.url,
        sourceSttId: options.sourceSttId,
        clipId: target.clip.id,
        clipUrl: target.clip.url,
        transcriptText: representativeText,
        verificationStatus: 'audio_confirmed_visual_pending',
        usableForCompositionPromptEval: true,
        audioVerification: {
          status: 'confirmed',
          method: '切り抜き全体の対応区間を候補窓にし、切り抜き発話部分と元配信候補区間の音量包絡を比較',
          reportPath: target.alignment?.audioCompareReportPath,
          resultPath: target.alignment?.audioCompareResultPath,
          speechEnvelopeCorrelation: audioMatch.speechOnly?.envelope?.maxCorrelation,
          bestOffsetMs: audioMatch.speechOnly?.envelope?.bestOffsetMs,
          comparedClipSpeechStartMs: audioMatch.speechOnly?.query?.startMs,
          comparedClipSpeechEndMs: audioMatch.speechOnly?.query?.endMs,
          comparedSourceCandidateStartMs: expectedRange.sourceStartMs,
          comparedSourceCandidateEndMs: expectedRange.sourceEndMs,
          fullTimelineCandidateStartMs: candidateRange.sourceStartMs,
          fullTimelineCandidateEndMs: candidateRange.sourceEndMs,
          bestAlignedSourceSpeechStartMs: audioAlignedStartMs,
          bestAlignedSourceSpeechEndMs: audioAlignedEndMs,
          note: '候補窓は切り抜き全体比較、期待区間は発話部分比較から作った。'
        },
        sttAlignment: {
          reportPath: target.alignment?.reportPath,
          resultPath: target.alignment?.resultPath,
          clipCoverage: audioMatch.alignment?.clipCoverage,
          sourceCoverage: audioMatch.alignment?.sourceCoverage,
          note: 'STT文字列では再編集候補が最上位だが、元配信候補にも対応語が出ており、音声比較で元配信候補を優先した。'
        },
        visualVerification: {
          status: 'pending',
          note: '音声比較でcompositionプロンプト評価には使える状態。最終データセットQAとしての目視確認は未実施。'
        }
      }
    ]
  };

  await writeFile(path.join(fixtureDir, 'fixture.json'), `${JSON.stringify(fixture, null, 2)}\n`, 'utf8');
  await writeFile(path.join(fixtureDir, 'transcript.json'), `${JSON.stringify(transcript, null, 2)}\n`, 'utf8');
  await writeFile(path.join(fixtureDir, 'themes.json'), `${JSON.stringify(theme, null, 2)}\n`, 'utf8');
  await writeFile(path.join(evalRoot, 'expected', `${options.fixtureId}.json`), `${JSON.stringify(expected, null, 2)}\n`, 'utf8');

  console.log(`fixture: ${fixtureDir}`);
  console.log(`expected: ${path.join(evalRoot, 'expected', `${options.fixtureId}.json`)}`);
  console.log(`candidate: ${candidateRange.sourceStartMs}ms - ${candidateRange.sourceEndMs}ms`);
  console.log(`expected: ${expectedRange.sourceStartMs}ms - ${expectedRange.sourceEndMs}ms`);
  console.log(`segments: ${segments.length}`);
  console.log(`representative speech ids: ${representativeSpeechIds.join(',')}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
