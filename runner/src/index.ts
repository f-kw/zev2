import { spawn } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { GoogleGenAI, type GenerateContentResponse, type Part } from '@google/genai';
import {
  DEFAULT_GEMINI_MODEL,
  type AgentCompletionInput,
  type AgentRequest,
  type AgentRequestType,
  type ControlReference,
  type FileRefAccess,
  type FileRefKind,
  getDryRunMeaningForRequest,
  type Zev2State
} from '@zev2/shared';
import {
  SHORTS_RENDER_TARGET,
  buildDefaultScreenLayoutPlan,
  buildLayoutVideoFilter,
  buildScreenLayoutCandidateSetFromGemini,
  selectScreenLayoutCandidate,
  type ShortsScreenLayoutCandidateSet,
  type ShortsScreenLayoutPlan
} from './screen-layout.js';

interface NextResponse {
  request: AgentRequest | null;
}

interface StateResponse {
  state: Zev2State;
}

interface RunnerOptions {
  apiBaseUrl: string;
  maxSteps: number;
}

type ArtifactInfo = {
  path: string;
  uri: string;
  mimeType: string;
  access: FileRefAccess;
  payload?: unknown;
};

type SourceVideoArtifact = {
  kind: 'source_video';
  mode: 'youtube-download' | 'local-source-reference' | 'remote-source-reference';
  sourceUri: string;
  purpose: string;
  registeredAt: string;
  localPath?: string;
  fileName?: string;
  downloadTool?: string;
};

type SttSegment = {
  id: number;
  startMs: number;
  endMs: number;
  text: string;
  speaker?: string;
};

type TranscriptMode = 'zev-local-stt' | 'zev-sample-stt';

type TranscriptThemeSeed = {
  id?: string;
  title?: string;
  summary?: string;
  representativeSpeechIds: number[];
  relatedSpeechIds: number[];
  reason?: string;
  compositionNote?: string;
};

type TranscriptArtifact = {
  kind: 'transcript_json';
  mode: TranscriptMode;
  sourceUri: string;
  sampleSource?: {
    project?: string;
    path?: string;
    title?: string;
    sourceRange?: {
      sourceStartMs?: number;
      sourceEndMs?: number;
    };
  };
  notes: string[];
  generatedAt: string;
  language: string;
  durationSec: number;
  segmentCount: number;
  segments: SttSegment[];
  speechUnitGroups: number[][];
  themeSeeds?: TranscriptThemeSeed[];
};

type ThemeArtifact = {
  kind: 'theme_json';
  mode: 'gemini-api-theme-options' | 'transcript-theme-options-fallback';
  generatedAt: string;
  sourceUri: string;
  themes: Array<{
    id: string;
    title: string;
    summary: string;
    representativeText: string;
    representativeSpeechIds: number[];
    relatedSpeechIds: number[];
    whyItCanBeClipped: string;
    compositionNote: string;
    evidenceRefs: ControlReference[];
  }>;
};

type ClipCompositionArtifact = {
  kind: 'composition_json';
  mode: 'transcript-multi-part-composition';
  generatedAt: string;
  sourceUri: string;
  selectedThemeId: string;
  title: string;
  themeSummary: string;
  sourceStartMs: number;
  sourceEndMs: number;
  parts: Array<{
    id: string;
    sourceStartMs: number;
    sourceEndMs: number;
    role: string;
    transcriptText: string;
    speechIds: number[];
    connectionNote: string;
  }>;
  assemblyPlan: string;
};

type EditPlanArtifact = {
  kind: 'edit_plan_json';
  mode: 'gemini-api-edit-plan' | 'gemini-api-edit-plan-fixture';
  generatedAt: string;
  selectedThemeId: string;
  title: string;
  hookText: string;
  sourceStartMs: number;
  sourceEndMs: number;
  geminiApiInput: Array<{
    sourceUri: string;
    sourceStartMs: number;
    sourceEndMs: number;
    purpose: string;
  }>;
  renderSegments: Array<{
    sourceStartMs: number;
    sourceEndMs: number;
    role: string;
    caption: string;
    screenLayout: ShortsScreenLayoutPlan;
  }>;
  telopPlan: Array<{
    atMs: number;
    text: string;
    role: string;
  }>;
};

type PatchArtifact = {
  kind: 'patch_json';
  mode: 'zev-inspired-adjustment-fixture';
  generatedAt: string;
  editPlanUri: string;
  changes: Array<{
    target: string;
    action: string;
    reason: string;
  }>;
  renderReady: boolean;
};

const defaultApiBaseUrl = process.env.ZEV2_API_BASE_URL ?? 'http://localhost:8080/api';
const youtubeDownloaderCommand = process.env.ZEV2_YTDLP_BIN ?? 'yt-dlp';
const ffmpegCommand = process.env.ZEV2_FFMPEG_BIN ?? process.env.FFMPEG_BIN ?? 'ffmpeg';
const ffprobeCommand = process.env.ZEV2_FFPROBE_BIN ?? process.env.FFPROBE_BIN ?? defaultFfprobeCommand();
const sttServerUrl = (process.env.ZEV2_STT_SERVER_URL ?? process.env.ZEV_STT_SERVER_URL ?? '').trim();
const sttServerTimeoutMs = Number.parseInt(process.env.ZEV2_STT_SERVER_TIMEOUT_MS ?? process.env.ZEV_STT_SERVER_TIMEOUT_MS ?? '1800000', 10);
const geminiApiKey = (process.env.GEMINI_API_KEY ?? process.env.GOOGLE_API_KEY ?? '').trim();
const defaultGeminiModelName = process.env.ZEV2_GEMINI_MODEL ?? DEFAULT_GEMINI_MODEL;
const vertexProjectId = process.env.GOOGLE_CLOUD_PROJECT || process.env.PROJECT_ID || process.env.GCP_PROJECT_ID || '';
const vertexLocation = process.env.GOOGLE_CLOUD_LOCATION || 'global';
const OUTPUT_FILE_NAME_BY_KIND = {
  source_video: 'source-video.json',
  transcript_json: 'transcript.json',
  theme_json: 'themes.json',
  composition_json: 'clip-composition.json',
  edit_plan_json: 'edit-plan.json',
  patch_json: 'adjustment-patch.json',
  output_video: 'output.mp4'
} satisfies Record<FileRefKind, string>;
const SOURCE_VIDEO_FILE_NAME = 'source-video.mp4';
const SOURCE_VIDEO_METADATA_FILE_NAME = 'source-video.json';
const ZEV_SPEECH_UNIT_LONG_GAP_MS = 1200;
const ZEV_STT_SAMPLE_PATH = path.join(workspaceRoot(), 'runner', 'fixtures', 'zev-stt-sample.json');

function parseOptions(): RunnerOptions {
  const options: RunnerOptions = {
    apiBaseUrl: defaultApiBaseUrl,
    maxSteps: 50
  };

  for (const argument of process.argv.slice(2)) {
    if (argument.startsWith('--api=')) {
      options.apiBaseUrl = argument.slice('--api='.length).replace(/\/$/, '');
    }

    if (argument.startsWith('--max-steps=')) {
      const parsed = Number(argument.slice('--max-steps='.length));
      if (Number.isInteger(parsed) && parsed > 0) {
        options.maxSteps = parsed;
      }
    }
  }

  return options;
}

function workspaceRoot(): string {
  const current = process.cwd();
  if (existsSync(path.join(current, 'pnpm-workspace.yaml'))) {
    return current;
  }

  const parent = path.resolve(current, '..');
  if (existsSync(path.join(parent, 'pnpm-workspace.yaml'))) {
    return parent;
  }

  return current;
}

function defaultFfprobeCommand(): string {
  return ffmpegCommand !== 'ffmpeg' && path.basename(ffmpegCommand) === 'ffmpeg'
    ? path.join(path.dirname(ffmpegCommand), 'ffprobe')
    : 'ffprobe';
}

function runtimeDir(): string {
  return process.env.ZEV2_RUNTIME_DIR
    ? path.resolve(process.env.ZEV2_RUNTIME_DIR)
    : path.join(workspaceRoot(), 'runtime');
}

function artifactRoot(): string {
  return path.join(runtimeDir(), 'artifacts');
}

function sanitizePathPart(value: string): string {
  return value.replace(/[^a-zA-Z0-9_-]/g, '_');
}

function parseCount(label: string): number {
  const match = label.match(/\d+/);
  return match ? Number(match[0]) : 3;
}

function requestArtifactDir(request: AgentRequest): string {
  return path.join(artifactRoot(), sanitizePathPart(request.requestDraftId));
}

