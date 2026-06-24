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
import {
  renderVideoArtifact,
  type RenderVideoArtifactContext
} from './steps/render-video.js';
import { buildTranscriptArtifact } from './steps/transcript.js';
import { buildThemeOptionsArtifact as buildThemeOptionsArtifactForStep } from './steps/theme-options.js';
import type {
  ArtifactInfo,
  ClipCompositionArtifact,
  EditPlanArtifact,
  PatchArtifact,
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

function renderVideoArtifactContext(): RenderVideoArtifactContext {
  return {
    ffmpegCommand,
    ffprobeCommand,
    confirmationVideoEncodingArgs: CONFIRMATION_VIDEO_ENCODING_ARGS,
    outputVideoFileName: OUTPUT_FILE_NAME_BY_KIND.output_video,
    requestArtifactDir,
    artifactUrl,
    resolveSourceVideoPath,
    probeVideoDimensions,
    runCommand,
    runCommandWithOutput,
    runCommandWithCombinedOutput
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

function resolveSourceVideoPath(state: Zev2State, request: AgentRequest): string | undefined {
  return resolveSourceVideoPathFromState(state, request, sourceVideoArtifactContext());
}

async function prepareSourceVideo(request: AgentRequest): Promise<ArtifactInfo> {
  return prepareSourceVideoArtifact(request, sourceVideoArtifactContext());
}

async function renderFixtureVideo(request: AgentRequest, editPlan: EditPlanArtifact, state: Zev2State): Promise<ArtifactInfo> {
  return renderVideoArtifact(request, editPlan, state, renderVideoArtifactContext());
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
