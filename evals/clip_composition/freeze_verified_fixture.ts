import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

type CliOptions = {
  fixtureId: string;
  targetFile: string;
  sourceSttId: string;
  sourceStartMs: number;
  sourceEndMs: number;
  themeTitle: string;
  themeSummary: string;
  outputReason: string;
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

type AlignmentResult = {
  chunkResults?: Array<{
    sourceMatches?: Array<{
      sourceId: string;
      matches: Array<{
        clipCoverage: number;
        sourceCoverage: number;
      }>;
    }>;
  }>;
};

type AudioCompareResult = {
  comparisons?: Array<{
    sourceId: string;
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
        maxCorrelation: number;
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

  const sourceStartMs = parseRequiredInteger(values.get('sourceStartMs'), '--sourceStartMs');
  const sourceEndMs = parseRequiredInteger(values.get('sourceEndMs'), '--sourceEndMs');
  if (sourceEndMs <= sourceStartMs) {
    throw new Error('--sourceEndMs は --sourceStartMs より後にしてください');
  }

  return {
    fixtureId: sanitizePathPart(fixtureId),
    targetFile: path.resolve(targetFile),
    sourceSttId: sanitizePathPart(sourceSttId),
    sourceStartMs,
    sourceEndMs,
    themeTitle: values.get('themeTitle')?.trim() || '笑い声がトルコ行進曲に聞こえる女騎士いじり',
    themeSummary: values.get('themeSummary')?.trim() || '女騎士のように現れた相手を笑いとともにいじり、印象的な笑い声と一言で成立している短尺向きの場面。',
    outputReason: values.get('reason')?.trim() || '音声比較で切り抜き発話と元配信候補の発話部分が強く一致し、単独で意味が通る範囲として固定する。'
  };
}

function parseRequiredInteger(value: string | undefined, label: string): number {
  const parsed = Number.parseInt(value ?? '', 10);
  if (!Number.isInteger(parsed)) {
    throw new Error(`${label} は整数ミリ秒で指定してください`);
  }
  return parsed;
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

async function main() {
  const options = parseOptions(process.argv.slice(2));
  const target = await readJson<TargetFile>(options.targetFile);
  const source = findSource(target, options.sourceSttId);
  const alignmentResultPath = resolveWorkspacePath(target.alignment?.resultPath);
  const audioCompareResultPath = resolveWorkspacePath(target.alignment?.audioCompareResultPath);
  const alignmentResult = alignmentResultPath && existsSync(alignmentResultPath)
    ? await readJson<AlignmentResult>(alignmentResultPath)
    : undefined;
  const audioCompareResult = audioCompareResultPath && existsSync(audioCompareResultPath)
    ? await readJson<AudioCompareResult>(audioCompareResultPath)
    : undefined;
  const sttMatch = alignmentResult?.chunkResults?.[0]?.sourceMatches
    ?.find((item) => item.sourceId === options.sourceSttId)
    ?.matches[0];
  const audioMatch = audioCompareResult?.comparisons
    ?.find((item) => item.sourceId === source.id)
    ?.speechOnly;
  const audioAlignedStartMs = audioMatch?.reference && audioMatch.envelope?.bestOffsetMs !== undefined
    ? audioMatch.reference.startMs + audioMatch.envelope.bestOffsetMs
    : undefined;
  const audioAlignedEndMs = audioAlignedStartMs !== undefined && audioMatch?.query
    ? audioAlignedStartMs + (audioMatch.query.endMs - audioMatch.query.startMs)
    : undefined;
  const wordPayload = await readJson<WordTimestampFile>(sttWordPath(options.sourceSttId));
  const selectedWords = (wordPayload.words ?? [])
    .filter((word) => word.endMs > options.sourceStartMs && word.startMs < options.sourceEndMs)
    .sort((left, right) => left.startMs - right.startMs);
  if (selectedWords.length === 0) {
    throw new Error('指定区間に単語時刻がありません');
  }

  const segments = selectedWords.map((word, index) => ({
    id: index + 1,
    startMs: word.startMs,
    endMs: word.endMs,
    text: word.text,
    ...(word.speaker ? { speaker: word.speaker } : {})
  }));
  const speechIds = segments.map((segment) => segment.id);
  const transcriptText = rangeText(segments);
  const now = new Date().toISOString();
  const fixtureDir = path.join(evalRoot, 'fixtures', options.fixtureId);
  await mkdir(fixtureDir, { recursive: true });

  const fixture = {
    fixtureId: options.fixtureId,
    draftId: options.fixtureId,
    description: '音声比較で元配信候補と一致した切り抜き区間を、composition評価用に固定したfixture。',
    copiedFrom: [
      `stt/${options.sourceSttId}/source/word-timestamps.json`,
      target.alignment?.resultPath,
      target.alignment?.audioCompareResultPath
    ].filter(Boolean),
    copiedAt: now,
    sourceUri: source.url,
    transcriptPath: 'transcript.json',
    themesPath: 'themes.json',
    selectedThemeId: 'theme_audio_verified_1',
    notes: [
      '評価実行時はruntime/artifactsを読まず、このfixture配下のファイルだけを読む。',
      '固定テーマは音声比較で確認した正解候補区間から逆算したもの。',
      '音声比較でcompositionプロンプト評価には使える状態として凍結している。',
      '目視確認は最終データセットQAとして別工程で行う。'
    ]
  };

  const transcript = {
    kind: 'transcript_json',
    mode: 'zev-local-stt',
    sourceUri: source.url,
    sampleSource: {
      title: target.title,
      path: source.localVideoPath,
      sourceRange: {
        sourceStartMs: options.sourceStartMs,
        sourceEndMs: options.sourceEndMs
      }
    },
    notes: [
      'clip_composition評価環境で、音声比較済み区間だけをfixtureとして固定した文字起こし。',
      '元動画側の単語タイムスタンプを保持し、区間選択評価の時刻基準として扱う。'
    ],
    generatedAt: now,
    language: 'ja-JP',
    durationSec: Math.round((options.sourceEndMs - options.sourceStartMs) / 1000 * 1000) / 1000,
    segmentCount: segments.length,
    segments,
    speechUnitGroups: [speechIds]
  };

  const theme = {
    kind: 'theme_json',
    mode: 'transcript-content-options',
    generatedAt: now,
    sourceUri: source.url,
    themes: [
      {
        id: 'theme_audio_verified_1',
        title: options.themeTitle,
        summary: options.themeSummary,
        representativeText: transcriptText,
        representativeSpeechIds: speechIds,
        relatedSpeechIds: speechIds,
        whyItCanBeClipped: '短い発話だけで場面の面白さが伝わり、音声比較で切り抜き元候補と対応しているため。',
        compositionNote: '女騎士のように見えた相手への反応から、印象的な笑いと投げている描写までを一続きで使う。',
        evidenceRefs: [
          {
            kind: 'time_range',
            refId: 'audio_verified_source_range',
            meaning: `${source.url} ${options.sourceStartMs}ms-${options.sourceEndMs}ms`
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
        sourceStartMs: options.sourceStartMs,
        sourceEndMs: options.sourceEndMs,
        reason: options.outputReason,
        sourceVideoId: source.id,
        sourceUrl: source.url,
        sourceSttId: options.sourceSttId,
        clipId: target.clip.id,
        clipUrl: target.clip.url,
        transcriptText,
        verificationStatus: 'audio_confirmed_visual_pending',
        usableForCompositionPromptEval: true,
        audioVerification: {
          status: 'confirmed',
          method: '切り抜き発話部分と元配信候補区間の音量包絡を比較',
          reportPath: target.alignment?.audioCompareReportPath,
          resultPath: target.alignment?.audioCompareResultPath,
          speechEnvelopeCorrelation: audioMatch?.envelope?.maxCorrelation,
          bestOffsetMs: audioMatch?.envelope?.bestOffsetMs,
          comparedClipSpeechStartMs: audioMatch?.query?.startMs,
          comparedClipSpeechEndMs: audioMatch?.query?.endMs,
          comparedSourceCandidateStartMs: audioMatch?.reference?.startMs,
          comparedSourceCandidateEndMs: audioMatch?.reference?.endMs,
          bestAlignedSourceSpeechStartMs: audioAlignedStartMs,
          bestAlignedSourceSpeechEndMs: audioAlignedEndMs,
          note: '音声比較レポートで元配信候補の発話部分が参照候補中で最も強く一致した。'
        },
        sttAlignment: {
          reportPath: target.alignment?.reportPath,
          resultPath: target.alignment?.resultPath,
          clipCoverage: sttMatch?.clipCoverage,
          sourceCoverage: sttMatch?.sourceCoverage,
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
  console.log(`segments: ${segments.length}`);
  console.log(`text: ${transcriptText}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