function artifactUrl(request: AgentRequest, fileName: string): string {
  return `/api/artifacts/${encodeURIComponent(sanitizePathPart(request.requestDraftId))}/${encodeURIComponent(fileName)}`;
}

async function requestJson<T>(routePath: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${runnerOptions.apiBaseUrl}${routePath}`, {
    ...init,
    headers: {
      'content-type': 'application/json',
      ...(init?.headers ?? {})
    }
  });

  const body = (await response.json()) as T & { error?: string; errors?: string[] };
  if (!response.ok) {
    throw new Error(body.errors?.join(' / ') ?? body.error ?? `API request failed: ${response.status}`);
  }

  return body;
}

async function loadState(): Promise<Zev2State> {
  return requestJson<Zev2State>('/state');
}

function findRequestOutputFileRef(state: Zev2State, requestDraftId: string, type: AgentRequestType) {
  const agentRequest = [...state.agentRequests]
    .reverse()
    .find(
      (request) =>
        request.requestDraftId === requestDraftId &&
        request.type === type &&
        request.status === 'succeeded'
    );
  if (!agentRequest?.result?.fileRefId) {
    return undefined;
  }

  return state.fileRefs.find((fileRef) => fileRef.id === agentRequest.result?.fileRefId);
}

async function readArtifactByUrl<T>(uri: string): Promise<T> {
  const artifactPath = artifactPathByUrl(uri);
  const raw = await readFile(artifactPath, 'utf8');
  return JSON.parse(raw) as T;
}

function artifactPathByUrl(uri: string): string {
  const prefix = '/api/artifacts/';
  if (!uri.startsWith(prefix)) {
    throw new Error(`成果物URIを読めません: ${uri}`);
  }

  const relativePath = uri.slice(prefix.length).split('/').map(decodeURIComponent).join(path.sep);
  const root = path.resolve(artifactRoot());
  const artifactPath = path.resolve(root, relativePath);
  if (!artifactPath.startsWith(`${root}${path.sep}`)) {
    throw new Error(`成果物URIの保存先が不正です: ${uri}`);
  }

  return artifactPath;
}

async function writeJsonArtifact(request: AgentRequest, kind: FileRefKind, payload: unknown): Promise<ArtifactInfo> {
  const fileName = OUTPUT_FILE_NAME_BY_KIND[kind];
  const directory = requestArtifactDir(request);
  const artifactPath = path.join(directory, fileName);
  await mkdir(directory, { recursive: true });
  await writeFile(artifactPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');

  return {
    path: artifactPath,
    uri: artifactUrl(request, fileName),
    mimeType: 'application/json',
    access: 'internal',
    payload
  };
}

async function writeTextArtifact(
  request: AgentRequest,
  fileName: string,
  content: string,
  mimeType: string
): Promise<ArtifactInfo> {
  const directory = requestArtifactDir(request);
  const artifactPath = path.join(directory, fileName);
  await mkdir(directory, { recursive: true });
  await writeFile(artifactPath, content, 'utf8');

  return {
    path: artifactPath,
    uri: artifactUrl(request, fileName),
    mimeType,
    access: 'internal'
  };
}

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

function recordFrom(value: unknown): Record<string, unknown> {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }

  return {};
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
    throw new Error('ZEVサンプルSTTの発話が空です');
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
      throw new Error(`ZEVサンプルSTTの発話 ${index + 1} 件目が不正です`);
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
      throw new Error(`ZEVサンプルSTTの発話まとまり ${groupIndex + 1} 件目が不正です`);
    }

    return item.map((rawId, idIndex) => {
      if (typeof rawId !== 'number' || !Number.isInteger(rawId) || !knownIds.has(rawId)) {
        throw new Error(`ZEVサンプルSTTの発話まとまり ${groupIndex + 1}-${idIndex + 1} が不正です`);
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
      throw new Error(`ZEVサンプルSTTのテーマ候補 ${index + 1} 件目に代表発話参照がありません`);
    }

    const representativeSpeechIds = rawRepresentativeSpeechIds.map((rawId, idIndex) => {
      if (typeof rawId !== 'number' || !Number.isInteger(rawId) || !knownIds.has(rawId)) {
        throw new Error(`ZEVサンプルSTTのテーマ代表発話 ${index + 1}-${idIndex + 1} が不正です`);
      }

      return rawId;
    });
    const relatedSpeechIds = (Array.isArray(rawRelatedSpeechIds) && rawRelatedSpeechIds.length > 0
      ? rawRelatedSpeechIds
      : rawRepresentativeSpeechIds
    ).map((rawId, idIndex) => {
      if (typeof rawId !== 'number' || !Number.isInteger(rawId) || !knownIds.has(rawId)) {
        throw new Error(`ZEVサンプルSTTのテーマ関連発話 ${index + 1}-${idIndex + 1} が不正です`);
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

async function buildZevSampleTranscript(request: AgentRequest): Promise<TranscriptArtifact> {
  const raw = await readFile(ZEV_STT_SAMPLE_PATH, 'utf8');
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

function buildSttAbortSignal(): AbortSignal | undefined {
  if (!Number.isFinite(sttServerTimeoutMs) || sttServerTimeoutMs <= 0) {
    return undefined;
  }

  return AbortSignal.timeout(sttServerTimeoutMs);
}

async function extractAudioForStt(request: AgentRequest, sourceVideoPath: string): Promise<string> {
  const directory = requestArtifactDir(request);
  const audioPath = path.join(directory, 'source-audio.flac');
  await mkdir(directory, { recursive: true });
  await runCommand(ffmpegCommand, [
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

async function transcribeWithLocalStt(audioPath: string, request: AgentRequest): Promise<TranscriptArtifact> {
  if (!sttServerUrl) {
    throw new Error('ローカルSTTサーバの接続先が設定されていないため、文字起こしを開始できません。ZEV2_STT_SERVER_URL または ZEV_STT_SERVER_URL を設定してください。');
  }

  const fileBuffer = await readFile(audioPath);
  const formData = new FormData();
  formData.append('file', new Blob([new Uint8Array(fileBuffer)], { type: 'audio/flac' }), path.basename(audioPath));
  formData.append('language', toSttServerLanguage(process.env.ZEV2_STT_LANGUAGE ?? 'ja-JP'));

  const transcribeUrl = new URL('/transcribe', sttServerUrl).toString();
  const requestInit: RequestInit = {
    method: 'POST',
    headers: {
      accept: 'application/json'
    },
    body: formData
  };
  const abortSignal = buildSttAbortSignal();
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

async function buildTranscript(request: AgentRequest, state: Zev2State): Promise<TranscriptArtifact> {
  if (request.target.sourceUri.startsWith('zev-sample://')) {
    return buildZevSampleTranscript(request);
  }

  const sourceVideoPath = resolveSourceVideoPath(state, request);
  if (!sourceVideoPath) {
    throw new Error('文字起こしに使う動画ファイルを取得できません。YouTube URLは動画取り込み工程で取得し、ローカル動画は実在するパスを指定してください。');
  }

  const audioPath = await extractAudioForStt(request, sourceVideoPath);
  return transcribeWithLocalStt(audioPath, request);
}

function segmentTextByIds(transcript: TranscriptArtifact, ids: number[]): string {
  const idSet = new Set(ids);
  return transcript.segments
    .filter((segment) => idSet.has(segment.id))
    .map((segment) => segment.text)
    .join('');
}

function uniqueSpeechIds(ids: number[]): number[] {
  return [...new Set(ids)];
}

function speechRange(transcript: TranscriptArtifact, speechIds: number[]): { sourceStartMs: number; sourceEndMs: number } {
  const segments = transcript.segments.filter((segment) => speechIds.includes(segment.id));
  const first = segments[0] ?? transcript.segments[0];
  const last = segments[segments.length - 1] ?? first;

  return {
    sourceStartMs: first.startMs,
    sourceEndMs: last.endMs
  };
}

function buildFallbackThemeOptions(transcript: TranscriptArtifact, request: AgentRequest): ThemeArtifact {
  const requestedCount = parseCount(request.constraints.themeCountLabel);
  const seeds: TranscriptThemeSeed[] = transcript.themeSeeds?.length
    ? transcript.themeSeeds
    : (transcript.speechUnitGroups.length > 0
        ? transcript.speechUnitGroups
        : transcript.segments.map((segment) => [segment.id])
      ).map((speechIds) => ({ representativeSpeechIds: speechIds, relatedSpeechIds: speechIds }));
  const themes = seeds.slice(0, requestedCount).map((seed, index) => {
    const themeNumber = index + 1;
    const representativeSpeechIds = uniqueSpeechIds(seed.representativeSpeechIds);
    const relatedSpeechIds = uniqueSpeechIds(seed.relatedSpeechIds);
    const representativeText = segmentTextByIds(transcript, representativeSpeechIds);
    const summary = seed.summary ?? representativeText.slice(0, 48);

    return {
      id: seed.id ?? `theme_${themeNumber}`,
      title: seed.title ?? `テーマ${themeNumber}: ${summary.slice(0, 18)}`,
      summary,
      representativeText,
      representativeSpeechIds,
      relatedSpeechIds,
      whyItCanBeClipped: seed.reason ?? '文字起こし上で内容のまとまりがあり、切り抜きたいテーマとして選べるため。',
      compositionNote: seed.compositionNote ?? '選ばれた後に、関係する発話を複数集めて構成案にします。',
      evidenceRefs: representativeSpeechIds.map((speechId) => ({
        kind: 'time_range' as const,
        refId: `speech_${speechId}`,
        meaning: `代表発話 ${speechId}`
      }))
    };
  });

  return {
    kind: 'theme_json',
    mode: 'transcript-theme-options-fallback',
    generatedAt: new Date().toISOString(),
    sourceUri: request.target.sourceUri,
    themes
  };
}

function buildTranscriptLinesForThemePrompt(transcript: TranscriptArtifact): string {
  const groups = transcript.speechUnitGroups.length > 0
    ? transcript.speechUnitGroups
    : transcript.segments.map((segment) => [segment.id]);

  return groups
    .map((speechIds, index) => {
      const range = speechRange(transcript, speechIds);
      return [
        `発話まとまり${index + 1}`,
        `発話ID: ${speechIds.join(', ')}`,
        `時間: ${millisecondsToSeconds(range.sourceStartMs)}秒 - ${millisecondsToSeconds(range.sourceEndMs)}秒`,
        `本文: ${segmentTextByIds(transcript, speechIds)}`
      ].join('\n');
    })
    .join('\n\n');
}

function buildGeminiThemePrompt(transcript: TranscriptArtifact, request: AgentRequest): string {
  const requestedCount = parseCount(request.constraints.themeCountLabel);

  return [
    '文字起こしを分析し、ショート動画として切り抜けそうなテーマ候補を作ってください。',
    'テーマ候補はユーザーが選ぶ内容単位です。構成案、テロップ案、動画断片名ではありません。',
    '音声、テンション、間、笑い、画面変化、映像の見栄えはここでは使いません。発話内容だけで判断してください。',
    'テーマが選ばれた後に同じ文字起こしを読み直して複数箇所をつなぐため、代表発話IDと関連発話IDを必ず返してください。',
    '発話IDは下の文字起こしに存在するものだけを使ってください。',
    'JSONだけを返してください。',
    '',
    '返すJSON:',
    '{',
    '  "themes": [',
    '    {',
    '      "id": "theme_1",',
    '      "title": "ユーザーが選びやすい短いテーマ名",',
    '      "summary": "このテーマで何を見せる動画になるか",',
    '      "representativeSpeechIds": [1],',
    '      "relatedSpeechIds": [1, 2, 3],',
    '      "reason": "切り抜きテーマとして成立する理由",',
    '      "compositionNote": "最終的にどんな動画になるか"',
    '    }',
    '  ]',
    '}',
    '',
    `必要な候補数: ${requestedCount}`,
    `依頼目的: ${request.input.purpose}`,
    `希望尺: ${request.constraints.durationLabel}`,
    '',
    '文字起こし:',
    buildTranscriptLinesForThemePrompt(transcript)
  ].join('\n');
}

type GeminiThemeResponse = {
  themes?: unknown;
};

function speechIdsFromGemini(value: unknown, knownIds: Set<number>): number[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return uniqueSpeechIds(
    value.filter(
      (item): item is number =>
        typeof item === 'number' &&
        Number.isInteger(item) &&
        knownIds.has(item)
    )
  );
}

function applyGeminiThemeResponse(
  transcript: TranscriptArtifact,
  request: AgentRequest,
  response: GeminiThemeResponse
): ThemeArtifact | undefined {
  if (!Array.isArray(response.themes)) {
    return undefined;
  }

  const requestedCount = parseCount(request.constraints.themeCountLabel);
  const knownIds = new Set(transcript.segments.map((segment) => segment.id));
  const themes: ThemeArtifact['themes'] = [];
  for (const [index, rawTheme] of response.themes.entries()) {
    const theme = recordFrom(rawTheme);
    const representativeSpeechIds = speechIdsFromGemini(theme.representativeSpeechIds, knownIds);
    const relatedSpeechIds = speechIdsFromGemini(theme.relatedSpeechIds, knownIds);
    const normalizedRelatedSpeechIds = relatedSpeechIds.length > 0 ? relatedSpeechIds : representativeSpeechIds;
    if (representativeSpeechIds.length === 0 || normalizedRelatedSpeechIds.length === 0) {
      continue;
    }

    const title = typeof theme.title === 'string' && theme.title.trim()
      ? theme.title.trim()
      : `テーマ ${index + 1}`;
    const representativeText = segmentTextByIds(transcript, representativeSpeechIds);
    const summary = typeof theme.summary === 'string' && theme.summary.trim()
      ? theme.summary.trim()
      : representativeText;

    themes.push({
      id: typeof theme.id === 'string' && theme.id.trim()
        ? sanitizePathPart(theme.id.trim())
        : `theme_${index + 1}`,
      title,
      summary,
      representativeText,
      representativeSpeechIds,
      relatedSpeechIds: normalizedRelatedSpeechIds,
      whyItCanBeClipped: typeof theme.reason === 'string' && theme.reason.trim()
        ? theme.reason.trim()
        : '文字起こし上で内容のまとまりがあり、切り抜きテーマとして選べるため。',
      compositionNote: typeof theme.compositionNote === 'string' && theme.compositionNote.trim()
        ? theme.compositionNote.trim()
        : summary,
      evidenceRefs: representativeSpeechIds.map((speechId): ControlReference => ({
        kind: 'time_range',
        refId: `speech_${speechId}`,
        meaning: `代表発話 ${speechId}`
      }))
    });

    if (themes.length >= requestedCount) {
      break;
    }
  }

  if (themes.length === 0) {
    return undefined;
  }

  return {
    kind: 'theme_json',
    mode: 'gemini-api-theme-options',
    generatedAt: new Date().toISOString(),
    sourceUri: request.target.sourceUri,
    themes
  };
}

async function callGeminiThemeApi(
  request: AgentRequest,
  transcript: TranscriptArtifact
): Promise<ThemeArtifact | undefined> {
  if (!geminiApiKey && !vertexProjectId) {
    return undefined;
  }

  const responseJson = await generateGeminiJsonContent(
    request,
    [{ text: buildGeminiThemePrompt(transcript, request) }],
    'gemini-theme-options-response.json',
    'テーマ候補作成'
  );
  const themeText = extractGeminiResponseText(responseJson);
  const themeResponse = parseGeminiJsonText(themeText, 'Gemini APIのテーマ候補') as GeminiThemeResponse;
  return applyGeminiThemeResponse(transcript, request, themeResponse);
}

async function buildThemeOptionsArtifact(transcript: TranscriptArtifact, request: AgentRequest): Promise<ThemeArtifact> {
  const geminiThemes = await callGeminiThemeApi(request, transcript);
  return geminiThemes ?? buildFallbackThemeOptions(transcript, request);
}

function selectedThemeIdFromState(state: Zev2State, requestDraftId: string): string {
  const review = [...state.controlReviewItems]
    .reverse()
    .find(
      (item) =>
        item.requestDraftId === requestDraftId &&
        item.kind === 'theme_selection' &&
        item.status === 'approved'
    );
  const action = state.humanReviewActions.find((item) => item.id === review?.resolvedByActionId);
  if (!action?.selectedOptionId) {
    throw new Error('切り抜きテーマが選ばれていないため構成案を作れません');
  }

  return action.selectedOptionId;
}

function buildClipComposition(themes: ThemeArtifact, transcript: TranscriptArtifact, selectedThemeId: string): ClipCompositionArtifact {
  const selectedTheme = themes.themes.find((theme) => theme.id === selectedThemeId);
  if (!selectedTheme) {
    throw new Error('選ばれたテーマがテーマ候補にありません');
  }

  const groupedSpeechIds = transcript.speechUnitGroups.length > 0
    ? transcript.speechUnitGroups
    : selectedTheme.relatedSpeechIds.map((speechId) => [speechId]);
  const relatedIds = new Set(selectedTheme.relatedSpeechIds);
  const relatedGroups = groupedSpeechIds.filter((group) => group.some((speechId) => relatedIds.has(speechId)));
  const groups = relatedGroups.length > 0 ? relatedGroups : [selectedTheme.relatedSpeechIds];
  const parts = groups.map((speechIds, index) => {
    const partSpeechIds = uniqueSpeechIds(speechIds);
    const range = speechRange(transcript, partSpeechIds);
    return {
      id: `part_${index + 1}`,
      sourceStartMs: range.sourceStartMs,
      sourceEndMs: range.sourceEndMs,
      role: index === 0 ? '導入' : index === groups.length - 1 ? '結論' : '展開',
      transcriptText: segmentTextByIds(transcript, partSpeechIds),
      speechIds: partSpeechIds,
      connectionNote: index === 0 ? 'テーマを見せる入口として使う' : '前の発話を受けて話の流れをつなぐ'
    };
  });
  const ranges = parts.map((part) => ({ sourceStartMs: part.sourceStartMs, sourceEndMs: part.sourceEndMs }));
  const firstStartMs = Math.min(...ranges.map((range) => range.sourceStartMs));
  const lastEndMs = Math.max(...ranges.map((range) => range.sourceEndMs));

  return {
    kind: 'composition_json',
    mode: 'transcript-multi-part-composition',
    generatedAt: new Date().toISOString(),
    sourceUri: themes.sourceUri,
    selectedThemeId: selectedTheme.id,
    title: selectedTheme.title,
    themeSummary: selectedTheme.summary,
    sourceStartMs: firstStartMs,
    sourceEndMs: lastEndMs,
    parts,
    assemblyPlan: selectedTheme.compositionNote
  };
}

function buildFixtureEditPlan(composition: ClipCompositionArtifact): EditPlanArtifact {
  if (composition.parts.length === 0) {
    throw new Error('編集案に使える構成箇所がありません');
  }

  const firstPart = composition.parts[0];
  const lastPart = composition.parts[composition.parts.length - 1] ?? firstPart;
  return {
    kind: 'edit_plan_json',
    mode: 'gemini-api-edit-plan-fixture',
    generatedAt: new Date().toISOString(),
    selectedThemeId: composition.selectedThemeId,
    title: composition.title,
    hookText: firstPart.transcriptText.slice(0, 32),
    sourceStartMs: firstPart.sourceStartMs,
    sourceEndMs: lastPart.sourceEndMs,
    geminiApiInput: composition.parts.map((part) => ({
      sourceUri: composition.sourceUri,
      sourceStartMs: part.sourceStartMs,
      sourceEndMs: part.sourceEndMs,
      purpose: `${part.role}: ${part.connectionNote}`
    })),
    renderSegments: composition.parts.map((part) => ({
      sourceStartMs: part.sourceStartMs,
      sourceEndMs: part.sourceEndMs,
      role: part.role,
      caption: part.transcriptText.slice(0, 32),
      screenLayout: buildDefaultScreenLayoutPlan()
    })),
    telopPlan: composition.parts.map((part, index) => ({
      atMs: index === 0
        ? 0
        : composition.parts
            .slice(0, index)
            .reduce((total, item) => total + Math.max(1, item.sourceEndMs - item.sourceStartMs), 0),
      text: part.transcriptText.slice(0, 32),
      role: part.role
    }))
  };
}

type GeminiEditPlanResponse = {
  title?: unknown;
  hookText?: unknown;
  renderSegments?: unknown;
  telopPlan?: unknown;
};

type GeminiCandidateSelectionResponse = {
  renderSegments?: unknown;
};

type CandidateEditPlanArtifact = {
  editPlan: EditPlanArtifact;
  candidateSets: ShortsScreenLayoutCandidateSet[];
};

type GeminiVideoClipInput = {
  sourceStartMs: number;
  sourceEndMs: number;
  role: string;
  transcriptText: string;
  path: string;
  data: string;
};

async function buildGeminiVideoClipInputs(
  request: AgentRequest,
  composition: ClipCompositionArtifact,
  state: Zev2State
): Promise<GeminiVideoClipInput[]> {
  const sourcePath = resolveSourceVideoPath(state, request);
  if (!sourcePath) {
    return [];
  }

  const directory = requestArtifactDir(request);
  await mkdir(directory, { recursive: true });

  const clips: GeminiVideoClipInput[] = [];
  for (const [index, part] of composition.parts.entries()) {
    const durationMs = Math.max(1, part.sourceEndMs - part.sourceStartMs);
    const clipPath = path.join(directory, `gemini-part-${index + 1}.mp4`);
    await runCommand(ffmpegCommand, [
      '-y',
      '-ss',
      millisecondsToSeconds(part.sourceStartMs),
      '-t',
      millisecondsToSeconds(durationMs),
      '-i',
      sourcePath,
      '-map',
      '0:v:0',
      '-map',
      '0:a?',
      '-vf',
      'scale=640:-2',
      '-c:v',
      'libx264',
      '-pix_fmt',
      'yuv420p',
      '-c:a',
      'aac',
      '-shortest',
      '-movflags',
      '+faststart',
      clipPath
    ]);

    const data = (await readFile(clipPath)).toString('base64');
    clips.push({
      sourceStartMs: part.sourceStartMs,
      sourceEndMs: part.sourceEndMs,
      role: part.role,
      transcriptText: part.transcriptText,
      path: clipPath,
      data
    });
  }

  return clips;
}

function buildGeminiEditPlanPrompt(composition: ClipCompositionArtifact): string {
  const partsText = composition.parts
    .map((part, index) => {
      return [
        `断片${index + 1}`,
        `役割: ${part.role}`,
        `元動画時間: ${millisecondsToSeconds(part.sourceStartMs)}秒 - ${millisecondsToSeconds(part.sourceEndMs)}秒`,
        `文字起こし: ${part.transcriptText}`
      ].join('\n');
    })
    .join('\n\n');

  return [
    '複数の動画断片と文字起こしを見て、ショート動画の演出に必要な検出結果を作ってください。',
    '候補選定は済んでいます。断片の順番と時間範囲は変えず、各断片の画面パターン、表示対象の検出範囲、テロップを決めてください。',
    '最終的な切り出し位置はAIエージェント側で候補化します。ここでは候補選択やcrop座標を返さないでください。',
    '画面パターンと検出範囲は添付動画を直接見て判断してください。文字起こしだけを根拠にした推測は禁止です。',
    'JSONだけを返してください。',
    '',
    '画面枠:',
    '- speaker_only: 話者1人だけ。話者を縦長の画面全体に表示する。',
    '- screen_speaker: 画面と話者。上に画面、下に話者を横長の2枠で表示する。',
    '- speaker_pair: 話者2人。話者1を上、話者2を下に横長の2枠で表示する。',
    '',
    'detections:',
    '- 座標は [ymin, xmin, ymax, xmax] の順で、0..1000 の整数にしてください。',
    '- screen は、その断片で見えている画面全体です。',
    '- speaker / speaker1 / speaker2 は face と body を返してください。',
    '- face は顔全体、body は見えている人物全体です。face は必ず body の内側に収めてください。',
    '- speaker_only では speaker を返してください。',
    '- screen_speaker では screen と speaker を返してください。',
    '- speaker_pair では speaker1 と speaker2 を返してください。',
    '- final crop と selectedCandidateId は返さないでください。AIエージェントが検出結果から表示候補を作ります。',
    '',
    '返すJSON:',
    '{',
    '  "title": "動画の完成イメージを表す短いタイトル",',
    '  "hookText": "冒頭で見せる短い文言",',
    '  "renderSegments": [',
    '    {',
    '      "role": "断片の役割",',
    '      "caption": "断片に出す短いテロップ",',
    '      "screenLayoutId": "screen_speaker",',
    '      "detections": {',
    '        "screen": [0, 0, 1000, 1000],',
    '        "speaker": { "face": [0, 0, 300, 300], "body": [0, 0, 1000, 1000] }',
    '      }',
    '    }',
    '  ],',
    '  "telopPlan": [',
    '    { "atMs": 0, "text": "表示するテロップ", "role": "表示意図" }',
    '  ]',
    '}',
    '',
    `テーマ: ${composition.title}`,
    `完成イメージ: ${composition.themeSummary}`,
    '',
    partsText
  ].join('\n');
}

async function generateGeminiJsonContent(
  request: AgentRequest,
  parts: Part[],
  responseFileName: string,
  actionLabel: string
): Promise<unknown> {
  if (!geminiApiKey && !vertexProjectId) {
    throw new Error(`${actionLabel}に使うGemini APIの接続情報がありません`);
  }

  const client = geminiApiKey
    ? new GoogleGenAI({
        apiKey: geminiApiKey
      })
    : new GoogleGenAI({
        vertexai: true,
        project: vertexProjectId,
        location: vertexLocation
      });

  let responseJson: GenerateContentResponse;
  try {
    responseJson = await client.models.generateContent({
      model: geminiModelNameForRequest(request),
      contents: parts,
      config: {
        responseMimeType: 'application/json'
      }
    });
  } catch (error) {
    throw new Error(`Gemini APIが${actionLabel}エラーを返しました: ${String(error)}`);
  }

  await writeTextArtifact(request, responseFileName, `${JSON.stringify(responseJson, null, 2)}\n`, 'application/json');
  return responseJson;
}

function geminiModelNameForRequest(request: AgentRequest): string {
  return request.input.settings.geminiModelName.trim() || defaultGeminiModelName;
}

function extractGeminiResponseText(responseJson: unknown): string {
  const directText = (responseJson as { text?: unknown } | undefined)?.text;
  if (typeof directText === 'string' && directText.trim()) {
    return directText.trim();
  }

  const response = recordFrom(responseJson);
  const candidates = response.candidates;
  if (!Array.isArray(candidates) || candidates.length === 0) {
    throw new Error('Gemini APIの応答に候補がありません');
  }

  const firstCandidate = recordFrom(candidates[0]);
  const content = recordFrom(firstCandidate.content);
  const parts = content.parts;
  if (!Array.isArray(parts)) {
    throw new Error('Gemini APIの応答本文を読めません');
  }

  const text = parts
    .map((part) => recordFrom(part).text)
    .filter((item): item is string => typeof item === 'string')
    .join('')
    .trim();
  if (!text) {
    throw new Error('Gemini APIの応答本文が空です');
  }

  return text;
}

function parseGeminiJsonText(text: string, label: string): unknown {
  try {
    return JSON.parse(text) as unknown;
  } catch {
    const fenced = text.trim().match(/^```(?:json)?\s*([\s\S]*?)\s*```$/);
    if (fenced?.[1]) {
      return JSON.parse(fenced[1]) as unknown;
    }

    throw new Error(`${label}のJSON本文を読めません`);
  }
}

function applyGeminiEditPlanResponse(basePlan: EditPlanArtifact, response: GeminiEditPlanResponse): CandidateEditPlanArtifact {
  const renderSegmentRecords = Array.isArray(response.renderSegments)
    ? response.renderSegments.map(recordFrom)
    : [];
  const telopRecords = Array.isArray(response.telopPlan)
    ? response.telopPlan.map(recordFrom)
    : [];

  if (renderSegmentRecords.length !== basePlan.renderSegments.length) {
    throw new Error('Gemini APIの演出案で、動画断片ごとの画面表示計画が不足しています');
  }

  const candidateSets: ShortsScreenLayoutCandidateSet[] = [];
  const renderSegments = basePlan.renderSegments.map((segment, index) => {
    const proposed = renderSegmentRecords[index] ?? {};
    const candidateSet = buildScreenLayoutCandidateSetFromGemini(proposed, `renderSegments[${index + 1}]`);
    candidateSets.push(candidateSet);
    return {
      ...segment,
      role: typeof proposed.role === 'string' && proposed.role.trim() ? proposed.role.trim() : segment.role,
      caption: typeof proposed.caption === 'string' && proposed.caption.trim() ? proposed.caption.trim().slice(0, 48) : segment.caption,
      screenLayout: selectScreenLayoutCandidate(candidateSet, undefined, `renderSegments[${index + 1}]`)
    };
  });

  const telopPlan = telopRecords.length > 0
    ? telopRecords.map((record, index) => ({
        atMs: typeof record.atMs === 'number' && Number.isFinite(record.atMs) ? Math.max(0, Math.round(record.atMs)) : (basePlan.telopPlan[index]?.atMs ?? 0),
        text: typeof record.text === 'string' && record.text.trim() ? record.text.trim().slice(0, 48) : (basePlan.telopPlan[index]?.text ?? basePlan.hookText),
        role: typeof record.role === 'string' && record.role.trim() ? record.role.trim() : (basePlan.telopPlan[index]?.role ?? 'テロップ')
      }))
    : basePlan.telopPlan;

  return {
    editPlan: {
      ...basePlan,
      mode: 'gemini-api-edit-plan',
      title: typeof response.title === 'string' && response.title.trim() ? response.title.trim() : basePlan.title,
      hookText: typeof response.hookText === 'string' && response.hookText.trim() ? response.hookText.trim().slice(0, 48) : basePlan.hookText,
      renderSegments,
      telopPlan
    },
    candidateSets
  };
}

type CandidatePreviewInput = {
  segmentIndex: number;
  candidateId: string;
  candidateLabel: string;
  candidateReason: string;
  path: string;
  data: string;
};

async function buildCandidatePreviewInputs(
  request: AgentRequest,
  clips: GeminiVideoClipInput[],
  candidateDraft: CandidateEditPlanArtifact
): Promise<CandidatePreviewInput[]> {
  const directory = requestArtifactDir(request);
  await mkdir(directory, { recursive: true });

  const previews: CandidatePreviewInput[] = [];
  for (const [segmentIndex, candidateSet] of candidateDraft.candidateSets.entries()) {
    const clip = clips[segmentIndex];
    if (!clip) {
      throw new Error(`表示候補プレビューに使う動画断片${segmentIndex + 1}がありません`);
    }

    const clipDimensions = await probeVideoDimensions(clip.path);
    const midpointSeconds = Math.max(0, (clip.sourceEndMs - clip.sourceStartMs) / 2000);
    for (const candidate of candidateSet.candidates) {
      const screenLayout = selectScreenLayoutCandidate(
        candidateSet,
        candidate.id,
        `renderSegments[${segmentIndex + 1}].${candidate.id}`
      );
      const outputLabel = `candidate_${segmentIndex + 1}_${candidate.id.replace(/[^a-zA-Z0-9_]/g, '_')}`;
      const filter = buildLayoutVideoFilter({
        inputLabel: '[0:v]',
        outputLabel,
        sourceWidth: clipDimensions.width,
        sourceHeight: clipDimensions.height,
        durationSeconds: 0.2,
        screenLayout
      });
      const previewPath = path.join(directory, `candidate-preview-${segmentIndex + 1}-${candidate.id}.jpg`);
      await runCommand(ffmpegCommand, [
        '-y',
        '-ss',
        midpointSeconds.toFixed(3),
        '-i',
        clip.path,
        '-filter_complex',
        filter,
        '-map',
        `[${outputLabel}]`,
        '-frames:v',
        '1',
        '-q:v',
        '5',
        '-update',
        '1',
        previewPath
      ]);

      previews.push({
        segmentIndex,
        candidateId: candidate.id,
        candidateLabel: candidate.label,
        candidateReason: candidate.reason,
        path: previewPath,
        data: (await readFile(previewPath)).toString('base64')
      });
    }
  }

  return previews;
}

function buildGeminiCandidateSelectionPrompt(
  composition: ClipCompositionArtifact,
  candidateDraft: CandidateEditPlanArtifact
): string {
  const segmentText = candidateDraft.editPlan.renderSegments
    .map((segment, index) => {
      const candidateSet = candidateDraft.candidateSets[index];
      const candidates = candidateSet.candidates
        .map((candidate) => `  - ${candidate.id}: ${candidate.label} / ${candidate.reason}`)
        .join('\n');
      return [
        `断片${index + 1}`,
        `役割: ${segment.role}`,
        `テロップ: ${segment.caption}`,
        `画面パターン: ${candidateSet.displaySummary}`,
        '候補:',
        candidates
      ].join('\n');
    })
    .join('\n\n');

  return [
    'AIエージェントが、検出結果から最低条件を満たす表示候補を作りました。',
    '各候補画像を見て、断片ごとに一番自然に見える候補IDだけを選んでください。',
    '座標や新しい候補は作らないでください。必ず候補一覧にある selectedCandidateId を返してください。',
    '判断基準は、顔が自然に見えること、画面情報が読めること、話の内容に対して主役が分かりやすいことです。',
    'JSONだけを返してください。',
    '',
    '返すJSON:',
    '{',
    '  "renderSegments": [',
    '    { "selectedCandidateId": "候補ID", "reason": "その候補を選んだ短い理由" }',
    '  ]',
    '}',
    '',
    `テーマ: ${composition.title}`,
    `完成イメージ: ${composition.themeSummary}`,
    '',
    segmentText
  ].join('\n');
}

function applyGeminiCandidateSelectionResponse(
  candidateDraft: CandidateEditPlanArtifact,
  response: GeminiCandidateSelectionResponse
): EditPlanArtifact {
  const selectionRecords = Array.isArray(response.renderSegments)
    ? response.renderSegments.map(recordFrom)
    : [];
  if (selectionRecords.length !== candidateDraft.editPlan.renderSegments.length) {
    throw new Error('Gemini APIの候補選択で、動画断片ごとの選択結果が不足しています');
  }

  return {
    ...candidateDraft.editPlan,
    renderSegments: candidateDraft.editPlan.renderSegments.map((segment, index) => {
      const record = selectionRecords[index] ?? {};
      const selectedCandidateId = typeof record.selectedCandidateId === 'string'
        ? record.selectedCandidateId.trim()
        : '';
      const selectionReason = typeof record.reason === 'string' && record.reason.trim()
        ? record.reason.trim()
        : undefined;

      return {
        ...segment,
        screenLayout: selectScreenLayoutCandidate(
          candidateDraft.candidateSets[index],
          selectedCandidateId,
          `renderSegments[${index + 1}]`,
          selectionReason
        )
      };
    })
  };
}

async function callGeminiCandidateSelectionApi(
  request: AgentRequest,
  composition: ClipCompositionArtifact,
  clips: GeminiVideoClipInput[],
  candidateDraft: CandidateEditPlanArtifact
): Promise<EditPlanArtifact> {
  const previews = await buildCandidatePreviewInputs(request, clips, candidateDraft);
  const parts: Part[] = [{ text: buildGeminiCandidateSelectionPrompt(composition, candidateDraft) }];
  for (const preview of previews) {
    parts.push({
      text: [
        `断片${preview.segmentIndex + 1}`,
        `候補ID: ${preview.candidateId}`,
        `候補名: ${preview.candidateLabel}`,
        `候補の意味: ${preview.candidateReason}`
      ].join('\n')
    });
    parts.push({
      inlineData: {
        mimeType: 'image/jpeg',
        data: preview.data
      }
    });
  }

  const responseJson = await generateGeminiJsonContent(request, parts, 'gemini-layout-candidate-response.json', '表示候補選択');
  const selectionText = extractGeminiResponseText(responseJson);
  return applyGeminiCandidateSelectionResponse(
    candidateDraft,
    parseGeminiJsonText(selectionText, 'Gemini APIの表示候補選択') as GeminiCandidateSelectionResponse
  );
}

async function callGeminiEditPlanApi(
  request: AgentRequest,
  composition: ClipCompositionArtifact,
  state: Zev2State,
  basePlan: EditPlanArtifact
): Promise<EditPlanArtifact | undefined> {
  if (!geminiApiKey && !vertexProjectId) {
    return undefined;
  }

  const clips = await buildGeminiVideoClipInputs(request, composition, state);
  if (clips.length === 0) {
    return undefined;
  }

  const parts: Part[] = [{ text: buildGeminiEditPlanPrompt(composition) }];
  for (const [index, clip] of clips.entries()) {
    parts.push({
      text: [
        `動画断片${index + 1}`,
        `役割: ${clip.role}`,
        `元動画時間: ${millisecondsToSeconds(clip.sourceStartMs)}秒 - ${millisecondsToSeconds(clip.sourceEndMs)}秒`,
        `文字起こし: ${clip.transcriptText}`
      ].join('\n')
    });
    parts.push({
      inlineData: {
        mimeType: 'video/mp4',
        data: clip.data
      }
    });
  }

  const responseJson = await generateGeminiJsonContent(request, parts, 'gemini-edit-plan-response.json', '演出案作成');
  const planText = extractGeminiResponseText(responseJson);
  const candidateDraft = applyGeminiEditPlanResponse(
    basePlan,
    parseGeminiJsonText(planText, 'Gemini APIの演出案') as GeminiEditPlanResponse
  );
  return callGeminiCandidateSelectionApi(request, composition, clips, candidateDraft);
}

async function buildEditPlanArtifact(
  request: AgentRequest,
  composition: ClipCompositionArtifact,
  state: Zev2State
): Promise<EditPlanArtifact> {
  const basePlan = buildFixtureEditPlan(composition);
  const geminiPlan = await callGeminiEditPlanApi(request, composition, state, basePlan);
  const hasSourceVideo = Boolean(resolveSourceVideoPath(state, request));
  const isSampleSource = request.target.sourceUri.startsWith('zev-sample://');
  if (hasSourceVideo && !isSampleSource && !geminiPlan) {
    throw new Error('演出作成にはGemini APIで動画断片を確認した画面表示計画が必要です');
  }

  return geminiPlan ?? basePlan;
}

function buildPatch(editPlanUri: string): PatchArtifact {
  return {
    kind: 'patch_json',
    mode: 'zev-inspired-adjustment-fixture',
    generatedAt: new Date().toISOString(),
    editPlanUri,
    changes: [
      {
        target: '動画の流れ',
        action: '複数の発話箇所をこの順番で使う',
        reason: 'テーマの入口から展開までを確認用動画として見られるようにするため'
      },
      {
        target: '画面とテロップ',
        action: '各断片で見せる範囲と表示文を決める',
        reason: '動画にしたときに必要な場面が切れず、内容を追えるようにするため'
      }
    ],
    renderReady: true
  };
}

function runCommand(command: string, args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const output: string[] = [];
    const child = spawn(command, args);
    child.stdout.on('data', (chunk: Buffer) => output.push(chunk.toString()));
    child.stderr.on('data', (chunk: Buffer) => output.push(chunk.toString()));
    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`${command} failed with code ${code ?? 'unknown'}\n${output.join('')}`));
    });
  });
}

function runCommandWithOutput(command: string, args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    const stdout: string[] = [];
    const stderr: string[] = [];
    const child = spawn(command, args);
    child.stdout.on('data', (chunk: Buffer) => stdout.push(chunk.toString()));
    child.stderr.on('data', (chunk: Buffer) => stderr.push(chunk.toString()));
    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) {
        resolve(stdout.join(''));
        return;
      }

      reject(new Error(`${command} failed with code ${code ?? 'unknown'}\n${stderr.join('')}`));
    });
  });
}

async function sourceHasAudioTrack(sourcePath: string): Promise<boolean> {
  try {
    const output = await runCommandWithOutput(ffprobeCommand, [
      '-v',
      'error',
      '-select_streams',
      'a:0',
      '-show_entries',
      'stream=index',
      '-of',
      'csv=p=0',
      sourcePath
    ]);
    return output.trim().length > 0;
  } catch {
    return false;
  }
}

async function probeVideoDimensions(sourcePath: string): Promise<{ width: number; height: number }> {
  const output = await runCommandWithOutput(ffprobeCommand, [
    '-v',
    'error',
    '-select_streams',
    'v:0',
    '-show_entries',
    'stream=width,height',
    '-of',
    'json',
    sourcePath
  ]);
  const parsed = recordFrom(JSON.parse(output));
  const streams = Array.isArray(parsed.streams) ? parsed.streams : [];
  const firstStream = recordFrom(streams[0]);
  const width = Number(firstStream.width);
  const height = Number(firstStream.height);
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    throw new Error('動画の幅と高さを取得できません');
  }

  return {
    width: Math.round(width),
    height: Math.round(height)
  };
}

function millisecondsToSeconds(valueMs: number): string {
  return (valueMs / 1000).toFixed(3);
}

function resolveLocalSourcePath(sourceUri: string): string | undefined {
  if (sourceUri.startsWith('file://')) {
    const url = new URL(sourceUri);
    if (url.hostname && url.hostname !== 'localhost') {
      return undefined;
    }

    const filePath = decodeURIComponent(url.pathname);
    return existsSync(filePath) ? filePath : undefined;
  }

  if (path.isAbsolute(sourceUri) && existsSync(sourceUri)) {
    return sourceUri;
  }

  const workspacePath = path.resolve(workspaceRoot(), sourceUri);
  return existsSync(workspacePath) ? workspacePath : undefined;
}

function isYoutubeSourceUri(sourceUri: string): boolean {
  try {
    const url = new URL(sourceUri);
    const hostname = url.hostname.toLowerCase().replace(/^www\./, '');
    return hostname === 'youtu.be' || hostname === 'youtube.com' || hostname === 'm.youtube.com' || hostname.endsWith('.youtube.com');
  } catch {
    return false;
  }
}

function findPreparedSourceVideoPath(state: Zev2State, requestDraftId: string): string | undefined {
  const sourceRef = findRequestOutputFileRef(state, requestDraftId, 'prepare_video');
  if (!sourceRef?.mimeType.startsWith('video/')) {
    return undefined;
  }

  try {
    const sourcePath = artifactPathByUrl(sourceRef.uri);
    return existsSync(sourcePath) ? sourcePath : undefined;
  } catch {
    return undefined;
  }
}

function resolveSourceVideoPath(state: Zev2State, request: AgentRequest): string | undefined {
  return findPreparedSourceVideoPath(state, request.requestDraftId) ?? resolveLocalSourcePath(request.target.sourceUri);
}

async function writeSourceVideoMetadata(request: AgentRequest, payload: SourceVideoArtifact): Promise<void> {
  const directory = requestArtifactDir(request);
  await mkdir(directory, { recursive: true });
  await writeFile(path.join(directory, SOURCE_VIDEO_METADATA_FILE_NAME), `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
}

