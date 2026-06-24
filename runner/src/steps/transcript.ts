import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { recordValue as recordFrom, type AgentRequest, type Zev2State } from '@zev2/shared';
import type { SttSegment, TranscriptArtifact, TranscriptThemeSeed } from '../workflow-artifacts.js';

export type BuildTranscriptArtifactContext = {
  sttServerUrl: string;
  sttServerTimeoutMs: number;
  sttSamplePath: string;
  fixedTranscriptPath: string;
  useFixedAgentArtifacts: boolean;
  ffmpegCommand: string;
  requestArtifactDir: (request: AgentRequest) => string;
  resolveSourceVideoPath: (state: Zev2State, request: AgentRequest) => string | undefined;
  runCommand: (command: string, args: string[]) => Promise<void>;
};

const ZEV_SPEECH_UNIT_LONG_GAP_MS = 1200;

function buildSpeechUnitGroupsFromSegments(segments: SttSegment[]): number[][] {
  const groups: number[][] = [];
  let currentGroup: number[] = [];
  let previousSegment: SttSegment | undefined;

  const flush = () => {
    if (currentGroup.length === 0) {
      return;
    }

    groups.push(currentGroup);
    currentGroup = [];
  };

  for (const segment of segments) {
    const shouldSplit =
      previousSegment &&
      (
        segment.startMs - previousSegment.endMs > ZEV_SPEECH_UNIT_LONG_GAP_MS ||
        (Boolean(previousSegment.speaker) && Boolean(segment.speaker) && previousSegment.speaker !== segment.speaker)
      );
    if (shouldSplit) {
      flush();
    }

    currentGroup.push(segment.id);
    previousSegment = segment;
    if (/[。！？!?]$/.test(segment.text.trim())) {
      flush();
    }
  }

  flush();
  return groups;
}

function stringArrayFrom(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}

function sourceRangeFrom(value: unknown) {
  const record = recordFrom(value);
  const sourceStartMs = record.sourceStartMs;
  const sourceEndMs = record.sourceEndMs;

  return {
    ...(typeof sourceStartMs === 'number' ? { sourceStartMs } : {}),
    ...(typeof sourceEndMs === 'number' ? { sourceEndMs } : {})
  };
}

function normalizeSampleSource(value: unknown): TranscriptArtifact['sampleSource'] {
  const record = recordFrom(value);
  const sourceRange = sourceRangeFrom(record.sourceRange);

  return {
    ...(typeof record.project === 'string' ? { project: record.project } : {}),
    ...(typeof record.path === 'string' ? { path: record.path } : {}),
    ...(typeof record.title === 'string' ? { title: record.title } : {}),
    ...(Object.keys(sourceRange).length > 0 ? { sourceRange } : {})
  };
}

function normalizeSegments(value: unknown): SttSegment[] {
  if (!Array.isArray(value) || value.length === 0) {
    throw new Error('STTの発話が空です');
  }

  const seenIds = new Set<number>();
  return value.map((item, index) => {
    const record = recordFrom(item);
    const id = record.id;
    const startMs = record.startMs;
    const endMs = record.endMs;
    const text = record.text;
    const speaker = record.speaker;

    if (
      typeof id !== 'number' ||
      !Number.isInteger(id) ||
      id <= 0 ||
      seenIds.has(id) ||
      typeof startMs !== 'number' ||
      typeof endMs !== 'number' ||
      startMs > endMs ||
      typeof text !== 'string' ||
      text.trim().length === 0
    ) {
      throw new Error(`STTの発話 ${index + 1} 件目が不正です`);
    }

    seenIds.add(id);
    return {
      id,
      startMs,
      endMs,
      text,
      ...(typeof speaker === 'string' && speaker.trim() ? { speaker } : {})
    };
  });
}

function normalizeSpeechUnitGroups(value: unknown, segments: SttSegment[]): number[][] {
  const knownIds = new Set(segments.map((segment) => segment.id));
  if (!Array.isArray(value) || value.length === 0) {
    return buildSpeechUnitGroupsFromSegments(segments);
  }

  const groups = value.map((item, groupIndex) => {
    if (!Array.isArray(item) || item.length === 0) {
      throw new Error(`STTの発話まとまり ${groupIndex + 1} 件目が不正です`);
    }

    return item.map((rawId, idIndex) => {
      if (typeof rawId !== 'number' || !Number.isInteger(rawId) || !knownIds.has(rawId)) {
        throw new Error(`STTの発話まとまり ${groupIndex + 1}-${idIndex + 1} が不正です`);
      }

      return rawId;
    });
  });

  return groups;
}

