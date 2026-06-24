import { spawn } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { GoogleGenAI, type GenerateContentResponse, type Part } from '@google/genai';
import {
  DEFAULT_GEMINI_MODEL,
  findById,
  lastMatching,
  recordValue as recordFrom,
  type AgentCompletionInput,
  type AgentRequest,
  type AgentRequestType,
  type FileRefKind,
  getDryRunMeaningForRequest,
  type Zev2State
} from '@zev2/shared';
import {
  SHORTS_RENDER_TARGET,
  buildDefaultScreenLayoutPlan,
  buildLayoutVideoFilter,
  type ShortsScreenLayoutPlan
} from './screen-layout.js';
import { resolveTelopPlacementArea, type TelopPlacementArea } from './telop-placement.js';
import { loadTelopStyleProfile, resolveTelopStyle, type ResolvedTelopStyle } from './telop-style.js';
import { renderRemotionTelopPng } from './telop-remotion.js';
import { buildClipCompositionArtifact } from './steps/composition.js';
import {
  buildEditPlanArtifact as buildEditPlanArtifactForStep,
  type BuildEditPlanArtifactContext
} from './steps/edit-plan.js';
import { buildPatchArtifact } from './steps/patch.js';
import {
  prepareSourceVideoArtifact,
  resolveSourceVideoPathFromState,
  type SourceVideoArtifactContext
} from './steps/source-video.js';
import { buildTranscriptArtifact } from './steps/transcript.js';
import { buildThemeOptionsArtifact as buildThemeOptionsArtifactForStep } from './steps/theme-options.js';
import {
  joinTelopSpeechText,
  millisecondsToSeconds,
  uniqueSpeechIds
} from './transcript-utils.js';
import type {
  ArtifactInfo,
  ClipCompositionArtifact,
  EditPlanArtifact,
  PatchArtifact,
  SpeechTimingRef,
  ThemeArtifact,
  TranscriptArtifact,
  WorkflowStepManifest
} from './workflow-artifacts.js';
import { createStepArtifactBuilders } from './workflow-step-builders.js';

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
const useFixedAgentArtifacts = process.env.ZEV2_USE_FIXED_AGENT_ARTIFACTS === '1';
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
const ZEV_STT_SAMPLE_PATH = path.join(workspaceRoot(), 'runner', 'fixtures', 'zev-stt-sample.json');
const FIXED_ARTIFACT_DRAFT_ID = 'draft_w4Lp9IJC6pQl3FsRfFL9t';
const FIXED_TRANSCRIPT_PATH = path.join(workspaceRoot(), 'runtime', 'artifacts', FIXED_ARTIFACT_DRAFT_ID, 'transcript.json');
const FIXED_THEME_OPTIONS_PATH = path.join(workspaceRoot(), 'runtime', 'artifacts', FIXED_ARTIFACT_DRAFT_ID, 'themes.json');
const confirmationVideoEncoder = process.env.ZEV2_FFMPEG_VIDEO_ENCODER ?? 'h264_videotoolbox';
const CONFIRMATION_VIDEO_ENCODING_ARGS = ['-c:v', confirmationVideoEncoder, '-pix_fmt', 'yuv420p'];

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
  const agentRequest = lastMatching(
    state.agentRequests,
    (request) =>
      request.requestDraftId === requestDraftId &&
      request.type === type &&
      request.status === 'succeeded'
  );
  if (!agentRequest?.result?.fileRefId) {
    return undefined;
  }

  return findById(state.fileRefs, agentRequest.result.fileRefId);
}