async function prepareYoutubeSourceVideo(request: AgentRequest): Promise<ArtifactInfo> {
  const directory = requestArtifactDir(request);
  const outputPath = path.join(directory, SOURCE_VIDEO_FILE_NAME);
  await mkdir(directory, { recursive: true });

  try {
    await runCommand(youtubeDownloaderCommand, [
      '--no-playlist',
      '--merge-output-format',
      'mp4',
      '-f',
      'bv*[ext=mp4]+ba[ext=m4a]/b[ext=mp4]/bv*+ba/best',
      '-o',
      outputPath,
      request.target.sourceUri
    ]);
  } catch (error) {
    const errorCode = typeof error === 'object' && error && 'code' in error ? (error as { code?: unknown }).code : undefined;
    const message = error instanceof Error ? error.message : String(error);
    if (errorCode === 'ENOENT') {
      throw new Error(
        `YouTube動画を取得できません。${youtubeDownloaderCommand} が実行環境にありません。ZEV2_YTDLP_BIN で実行ファイルを指定するか、yt-dlp をPATHに入れてください。`
      );
    }

    throw new Error(`YouTube動画を取得できません。\n${message}`);
  }

  if (!existsSync(outputPath)) {
    throw new Error('YouTube動画の取得は完了しましたが、保存先の動画ファイルを確認できません');
  }

  const payload: SourceVideoArtifact = {
    kind: 'source_video',
    mode: 'youtube-download',
    sourceUri: request.target.sourceUri,
    purpose: request.input.purpose,
    registeredAt: new Date().toISOString(),
    localPath: outputPath,
    fileName: SOURCE_VIDEO_FILE_NAME,
    downloadTool: youtubeDownloaderCommand
  };
  await writeSourceVideoMetadata(request, payload);

  return {
    path: outputPath,
    uri: artifactUrl(request, SOURCE_VIDEO_FILE_NAME),
    mimeType: 'video/mp4',
    access: 'internal',
    payload
  };
}