function normalizeThemeSeeds(value: unknown, segments: SttSegment[]): TranscriptThemeSeed[] | undefined {
  if (!Array.isArray(value) || value.length === 0) {
    return undefined;
  }

  const knownIds = new Set(segments.map((segment) => segment.id));
  return value.map((item, index) => {
    const record = recordFrom(item);
    const rawRepresentativeSpeechIds = record.representativeSpeechIds;
    const rawRelatedSpeechIds = record.relatedSpeechIds;
    if (!Array.isArray(rawRepresentativeSpeechIds) || rawRepresentativeSpeechIds.length === 0) {
      throw new Error(`固定テーマ候補 ${index + 1} 件目に代表発話参照がありません`);
    }

    const representativeSpeechIds = rawRepresentativeSpeechIds.map((rawId, idIndex) => {
      if (typeof rawId !== 'number' || !Number.isInteger(rawId) || !knownIds.has(rawId)) {
        throw new Error(`固定テーマ代表発話 ${index + 1}-${idIndex + 1} が不正です`);
      }

      return rawId;
    });
    const relatedSpeechIds = (Array.isArray(rawRelatedSpeechIds) && rawRelatedSpeechIds.length > 0
      ? rawRelatedSpeechIds
      : rawRepresentativeSpeechIds
    ).map((rawId, idIndex) => {
      if (typeof rawId !== 'number' || !Number.isInteger(rawId) || !knownIds.has(rawId)) {
        throw new Error(`固定テーマ関連発話 ${index + 1}-${idIndex + 1} が不正です`);
      }

      return rawId;
    });

    return {
      ...(typeof record.id === 'string' ? { id: record.id } : {}),
      ...(typeof record.title === 'string' ? { title: record.title } : {}),
      ...(typeof record.summary === 'string' ? { summary: record.summary } : {}),
      representativeSpeechIds,
      relatedSpeechIds,
      ...(typeof record.reason === 'string' ? { reason: record.reason } : {}),
      ...(typeof record.compositionNote === 'string' ? { compositionNote: record.compositionNote } : {})
    };
  });
}

async function buildZevSampleTranscript(
  request: AgentRequest,
  context: BuildTranscriptArtifactContext
): Promise<TranscriptArtifact> {
  const raw = await readFile(context.sttSamplePath, 'utf8');
  const payload = recordFrom(JSON.parse(raw));
  const segments = normalizeSegments(payload.segments);
  const speechUnitGroups = normalizeSpeechUnitGroups(payload.speechUnitGroups, segments);
  const lastEndMs = segments[segments.length - 1]?.endMs ?? 0;
  const durationSec = typeof payload.durationSec === 'number' ? payload.durationSec : lastEndMs / 1000;

  return {
    kind: 'transcript_json',
    mode: 'zev-sample-stt',
    sourceUri: request.target.sourceUri,
    sampleSource: normalizeSampleSource(payload.sampleSource),
    notes: stringArrayFrom(payload.notes),
    generatedAt: new Date().toISOString(),
    language: 'ja-JP',
    durationSec,
    segmentCount: segments.length,
    segments,
    speechUnitGroups,
    themeSeeds: normalizeThemeSeeds(payload.themeSeeds, segments)
  };
}

function toSttServerLanguage(language: string): string {
  return language.split('-')[0] || language;
}

function buildSttAbortSignal(context: BuildTranscriptArtifactContext): AbortSignal | undefined {
  if (!Number.isFinite(context.sttServerTimeoutMs) || context.sttServerTimeoutMs <= 0) {
    return undefined;
  }

  return AbortSignal.timeout(context.sttServerTimeoutMs);
}

async function extractAudioForStt(
  request: AgentRequest,
  sourceVideoPath: string,
  context: BuildTranscriptArtifactContext
): Promise<string> {
  const directory = context.requestArtifactDir(request);
  const audioPath = path.join(directory, 'source-audio.flac');
  await mkdir(directory, { recursive: true });
  await context.runCommand(context.ffmpegCommand, [
    '-y',
    '-i',
    sourceVideoPath,
    '-vn',
    '-ac',
    '1',
    '-ar',
    '16000',
    '-sample_fmt',
    's16',
    audioPath
  ]);

  return audioPath;
}

