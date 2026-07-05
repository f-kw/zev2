import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

type CliOptions = {
  fixtureId: string;
  targetFile: string;
  sourceSttId: string;
  themeTitle: string;
  themeSummary: string;
  copiedAt?: string;
  dryRun: boolean;
};

type TargetFile = {
  targetId: string;
  title: string;
  clip: {
    id: string;
    url: string;
    durationSec?: number;
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
  }>;
};

type AudioCompareResult = {
  clip?: {
    durationMs?: number;
    speechRange?: {
      startMs: number;
      endMs: number;
      text?: string;
    };
  };
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
      envelope?: {
        maxCorrelation?: number;
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

type SourceRange = {
  sourceStartMs: number;
  sourceEndMs: number;
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
    themeSummary: values.get('themeSummary')?.trim() || '女騎士のように現れた相手への反応と、印象的な笑い声で短尺として成立する場面。',
    copiedAt: values.get('copiedAt')?.trim(),
    dryRun: values.get('dry-run') === 'true'
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

function requiredRange(value: { startMs?: number; endMs?: number } | undefined, label: string): SourceRange {
  if (!value || typeof value.startMs !== 'number' || typeof value.endMs !== 'number' || value.endMs <= value.startMs) {
    throw new Error(`${label} の開始時刻と終了時刻を確認できません`);
  }
  return {
    sourceStartMs: value.startMs,
    sourceEndMs: value.endMs
  };
}

function roundMillis(value: number | undefined): number | undefined {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return undefined;
  }
  return Math.round(value);
}

function dropUndefined<T extends Record<string, unknown>>(value: T): Record<string, unknown> {
  return Object.fromEntries(Object.entries(value).filter(([, item]) => item !== undefined));
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

  const clipRange = requiredRange(audioMatch.fullTimeline?.reference, '切り抜き全体に対応する期待区間');
  const speechAnchorRange = requiredRange(audioMatch.speechOnly?.reference, '発話部分の音声アンカー区間');
  const wordPayload = await readJson<WordTimestampFile>(sttWordPath(options.sourceSttId));
  const candidateWords = (wordPayload.words ?? [])
    .filter((word) => word.endMs > clipRange.sourceStartMs && word.startMs < clipRange.sourceEndMs)
    .sort((left, right) => left.startMs - right.startMs);
  if (candidateWords.length === 0) {
    throw new Error('切り抜き全体対応区間に単語時刻がありません');
  }

  const segments = candidateWords.map((word, index) => ({
    id: index + 1,
    startMs: Math.max(word.startMs, clipRange.sourceStartMs),
    endMs: Math.min(word.endMs, clipRange.sourceEndMs),
    text: word.text,
    ...(word.speaker ? { speaker: word.speaker } : {})
  })).filter((segment) => segment.endMs >= segment.startMs);
  const candidateSpeechIds = segments.map((segment) => segment.id);
  const representativeSpeechIds = segments
    .filter((segment) => segment.endMs > speechAnchorRange.sourceStartMs && segment.startMs < speechAnchorRange.sourceEndMs)
    .map((segment) => segment.id);
  if (representativeSpeechIds.length === 0) {
    throw new Error('発話アンカー区間に対応する発話IDがありません');
  }

  const representativeText = rangeText(segments.filter((segment) => representativeSpeechIds.includes(segment.id)));
  const copiedAt = options.copiedAt ?? new Date().toISOString();
  const clipDurationMs = roundMillis(audioCompare.clip?.durationMs ?? (target.clip.durationSec ? target.clip.durationSec * 1000 : undefined))
    ?? (clipRange.sourceEndMs - clipRange.sourceStartMs);
  const fixtureDir = path.join(evalRoot, 'fixtures', options.fixtureId);

  const fixture = {
    fixtureId: options.fixtureId,
    draftId: options.fixtureId,
    description: '音声比較で切り抜き動画全体の対応区間を期待値にした、実切り抜き区間確認用fixture。',
    copiedFrom: [
      `stt/${options.sourceSttId}/source/word-timestamps.json`,
      target.alignment?.audioCompareResultPath
    ].filter((item): item is string => typeof item === 'string' && item.length > 0),
    copiedAt,
    sourceUri: source.url,
    transcriptPath: 'transcript.json',
    themesPath: 'themes.json',
    selectedThemeId: 'theme_audio_context_1',
    notes: [
      '評価実行時はruntime/artifactsを読まず、このfixture配下のファイルだけを読む。',
      '期待区間は切り抜き動画全体に対応する元配信側区間。',
      '境界は切り抜き内の発話開始位置と元配信側STT一致範囲から音声アンカーとして逆算したもの。',
      '切り抜き全体にはBGMやSEが重なるため、全体波形の相関だけで境界を確定しない。',
      '発話の芯だけを評価するcomposition絞り込み用fixtureとは分けて扱う。'
    ]
  };

  const transcript = {
    kind: 'transcript_json',
    mode: 'zev-local-stt',
    sourceUri: source.url,
    sampleSource: {
      title: target.title,
      path: source.localVideoPath,
      sourceRange: clipRange
    },
    notes: [
      'clip_composition評価環境で、音声比較の切り抜き全体対応区間を固定した文字起こし。',
      '代表発話IDは音声比較で確認した発話アンカー区間に対応する。'
    ],
    generatedAt: copiedAt,
    language: 'ja-JP',
    durationSec: Math.round((clipRange.sourceEndMs - clipRange.sourceStartMs) / 1000 * 1000) / 1000,
    segmentCount: segments.length,
    segments,
    speechUnitGroups: [candidateSpeechIds]
  };

  const theme = {
    kind: 'theme_json',
    mode: 'transcript-content-options',
    generatedAt: copiedAt,
    sourceUri: source.url,
    themes: [
      {
        id: 'theme_audio_context_1',
        title: options.themeTitle,
        summary: options.themeSummary,
        representativeText,
        representativeSpeechIds,
        relatedSpeechIds: candidateSpeechIds,
        whyItCanBeClipped: '切り抜き動画全体と元配信側の発話アンカーが対応しており、短尺として場面の面白さが伝わるため。',
        compositionNote: 'このfixtureでは、発話の芯だけではなく切り抜き動画全体に対応する範囲を評価対象にする。',
        evidenceRefs: [
          {
            kind: 'time_range',
            refId: 'audio_anchor_clip_range',
            meaning: `${source.url} ${clipRange.sourceStartMs}ms-${clipRange.sourceEndMs}ms`
          },
          {
            kind: 'time_range',
            refId: 'audio_verified_speech_anchor_range',
            meaning: `${source.url} ${speechAnchorRange.sourceStartMs}ms-${speechAnchorRange.sourceEndMs}ms`
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
        ...clipRange,
        reason: `切り抜き動画全体${(clipDurationMs / 1000).toFixed(3)}秒を、切り抜き内の発話開始位置と元配信候補のSTT一致範囲を音声アンカーとして元配信側へ対応させた区間のため。`,
        sourceVideoId: source.id,
        sourceUrl: source.url,
        sourceSttId: options.sourceSttId,
        clipId: target.clip.id,
        clipUrl: target.clip.url,
        verificationStatus: 'audio_anchor_confirmed_visual_pending',
        usableForClipLocationEval: true,
        usableForCompositionPromptEval: false,
        audioVerification: dropUndefined({
          status: 'speech_anchor_confirmed',
          method: '切り抜き発話部分と元配信候補区間の音量包絡比較で元配信候補を確認し、切り抜き全体の長さを発話開始位置へ合わせて元配信側の切り抜き全体対応区間を置いた。',
          reportPath: target.alignment?.audioCompareReportPath,
          resultPath: target.alignment?.audioCompareResultPath,
          clipDurationMs,
          clipSpeechStartMs: audioCompare.clip?.speechRange?.startMs ?? audioMatch.speechOnly?.query?.startMs,
          clipSpeechEndMs: audioCompare.clip?.speechRange?.endMs ?? audioMatch.speechOnly?.query?.endMs,
          sourceSpeechAnchorStartMs: speechAnchorRange.sourceStartMs,
          sourceSpeechAnchorEndMs: speechAnchorRange.sourceEndMs,
          speechEnvelopeCorrelation: audioMatch.speechOnly?.envelope?.maxCorrelation,
          speechBestOffsetMs: audioMatch.speechOnly?.envelope?.bestOffsetMs,
          fullTimelineCandidateStartMs: clipRange.sourceStartMs,
          fullTimelineCandidateEndMs: clipRange.sourceEndMs,
          fullTimelineEnvelopeCorrelation: audioMatch.fullTimeline?.envelope?.maxCorrelation,
          sttClipCoverage: audioMatch.alignment?.clipCoverage,
          sttSourceCoverage: audioMatch.alignment?.sourceCoverage,
          note: '切り抜き全体にはBGMやSEが重なるため、全体波形の相関は低い。元配信候補の確認は発話部分の相関を優先する。'
        }),
        visualVerification: {
          status: 'pending',
          note: '音声アンカーでは切り抜き箇所確認に使える状態。最終データセットQAとしての目視確認は未実施。'
        }
      }
    ]
  };

  if (!options.dryRun) {
    await mkdir(fixtureDir, { recursive: true });
    await writeFile(path.join(fixtureDir, 'fixture.json'), `${JSON.stringify(fixture, null, 2)}\n`, 'utf8');
    await writeFile(path.join(fixtureDir, 'transcript.json'), `${JSON.stringify(transcript, null, 2)}\n`, 'utf8');
    await writeFile(path.join(fixtureDir, 'themes.json'), `${JSON.stringify(theme, null, 2)}\n`, 'utf8');
    await writeFile(path.join(evalRoot, 'expected', `${options.fixtureId}.json`), `${JSON.stringify(expected, null, 2)}\n`, 'utf8');
  }

  console.log(`fixture: ${fixtureDir}`);
  console.log(`expected: ${path.join(evalRoot, 'expected', `${options.fixtureId}.json`)}`);
  console.log(`clip range: ${clipRange.sourceStartMs}ms - ${clipRange.sourceEndMs}ms`);
  console.log(`speech anchor: ${speechAnchorRange.sourceStartMs}ms - ${speechAnchorRange.sourceEndMs}ms`);
  console.log(`segments: ${segments.length}`);
  console.log(`representative speech ids: ${representativeSpeechIds.join(',')}`);
  console.log(`write: ${options.dryRun ? 'no' : 'yes'}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