async function prepareSourceVideo(request: AgentRequest): Promise<ArtifactInfo> {
  if (isYoutubeSourceUri(request.target.sourceUri)) {
    return prepareYoutubeSourceVideo(request);
  }

  const localPath = resolveLocalSourcePath(request.target.sourceUri);
  const payload: SourceVideoArtifact = {
    kind: 'source_video',
    mode: localPath ? 'local-source-reference' : 'remote-source-reference',
    sourceUri: request.target.sourceUri,
    purpose: request.input.purpose,
    registeredAt: new Date().toISOString(),
    ...(localPath ? { localPath } : {})
  };

  return writeJsonArtifact(request, 'source_video', payload);
}

function selectRenderRange(editPlan: EditPlanArtifact): { sourceStartMs: number; sourceEndMs: number } {
  const sortedSegments = [...editPlan.renderSegments].sort((left, right) => left.sourceStartMs - right.sourceStartMs);
  const firstSegment = sortedSegments[0];
  const lastSegment = sortedSegments[sortedSegments.length - 1];

  if (firstSegment && lastSegment && firstSegment.sourceStartMs < lastSegment.sourceEndMs) {
    return {
      sourceStartMs: firstSegment.sourceStartMs,
      sourceEndMs: lastSegment.sourceEndMs
    };
  }

  return {
    sourceStartMs: editPlan.sourceStartMs,
    sourceEndMs: editPlan.sourceEndMs
  };
}