function requireRequestOutputFileRef(
  state: Zev2State,
  request: AgentRequest,
  dependencyType: AgentRequestType,
  missingMessage: string
) {
  const fileRef = findRequestOutputFileRef(state, request.requestDraftId, dependencyType);
  if (!fileRef) {
    throw new Error(missingMessage);
  }

  return fileRef;
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

async function writeStepManifest(request: AgentRequest, manifest: WorkflowStepManifest): Promise<void> {
  const directory = requestArtifactDir(request);
  await mkdir(directory, { recursive: true });
  await writeFile(path.join(directory, `${request.type}-manifest.json`), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
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

function sourceVideoArtifactContext(): SourceVideoArtifactContext {
  return {
    youtubeDownloaderCommand,
    sourceVideoFileName: SOURCE_VIDEO_FILE_NAME,
    sourceVideoMetadataFileName: SOURCE_VIDEO_METADATA_FILE_NAME,
    workspaceRoot,
    requestArtifactDir,
    artifactUrl,
    artifactPathByUrl,
    findRequestOutputFileRef,
    writeJsonArtifact,
    runCommand
  };
}

async function buildTranscript(request: AgentRequest, state: Zev2State): Promise<TranscriptArtifact> {
  return buildTranscriptArtifact(request, state, {
    sttServerUrl,
    sttServerTimeoutMs,
    sttSamplePath: ZEV_STT_SAMPLE_PATH,
    fixedTranscriptPath: FIXED_TRANSCRIPT_PATH,
    useFixedAgentArtifacts,
    ffmpegCommand,
    requestArtifactDir,
    resolveSourceVideoPath,
    runCommand
  });
}

async function buildThemeOptionsArtifact(transcript: TranscriptArtifact, request: AgentRequest): Promise<ThemeArtifact> {
  return buildThemeOptionsArtifactForStep(transcript, request, {
    fixedThemeOptionsPath: FIXED_THEME_OPTIONS_PATH,
    useFixedAgentArtifacts,
    sanitizePathPart,
    generateGeminiJsonContent,
    extractGeminiResponseText,
    parseGeminiJsonText
  });
}

function editPlanArtifactContext(): BuildEditPlanArtifactContext {
  return {
    useFixedAgentArtifacts,
    hasGeminiApiConnection: Boolean(geminiApiKey || vertexProjectId),
    ffmpegCommand,
    requestArtifactDir,
    resolveSourceVideoPath,
    runCommand,
    probeVideoDimensions,
    generateGeminiJsonContent,
    extractGeminiResponseText,
    parseGeminiJsonText
  };
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

async function buildEditPlanArtifact(
  request: AgentRequest,
  composition: ClipCompositionArtifact,
  state: Zev2State
): Promise<EditPlanArtifact> {
  return buildEditPlanArtifactForStep(request, composition, state, editPlanArtifactContext());
}

function buildPatch(editPlanUri: string): PatchArtifact {
  return buildPatchArtifact(editPlanUri);
}

function runCommand(command: string, args: string[], options?: { env?: NodeJS.ProcessEnv }): Promise<void> {
  return new Promise((resolve, reject) => {
    const output: string[] = [];
    const child = spawn(command, args, {
      env: options?.env ? { ...process.env, ...options.env } : process.env
    });
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

function runCommandWithCombinedOutput(command: string, args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    const output: string[] = [];
    const child = spawn(command, args);
    child.stdout.on('data', (chunk: Buffer) => output.push(chunk.toString()));
    child.stderr.on('data', (chunk: Buffer) => output.push(chunk.toString()));
    child.on('error', reject);
    child.on('close', (code) => {
      const text = output.join('');
      if (code === 0) {
        resolve(text);
        return;
      }

      reject(new Error(`${command} failed with code ${code ?? 'unknown'}\n${text}`));
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

async function assertOutputVideoHasAudibleAudio(outputPath: string): Promise<void> {
  const hasAudioTrack = await sourceHasAudioTrack(outputPath);
  if (!hasAudioTrack) {
    throw new Error('生成動画に音声トラックがありません');
  }

  const volumeOutput = await runCommandWithCombinedOutput(ffmpegCommand, [
    '-hide_banner',
    '-nostats',
    '-i',
    outputPath,
    '-map',
    '0:a:0',
    '-af',
    'volumedetect',
    '-f',
    'null',
    '-'
  ]);
  const sampleCounts = [...volumeOutput.matchAll(/n_samples:\s*(\d+)/g)]
    .map((match) => Number(match[1]))
    .filter((value) => Number.isFinite(value));
  const sampleCount = sampleCounts.length > 0 ? Math.max(...sampleCounts) : 0;
  const maxVolumeMatch = volumeOutput.match(/max_volume:\s*([-\d.]+|-\s*inf)\s*dB/i);
  const maxVolume = maxVolumeMatch?.[1]?.replace(/\s+/g, '') ?? '';

  if (sampleCount <= 0 || !maxVolume || maxVolume === '-inf') {
    throw new Error('生成動画の音声が無音です');
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

type RenderTelopEvent = {
  startMs: number;
  endMs: number;
  text: string;
  role: string;
  sourceSpeechIds: number[];
};

type RenderTelopOverlay = RenderTelopEvent & {
  fileName: string;
  path: string;
  x: number;
  y: number;
  width: number;
  height: number;
  styleId: string;
  placement: TelopPlacementArea;
};

type RenderSegmentForVideo = {
  sourceStartMs: number;
  sourceEndMs: number;
  caption: string;
  speechIds: number[];
  speechUnits: SpeechTimingRef[];
  screenLayout: ShortsScreenLayoutPlan;
};

function sanitizeTelopText(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function buildRenderTelopEvents(
  editPlan: EditPlanArtifact,
  renderSegments: RenderSegmentForVideo[],
  durationMs: number
): RenderTelopEvent[] {
  const speechTimeline = buildRenderedSpeechTimeline(renderSegments);
  const telopRecords = editPlan.telopPlan
    .map((telop) => {
      const sourceSpeechIds = uniqueSpeechIds(telop.sourceSpeechIds);
      const speechRefs = sourceSpeechIds
        .map((speechId) => {
          const range = speechTimeline.get(speechId);
          return range ? { id: speechId, ...range } : undefined;
        })
        .filter((speech): speech is { id: number; startMs: number; endMs: number; text: string } => Boolean(speech))
        .sort((left, right) => left.startMs - right.startMs);

      if (speechRefs.length === 0) {
        return undefined;
      }

      const speechText = joinTelopSpeechText(speechRefs);
      return {
        startMs: Math.min(...speechRefs.map((speech) => speech.startMs)),
        speechEndMs: Math.max(...speechRefs.map((speech) => speech.endMs)),
        text: sanitizeTelopText(telop.text || speechText),
        role: sanitizeTelopText(telop.role),
        sourceSpeechIds: speechRefs.map((speech) => speech.id)
      };
    })
    .filter((telop): telop is {
      startMs: number;
      speechEndMs: number;
      text: string;
      role: string;
      sourceSpeechIds: number[];
    } => Boolean(telop))
    .filter((telop) => telop.startMs < durationMs && telop.text.length > 0)
    .sort((left, right) => left.startMs - right.startMs);

  const uniqueTelopRecords = telopRecords.filter((telop, index) => (
    index === 0 || telop.startMs > telopRecords[index - 1].startMs
  ));
  const events = uniqueTelopRecords
    .map((telop, index) => {
      const nextTelop = uniqueTelopRecords[index + 1];
      const speechEndMs = Math.min(durationMs, telop.speechEndMs);
      const nextBoundaryMs = nextTelop?.startMs ?? durationMs;
      const endMs = Math.min(durationMs, speechEndMs, nextBoundaryMs);
      return {
        startMs: telop.startMs,
        endMs,
        text: telop.text,
        role: telop.role || 'テロップ',
        sourceSpeechIds: telop.sourceSpeechIds
      };
    })
    .filter((telop) => telop.startMs < telop.endMs);

  if (events.length > 0) {
    return events;
  }

  let cursorMs = 0;
  return renderSegments
    .map((segment) => {
      const segmentDurationMs = Math.max(1, segment.sourceEndMs - segment.sourceStartMs);
      const startMs = cursorMs;
      const endMs = Math.min(durationMs, cursorMs + segmentDurationMs);
      cursorMs = endMs;
      return {
        startMs,
        endMs,
        text: sanitizeTelopText(segment.caption || editPlan.hookText || editPlan.title),
        role: '本文',
        sourceSpeechIds: segment.speechIds
      };
    })
    .filter((telop) => telop.startMs < telop.endMs && telop.text.length > 0);
}

function buildRenderedSpeechTimeline(renderSegments: RenderSegmentForVideo[]): Map<number, { startMs: number; endMs: number; text: string }> {
  const timeline = new Map<number, { startMs: number; endMs: number; text: string }>();
  let cursorMs = 0;

  for (const segment of renderSegments) {
    const segmentDurationMs = Math.max(1, segment.sourceEndMs - segment.sourceStartMs);
    for (const speech of segment.speechUnits) {
      const sourceStartMs = Math.max(segment.sourceStartMs, speech.sourceStartMs);
      const sourceEndMs = Math.min(segment.sourceEndMs, speech.sourceEndMs);
      if (sourceEndMs <= sourceStartMs) {
        continue;
      }
      if (timeline.has(speech.id)) {
        continue;
      }
      timeline.set(speech.id, {
        startMs: cursorMs + (sourceStartMs - segment.sourceStartMs),
        endMs: cursorMs + (sourceEndMs - segment.sourceStartMs),
        text: speech.text
      });
    }
    cursorMs += segmentDurationMs;
  }

  return timeline;
}

function findRenderSegmentAtTimelineMs(
  renderSegments: RenderSegmentForVideo[],
  timelineMs: number
): RenderSegmentForVideo {
  let cursorMs = 0;
  for (const segment of renderSegments) {
    const segmentDurationMs = Math.max(1, segment.sourceEndMs - segment.sourceStartMs);
    if (timelineMs >= cursorMs && timelineMs < cursorMs + segmentDurationMs) {
      return segment;
    }
    cursorMs += segmentDurationMs;
  }

  return renderSegments[renderSegments.length - 1] ?? {
    sourceStartMs: 0,
    sourceEndMs: 1,
    caption: '',
    speechIds: [],
    speechUnits: [],
    screenLayout: buildDefaultScreenLayoutPlan()
  };
}

function requestedTelopStyleId(request: AgentRequest): string | undefined {
  const explicitStyle = process.env.ZEV2_TELOP_STYLE_ID?.trim();
  if (explicitStyle) {
    return explicitStyle;
  }

  return undefined;
}

async function resolveTelopStyleForRequest(request: AgentRequest): Promise<ResolvedTelopStyle> {
  const profile = await loadTelopStyleProfile();
  return resolveTelopStyle(profile, requestedTelopStyleId(request));
}

async function writeTelopOverlayImages(
  request: AgentRequest,
  renderSegments: RenderSegmentForVideo[],
  telops: RenderTelopEvent[],
  style: ResolvedTelopStyle
): Promise<RenderTelopOverlay[]> {
  const directory = requestArtifactDir(request);
  const overlays: RenderTelopOverlay[] = [];

  await mkdir(directory, { recursive: true });

  for (const [index, telop] of telops.entries()) {
    const fileName = `telop-${String(index + 1).padStart(3, '0')}.png`;
    const overlayPath = path.join(directory, fileName);
    const activeSegment = findRenderSegmentAtTimelineMs(renderSegments, telop.startMs);
    const placement = resolveTelopPlacementArea(activeSegment.screenLayout);

    await renderRemotionTelopPng({
      text: telop.text,
      style,
      position: style.position,
      background: style.background,
      maxCharsPerLine: style.maxCharsPerLine,
      width: placement.width,
      height: placement.height,
      glowSeedHint: [
        style.styleId,
        telop.role,
        telop.sourceSpeechIds.join(','),
        telop.text,
        String(telop.startMs),
        String(telop.endMs)
      ].join('|')
    }, overlayPath);

    overlays.push({
      ...telop,
      fileName,
      path: overlayPath,
      x: placement.x,
      y: placement.y,
      width: placement.width,
      height: placement.height,
      styleId: style.styleId,
      placement
    });
  }

  return overlays;
}

function buildTelopOverlayInputArgs(telops: RenderTelopOverlay[]): string[] {
  return telops.flatMap((telop) => ['-loop', '1', '-i', telop.path]);
}

function appendTelopOverlayFilters(
  baseFilter: string,
  inputLabel: string,
  outputLabel: string,
  telops: RenderTelopOverlay[],
  firstTelopInputIndex: number
): string {
  if (telops.length === 0) {
    return `${baseFilter};[${inputLabel}]null[${outputLabel}]`;
  }

  const filters = [baseFilter];
  let currentLabel = inputLabel;
  telops.forEach((telop, index) => {
    const nextLabel = index === telops.length - 1 ? outputLabel : `${outputLabel}_telop_${index}`;
    filters.push(
      `[${currentLabel}][${firstTelopInputIndex + index}:v]overlay=${telop.x}:${telop.y}:enable='between(t,${millisecondsToSeconds(telop.startMs)},${millisecondsToSeconds(telop.endMs)})'[${nextLabel}]`
    );
    currentLabel = nextLabel;
  });

  return filters.join(';');
}

function resolveSourceVideoPath(state: Zev2State, request: AgentRequest): string | undefined {
  return resolveSourceVideoPathFromState(state, request, sourceVideoArtifactContext());
}

async function prepareSourceVideo(request: AgentRequest): Promise<ArtifactInfo> {
  return prepareSourceVideoArtifact(request, sourceVideoArtifactContext());
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

function selectRenderSegments(editPlan: EditPlanArtifact): RenderSegmentForVideo[] {
  const segments = editPlan.renderSegments
    .filter((segment) => segment.sourceStartMs < segment.sourceEndMs)
    .map((segment) => ({
      sourceStartMs: segment.sourceStartMs,
      sourceEndMs: segment.sourceEndMs,
      caption: segment.caption,
      speechIds: segment.speechIds,
      speechUnits: segment.speechUnits,
      screenLayout: segment.screenLayout ?? buildDefaultScreenLayoutPlan()
    }));

  return segments.length > 0
    ? segments
    : [{
        ...selectRenderRange(editPlan),
        caption: editPlan.hookText,
        speechIds: [],
        speechUnits: [],
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
    segments: Array<{
      sourceStartMs: number;
      sourceEndMs: number;
      speechIds: number[];
      speechUnits: SpeechTimingRef[];
      screenLayout: ShortsScreenLayoutPlan;
    }>;
    telops: RenderTelopEvent[];
    telopOverlayImages: Array<{
      fileName: string;
      startMs: number;
      endMs: number;
      text: string;
      sourceSpeechIds: number[];
      styleId: string;
      x: number;
      y: number;
      width: number;
      height: number;
      target: 'screen' | 'speaker_safe_area';
      placementReason: string;
    }>;
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
  const telopStyle = await resolveTelopStyleForRequest(request);
  const telops = buildRenderTelopEvents(editPlan, renderSegments, durationMs);
  const telopOverlays = await writeTelopOverlayImages(request, renderSegments, telops, telopStyle);
  const telopOverlayImages = telopOverlays.map((telop) => ({
    fileName: telop.fileName,
    startMs: telop.startMs,
    endMs: telop.endMs,
    text: telop.text,
    sourceSpeechIds: telop.sourceSpeechIds,
    styleId: telop.styleId,
    x: telop.x,
    y: telop.y,
    width: telop.width,
    height: telop.height,
    target: telop.placement.target,
    placementReason: telop.placement.reason
  }));
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
      telops,
      telopOverlayImages,
      target: SHORTS_RENDER_TARGET
    });

    if (renderSegments.length === 1) {
      const segment = renderSegments[0];
      const layoutFilter = buildLayoutVideoFilter({
        inputLabel: '[0:v]',
        outputLabel: 'layoutv',
        sourceWidth: sourceDimensions.width,
        sourceHeight: sourceDimensions.height,
        durationSeconds: Number(millisecondsToSeconds(segment.sourceEndMs - segment.sourceStartMs)),
        screenLayout: segment.screenLayout
      });
      const videoFilter = appendTelopOverlayFilters(layoutFilter, 'layoutv', 'outv', telopOverlays, 1);
      await runCommand(ffmpegCommand, [
        '-y',
        '-ss',
        millisecondsToSeconds(segment.sourceStartMs),
        '-t',
        millisecondsToSeconds(segment.sourceEndMs - segment.sourceStartMs),
        '-i',
        sourcePath,
        ...buildTelopOverlayInputArgs(telopOverlays),
        '-filter_complex',
        videoFilter,
        '-map',
        '[outv]',
        '-map',
        '0:a?',
        ...CONFIRMATION_VIDEO_ENCODING_ARGS,
        '-c:a',
        'aac',
        '-disposition:a:0',
        'default',
        '-shortest',
        '-t',
        millisecondsToSeconds(segment.sourceEndMs - segment.sourceStartMs),
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
      const rawConcatFilter = hasAudioTrack
        ? `${layoutFilters};${audioInputs};${concatInputs}concat=n=${renderSegments.length}:v=1:a=1[rawv][outa]`
        : `${layoutFilters};${concatInputs}concat=n=${renderSegments.length}:v=1:a=0[rawv]`;
      const concatFilter = appendTelopOverlayFilters(rawConcatFilter, 'rawv', 'outv', telopOverlays, renderSegments.length);
      const outputMaps = hasAudioTrack ? ['-map', '[outv]', '-map', '[outa]'] : ['-map', '[outv]'];
      const audioCodecArgs = hasAudioTrack
        ? ['-c:a', 'aac', '-disposition:a:0', 'default', '-shortest']
        : [];

      await runCommand(ffmpegCommand, [
        '-y',
        ...inputArgs,
        ...buildTelopOverlayInputArgs(telopOverlays),
        '-filter_complex',
        concatFilter,
        ...outputMaps,
        ...CONFIRMATION_VIDEO_ENCODING_ARGS,
        ...audioCodecArgs,
        '-t',
        durationSeconds,
        '-movflags',
        '+faststart',
        outputPath
      ]);
    }

    await assertOutputVideoHasAudibleAudio(outputPath);
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
    telops,
    telopOverlayImages,
    target: SHORTS_RENDER_TARGET,
    fallbackReason: '入力動画をローカルファイルとして読めないため、音声付き動画を生成できない'
  });

  throw new Error('入力動画を読めないため、音声付き動画を生成できません');
}

const STEP_ARTIFACT_BUILDERS = createStepArtifactBuilders({
  prepareSourceVideo,
  buildTranscript,
  buildThemeOptionsArtifact,
  buildClipCompositionArtifact,
  buildEditPlanArtifact,
  buildPatch,
  renderVideo: renderFixtureVideo,
  requireRequestOutputFileRef,
  readArtifactByUrl,
  writeStepManifest,
  writeJsonArtifact
});

async function buildArtifactForRequest(request: AgentRequest): Promise<ArtifactInfo> {
  const state = await loadState();
  return STEP_ARTIFACT_BUILDERS[request.type]({ request, state });
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

  const { request } = await requestJson<NextResponse>('/agent-requests/next');
  if (!request) {
    console.log('実行できるAI作業はありません。runnerを終了します。');
    return;
  }

  throw new Error(`最大処理件数 ${runnerOptions.maxSteps} 件に到達したため停止しました`);
}

const runnerOptions = parseOptions();
await runDryRunLoop();