function normalizeLocalSttResponse(payload: unknown, request: AgentRequest): TranscriptArtifact {
  const record = recordFrom(payload);
  const segments = normalizeSegments(record.segments);
  const speechUnitGroups = normalizeSpeechUnitGroups(record.speechUnitGroups, segments);
  const lastEndMs = segments[segments.length - 1]?.endMs ?? 0;
  const durationSec = typeof record.durationSec === 'number' ? record.durationSec : lastEndMs / 1000;
  const language = typeof record.language === 'string' && record.language.trim() ? record.language.trim() : 'ja';

  return {
    kind: 'transcript_json',
    mode: 'zev-local-stt',
    sourceUri: request.target.sourceUri,
    notes: ['ZEVローカルSTTサーバーで文字起こしした結果です。'],
    generatedAt: new Date().toISOString(),
    language,
    durationSec,
    segmentCount: segments.length,
    segments,
    speechUnitGroups
  };
}

async function buildFixedTranscript(
  request: AgentRequest,
  context: BuildTranscriptArtifactContext
): Promise<TranscriptArtifact> {
  const raw = await readFile(context.fixedTranscriptPath, 'utf8');
  const record = recordFrom(JSON.parse(raw));
  const segments = normalizeSegments(record.segments);
  const speechUnitGroups = normalizeSpeechUnitGroups(record.speechUnitGroups, segments);
  const lastEndMs = segments[segments.length - 1]?.endMs ?? 0;
  const durationSec = typeof record.durationSec === 'number' ? record.durationSec : lastEndMs / 1000;
  const language = typeof record.language === 'string' && record.language.trim() ? record.language.trim() : 'ja';

  return {
    kind: 'transcript_json',
    mode: 'zev-sample-stt',
    sourceUri: request.target.sourceUri,
    notes: ['固定済みのSTTデータを使った文字起こしです。'],
    generatedAt: new Date().toISOString(),
    language,
    durationSec,
    segmentCount: segments.length,
    segments,
    speechUnitGroups,
    themeSeeds: normalizeThemeSeeds(record.themeSeeds, segments)
  };
}

async function transcribeWithLocalStt(
  audioPath: string,
  request: AgentRequest,
  context: BuildTranscriptArtifactContext
): Promise<TranscriptArtifact> {
  if (!context.sttServerUrl) {
    throw new Error('ローカルSTTサーバの接続先が設定されていないため、文字起こしを開始できません。ZEV2_STT_SERVER_URL または ZEV_STT_SERVER_URL を設定してください。');
  }

  const fileBuffer = await readFile(audioPath);
  const formData = new FormData();
  formData.append('file', new Blob([new Uint8Array(fileBuffer)], { type: 'audio/flac' }), path.basename(audioPath));
  formData.append('language', toSttServerLanguage(process.env.ZEV2_STT_LANGUAGE ?? 'ja-JP'));

  const transcribeUrl = new URL('/transcribe', context.sttServerUrl).toString();
  const requestInit: RequestInit = {
    method: 'POST',
    headers: {
      accept: 'application/json'
    },
    body: formData
  };
  const abortSignal = buildSttAbortSignal(context);
  if (abortSignal) {
    requestInit.signal = abortSignal;
  }

  let response: Response;
  try {
    response = await fetch(transcribeUrl, requestInit);
  } catch {
    throw new Error(`ローカルSTTサーバへ接続できないため、文字起こしを開始できません。接続先: ${transcribeUrl}`);
  }

  const responseText = await response.text();
  if (!response.ok) {
    throw new Error(`ローカルSTTサーバが文字起こしエラーを返しました (${response.status}): ${responseText}`);
  }

  let responseJson: unknown;
  try {
    responseJson = JSON.parse(responseText) as unknown;
  } catch (error) {
    throw new Error(`STTサーバーの応答JSONを読めません: ${String(error)}`);
  }

  const responseJsonPath = path.join(path.dirname(audioPath), 'source-audio.local-stt-response.json');
  await writeFile(responseJsonPath, `${JSON.stringify(responseJson, null, 2)}\n`, 'utf8');
  return normalizeLocalSttResponse(responseJson, request);
}

function isSampleRequest(request: AgentRequest): boolean {
  return request.target.sourceUri.startsWith('zev-sample://');
}

export async function buildTranscriptArtifact(
  request: AgentRequest,
  state: Zev2State,
  context: BuildTranscriptArtifactContext
): Promise<TranscriptArtifact> {
  if (isSampleRequest(request)) {
    return buildZevSampleTranscript(request, context);
  }

  if (context.useFixedAgentArtifacts) {
    return buildFixedTranscript(request, context);
  }

  const sourcePath = context.resolveSourceVideoPath(state, request);
  if (!sourcePath) {
    throw new Error('文字起こしに使う動画ファイルを取得できません');
  }

  const audioPath = await extractAudioForStt(request, sourcePath, context);
  return transcribeWithLocalStt(audioPath, request, context);
}