function selectRenderSegments(editPlan: EditPlanArtifact): Array<{
  sourceStartMs: number;
  sourceEndMs: number;
  screenLayout: ShortsScreenLayoutPlan;
}> {
  const segments = editPlan.renderSegments
    .filter((segment) => segment.sourceStartMs < segment.sourceEndMs)
    .map((segment) => ({
      sourceStartMs: segment.sourceStartMs,
      sourceEndMs: segment.sourceEndMs,
      screenLayout: segment.screenLayout ?? buildDefaultScreenLayoutPlan()
    }));

  return segments.length > 0
    ? segments
    : [{
        ...selectRenderRange(editPlan),
        screenLayout: buildDefaultScreenLayoutPlan()
      }];
}

async function writeRenderPlan(
  request: AgentRequest,
  payload: {
    mode: 'source-file-trim' | 'fixture-pattern';
    sourceUri: string;
    sourcePath?: string;
    sourceStartMs: number;
    sourceEndMs: number;
    segments: Array<{ sourceStartMs: number; sourceEndMs: number; screenLayout: ShortsScreenLayoutPlan }>;
    target: typeof SHORTS_RENDER_TARGET;
    fallbackReason?: string;
  }
): Promise<void> {
  const directory = requestArtifactDir(request);
  await mkdir(directory, { recursive: true });
  await writeFile(path.join(directory, 'render-plan.json'), `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
}

async function renderFixtureVideo(request: AgentRequest, editPlan: EditPlanArtifact, state: Zev2State): Promise<ArtifactInfo> {
  const directory = requestArtifactDir(request);
  const outputPath = path.join(directory, OUTPUT_FILE_NAME_BY_KIND.output_video);
  const titleFile = path.join(directory, 'output-title.txt');
  await mkdir(directory, { recursive: true });
  await writeFile(titleFile, `${editPlan.title}\n${editPlan.hookText}`, 'utf8');
  const renderSegments = selectRenderSegments(editPlan);
  const renderRange = selectRenderRange(editPlan);
  const durationMs = renderSegments.reduce(
    (total, segment) => total + Math.max(1, segment.sourceEndMs - segment.sourceStartMs),
    0
  );
  const durationSeconds = millisecondsToSeconds(durationMs);
  const sourcePath = resolveSourceVideoPath(state, request);

  if (sourcePath) {
    const sourceDimensions = await probeVideoDimensions(sourcePath);
    await writeRenderPlan(request, {
      mode: 'source-file-trim',
      sourceUri: request.target.sourceUri,
      sourcePath,
      sourceStartMs: renderRange.sourceStartMs,
      sourceEndMs: renderRange.sourceEndMs,
      segments: renderSegments,
      target: SHORTS_RENDER_TARGET
    });

    if (renderSegments.length === 1) {
      const segment = renderSegments[0];
      const layoutFilter = buildLayoutVideoFilter({
        inputLabel: '[0:v]',
        outputLabel: 'outv',
        sourceWidth: sourceDimensions.width,
        sourceHeight: sourceDimensions.height,
        durationSeconds: Number(millisecondsToSeconds(segment.sourceEndMs - segment.sourceStartMs)),
        screenLayout: segment.screenLayout
      });
      await runCommand(ffmpegCommand, [
        '-y',
        '-ss',
        millisecondsToSeconds(segment.sourceStartMs),
        '-t',
        millisecondsToSeconds(segment.sourceEndMs - segment.sourceStartMs),
        '-i',
        sourcePath,
        '-filter_complex',
        layoutFilter,
        '-map',
        '[outv]',
        '-map',
        '0:a?',
        '-c:v',
        'libx264',
        '-pix_fmt',
        'yuv420p',
        '-c:a',
        'aac',
        '-shortest',
        '-movflags',
        '+faststart',
        outputPath
      ]);
    } else {
      const hasAudioTrack = await sourceHasAudioTrack(sourcePath);
      const inputArgs = renderSegments.flatMap((segment) => [
        '-ss',
        millisecondsToSeconds(segment.sourceStartMs),
        '-t',
        millisecondsToSeconds(segment.sourceEndMs - segment.sourceStartMs),
        '-i',
        sourcePath
      ]);
      const layoutFilters = renderSegments
        .map((segment, index) => buildLayoutVideoFilter({
          inputLabel: `[${index}:v]`,
          outputLabel: `v${index}`,
          sourceWidth: sourceDimensions.width,
          sourceHeight: sourceDimensions.height,
          durationSeconds: Number(millisecondsToSeconds(segment.sourceEndMs - segment.sourceStartMs)),
          screenLayout: segment.screenLayout
        }))
        .join(';');
      const audioInputs = renderSegments
        .map((_, index) => `[${index}:a]asetpts=PTS-STARTPTS[a${index}]`)
        .join(';');
      const concatInputs = hasAudioTrack
        ? renderSegments.map((_, index) => `[v${index}][a${index}]`).join('')
        : renderSegments.map((_, index) => `[v${index}]`).join('');
      const concatFilter = hasAudioTrack
        ? `${layoutFilters};${audioInputs};${concatInputs}concat=n=${renderSegments.length}:v=1:a=1[outv][outa]`
        : `${layoutFilters};${concatInputs}concat=n=${renderSegments.length}:v=1:a=0[outv]`;
      const outputMaps = hasAudioTrack ? ['-map', '[outv]', '-map', '[outa]'] : ['-map', '[outv]'];
      const audioCodecArgs = hasAudioTrack ? ['-c:a', 'aac', '-shortest'] : [];

      await runCommand(ffmpegCommand, [
        '-y',
        ...inputArgs,
        '-filter_complex',
        concatFilter,
        ...outputMaps,
        '-c:v',
        'libx264',
        '-pix_fmt',
        'yuv420p',
        ...audioCodecArgs,
        '-movflags',
        '+faststart',
        outputPath
      ]);
    }

    return {
      path: outputPath,
      uri: artifactUrl(request, OUTPUT_FILE_NAME_BY_KIND.output_video),
      mimeType: 'video/mp4',
      access: 'internal'
    };
  }

  await writeRenderPlan(request, {
    mode: 'fixture-pattern',
    sourceUri: request.target.sourceUri,
    sourceStartMs: renderRange.sourceStartMs,
    sourceEndMs: renderRange.sourceEndMs,
    segments: renderSegments,
    target: SHORTS_RENDER_TARGET,
    fallbackReason: '入力動画をローカルファイルとして読めないため、編集案の尺に合わせた確認用映像を生成する'
  });

  await runCommand(ffmpegCommand, [
    '-y',
    '-f',
    'lavfi',
    '-i',
    `testsrc2=s=${SHORTS_RENDER_TARGET.width}x${SHORTS_RENDER_TARGET.height}:d=${durationSeconds}`,
    '-c:v',
    'libx264',
    '-pix_fmt',
    'yuv420p',
    '-movflags',
    '+faststart',
    outputPath
  ]);

  return {
    path: outputPath,
    uri: artifactUrl(request, OUTPUT_FILE_NAME_BY_KIND.output_video),
    mimeType: 'video/mp4',
    access: 'internal'
  };
}

async function buildArtifactForRequest(request: AgentRequest): Promise<ArtifactInfo> {
  const state = await loadState();

  if (request.type === 'prepare_video') {
    return prepareSourceVideo(request);
  }

  if (request.type === 'run_stt') {
    return writeJsonArtifact(request, 'transcript_json', await buildTranscript(request, state));
  }

  if (request.type === 'propose_clip_themes') {
    const transcriptRef = findRequestOutputFileRef(state, request.requestDraftId, 'run_stt');
    if (!transcriptRef) {
      throw new Error('文字起こし成果物がないためテーマ候補を作れません');
    }
    const transcript = await readArtifactByUrl<TranscriptArtifact>(transcriptRef.uri);
    return writeJsonArtifact(request, 'theme_json', await buildThemeOptionsArtifact(transcript, request));
  }

  if (request.type === 'build_clip_composition') {
    const themeRef = findRequestOutputFileRef(state, request.requestDraftId, 'propose_clip_themes');
    const transcriptRef = findRequestOutputFileRef(state, request.requestDraftId, 'run_stt');
    if (!themeRef || !transcriptRef) {
      throw new Error('テーマ候補または文字起こし成果物がないため構成案を作れません');
    }
    const themes = await readArtifactByUrl<ThemeArtifact>(themeRef.uri);
    const transcript = await readArtifactByUrl<TranscriptArtifact>(transcriptRef.uri);
    return writeJsonArtifact(
      request,
      'composition_json',
      buildClipComposition(themes, transcript, selectedThemeIdFromState(state, request.requestDraftId))
    );
  }

  if (request.type === 'create_edit_plan') {
    const compositionRef = findRequestOutputFileRef(state, request.requestDraftId, 'build_clip_composition');
    if (!compositionRef) {
      throw new Error('構成案がないため演出案を作れません');
    }
    const composition = await readArtifactByUrl<ClipCompositionArtifact>(compositionRef.uri);
    return writeJsonArtifact(request, 'edit_plan_json', await buildEditPlanArtifact(request, composition, state));
  }

  if (request.type === 'apply_adjustment') {
    const editPlanRef = findRequestOutputFileRef(state, request.requestDraftId, 'create_edit_plan');
    if (!editPlanRef) {
      throw new Error('編集案がないため微調整できません');
    }
    return writeJsonArtifact(request, 'patch_json', buildPatch(editPlanRef.uri));
  }

  const editPlanRef = findRequestOutputFileRef(state, request.requestDraftId, 'create_edit_plan');
  if (!editPlanRef) {
    throw new Error('編集案がないため動画生成できません');
  }
  const editPlan = await readArtifactByUrl<EditPlanArtifact>(editPlanRef.uri);
  return renderFixtureVideo(request, editPlan, state);
}

function buildCompletion(request: AgentRequest, artifact: ArtifactInfo): AgentCompletionInput {
  const completion: AgentCompletionInput = {
    meaning: getDryRunMeaningForRequest(request.type),
    fileRef: {
      uri: artifact.uri,
      mimeType: artifact.mimeType,
      access: artifact.access
    }
  };

  if (request.type === 'propose_clip_themes') {
    const themeArtifact = artifact.payload as ThemeArtifact | undefined;
    completion.decision = {
      decisionType: 'theme_selection',
      decision: 'テーマ候補を人間確認へ進める',
      reason: '文字起こしから切り抜きたい内容の候補を作成したため、どのテーマで進めるかを人間が選べる',
      evidenceRefs: [
        {
          refId: artifact.uri,
          kind: 'file_ref',
          meaning: 'テーマ候補JSONの実体'
        }
      ],
      reviewOptions: themeArtifact?.themes.map((theme) => ({
        id: theme.id,
        title: theme.title,
        summary: theme.summary,
        evidenceRefs: theme.evidenceRefs
      })) ?? [],
      proposedNextState: 'review_required',
      requiresHumanReview: true,
      humanQuestion: 'どのテーマで切り抜きを作るか選んでください',
      ruleIds: ['control-plane:theme-selection-required', 'zev-reference:local-stt-transcript']
    };
  }

  if (request.type === 'apply_adjustment') {
    completion.decision = {
      decisionType: 'render_readiness',
      decision: '動画生成前に人間確認へ進める',
      reason: '複数箇所をつなぐ演出案と微調整結果が保存されたため、動画生成へ進める前に人間が確認できる',
      evidenceRefs: [
        {
          refId: artifact.uri,
          kind: 'file_ref',
          meaning: '複数箇所の動画生成前確認JSON'
        }
      ],
      proposedNextState: 'review_required',
      requiresHumanReview: true,
      humanQuestion: 'この複数箇所の構成と演出案で動画生成へ進めてよいか',
      ruleIds: ['control-plane:render-approval-required', 'zev-reference:multi-part-render-segments']
    };
  }

  return completion;
}

async function claimRequest(request: AgentRequest): Promise<void> {
  await requestJson<StateResponse>(`/agent-requests/${request.id}/claim`, {
    method: 'POST'
  });
}

async function completeRequest(request: AgentRequest): Promise<void> {
  const artifact = await buildArtifactForRequest(request);
  await requestJson<StateResponse>(`/agent-requests/${request.id}/complete`, {
    method: 'POST',
    body: JSON.stringify(buildCompletion(request, artifact))
  });
}

async function failRequest(request: AgentRequest, error: unknown): Promise<void> {
  const message = error instanceof Error ? error.message : 'runnerで不明な失敗が発生しました';

  await requestJson<StateResponse>(`/agent-requests/${request.id}/fail`, {
    method: 'POST',
    body: JSON.stringify({ message })
  });
}

async function runDryRunLoop(): Promise<void> {
  for (let index = 0; index < runnerOptions.maxSteps; index += 1) {
    const { request } = await requestJson<NextResponse>('/agent-requests/next');

    if (!request) {
      console.log('実行できるAI作業はありません。runnerを終了します。');
      return;
    }

    console.log(`仮実装開始: ${request.label} (${request.type})`);

    try {
      await claimRequest(request);
      await completeRequest(request);
      console.log(`仮実装完了: ${request.label}`);
    } catch (error) {
      await failRequest(request, error);
      throw error;
    }
  }

  throw new Error(`最大処理件数 ${runnerOptions.maxSteps} 件に到達したため停止しました`);
}

const runnerOptions = parseOptions();
await runDryRunLoop();
