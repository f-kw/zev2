import { spawn } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import {
  type AgentCompletionInput,
  type AgentRequest,
  type AgentRequestType,
  type ControlReference,
  type FileRefAccess,
  type FileRefKind,
  getDryRunMeaningForRequest,
  type Zev2State
} from '@zev2/shared';

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

type SttSegment = {
  id: number;
  startMs: number;
  endMs: number;
  text: string;
  speaker?: string;
};

type TranscriptMode = 'zev-sample-stt';

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
  language: 'ja-JP';
  durationSec: number;
  segmentCount: number;
  segments: SttSegment[];
  speechUnitGroups: number[][];
  themeSeeds?: TranscriptThemeSeed[];
};

type ThemeArtifact = {
  kind: 'theme_json';
  mode: 'transcript-theme-options';
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
  mode: 'gemini-api-edit-plan-fixture';
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
const OUTPUT_FILE_NAME_BY_KIND = {
  source_video: 'source-video.json',
  transcript_json: 'transcript.json',
  theme_json: 'themes.json',
  composition_json: 'clip-composition.json',
  edit_plan_json: 'edit-plan.json',
  patch_json: 'adjustment-patch.json',
  output_video: 'output.mp4'
} satisfies Record<FileRefKind, string>;
const ZEV_SPEECH_UNIT_LONG_GAP_MS = 1200;
const SHORTS_DEFAULT_RENDER_TARGET = {
  width: 1080,
  height: 1920
} as const;
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
  const prefix = '/api/artifacts/';
  if (!uri.startsWith(prefix)) {
    throw new Error(`成果物URIを読めません: ${uri}`);
  }

  const relativePath = uri.slice(prefix.length).split('/').map(decodeURIComponent).join(path.sep);
  const artifactPath = path.join(artifactRoot(), relativePath);
  const raw = await readFile(artifactPath, 'utf8');
  return JSON.parse(raw) as T;
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
      startMs >= endMs ||
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

function buildThemeOptions(transcript: TranscriptArtifact, request: AgentRequest): ThemeArtifact {
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
    mode: 'transcript-theme-options',
    generatedAt: new Date().toISOString(),
    sourceUri: request.target.sourceUri,
    themes
  };
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
    const normalizedSpeechIds = uniqueSpeechIds(speechIds.filter((speechId) => relatedIds.has(speechId)));
    const partSpeechIds = normalizedSpeechIds.length > 0 ? normalizedSpeechIds : speechIds;
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

function buildEditPlan(composition: ClipCompositionArtifact): EditPlanArtifact {
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
      caption: part.transcriptText.slice(0, 32)
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

function buildPatch(editPlanUri: string): PatchArtifact {
  return {
    kind: 'patch_json',
    mode: 'zev-inspired-adjustment-fixture',
    generatedAt: new Date().toISOString(),
    editPlanUri,
    changes: [
      {
        target: 'renderSegments',
        action: '複数箇所を動画生成に渡せる順番へ確定',
        reason: '選ばれたテーマに関係する複数の発話箇所をつなげて確認用動画にするため'
      },
      {
        target: 'telopPlan',
        action: '各箇所の内容に合わせたテロップを仮配置',
        reason: '構成案の流れを人間が確認できるようにするため'
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

function selectRenderSegments(editPlan: EditPlanArtifact): Array<{ sourceStartMs: number; sourceEndMs: number }> {
  const segments = editPlan.renderSegments
    .filter((segment) => segment.sourceStartMs < segment.sourceEndMs)
    .map((segment) => ({
      sourceStartMs: segment.sourceStartMs,
      sourceEndMs: segment.sourceEndMs
    }));

  return segments.length > 0 ? segments : [selectRenderRange(editPlan)];
}

async function writeRenderPlan(
  request: AgentRequest,
	  payload: {
	    mode: 'source-file-trim' | 'fixture-pattern';
	    sourceUri: string;
	    sourcePath?: string;
	    sourceStartMs: number;
	    sourceEndMs: number;
	    segments: Array<{ sourceStartMs: number; sourceEndMs: number }>;
	    target: typeof SHORTS_DEFAULT_RENDER_TARGET;
	    fallbackReason?: string;
	  }
): Promise<void> {
  const directory = requestArtifactDir(request);
  await mkdir(directory, { recursive: true });
  await writeFile(path.join(directory, 'render-plan.json'), `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
}

async function renderFixtureVideo(request: AgentRequest, editPlan: EditPlanArtifact): Promise<ArtifactInfo> {
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
  const sourcePath = resolveLocalSourcePath(request.target.sourceUri);
  const videoFilter = [
    `scale=${SHORTS_DEFAULT_RENDER_TARGET.width}:${SHORTS_DEFAULT_RENDER_TARGET.height}:force_original_aspect_ratio=increase`,
    `crop=${SHORTS_DEFAULT_RENDER_TARGET.width}:${SHORTS_DEFAULT_RENDER_TARGET.height}`
  ].join(',');

  if (sourcePath) {
    await writeRenderPlan(request, {
      mode: 'source-file-trim',
      sourceUri: request.target.sourceUri,
      sourcePath,
      sourceStartMs: renderRange.sourceStartMs,
      sourceEndMs: renderRange.sourceEndMs,
      segments: renderSegments,
      target: SHORTS_DEFAULT_RENDER_TARGET
    });

    if (renderSegments.length === 1) {
      const segment = renderSegments[0];
      await runCommand('ffmpeg', [
        '-y',
        '-ss',
        millisecondsToSeconds(segment.sourceStartMs),
        '-t',
        millisecondsToSeconds(segment.sourceEndMs - segment.sourceStartMs),
        '-i',
        sourcePath,
        '-map',
        '0:v:0',
        '-map',
        '0:a?',
        '-vf',
        videoFilter,
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
      const inputArgs = renderSegments.flatMap((segment) => [
        '-ss',
        millisecondsToSeconds(segment.sourceStartMs),
        '-t',
        millisecondsToSeconds(segment.sourceEndMs - segment.sourceStartMs),
        '-i',
        sourcePath
      ]);
      const scaledInputs = renderSegments
        .map((_, index) => `[${index}:v]${videoFilter},setsar=1,setpts=PTS-STARTPTS[v${index}]`)
        .join(';');
      const concatInputs = renderSegments.map((_, index) => `[v${index}]`).join('');

      await runCommand('ffmpeg', [
        '-y',
        ...inputArgs,
        '-filter_complex',
        `${scaledInputs};${concatInputs}concat=n=${renderSegments.length}:v=1:a=0[outv]`,
        '-map',
        '[outv]',
        '-c:v',
        'libx264',
        '-pix_fmt',
        'yuv420p',
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
    target: SHORTS_DEFAULT_RENDER_TARGET,
    fallbackReason: '入力動画をローカルファイルとして読めないため、編集案の尺に合わせた確認用映像を生成する'
  });

  await runCommand('ffmpeg', [
    '-y',
    '-f',
    'lavfi',
    '-i',
    `testsrc2=s=${SHORTS_DEFAULT_RENDER_TARGET.width}x${SHORTS_DEFAULT_RENDER_TARGET.height}:d=${durationSeconds}`,
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
    return writeJsonArtifact(request, 'source_video', {
      kind: 'source_video',
      mode: 'zev2-local-source-registration',
      sourceUri: request.target.sourceUri,
      purpose: request.input.purpose,
      registeredAt: new Date().toISOString()
    });
  }

  if (request.type === 'run_stt') {
    return writeJsonArtifact(request, 'transcript_json', await buildZevSampleTranscript(request));
  }

  if (request.type === 'propose_clip_themes') {
    const transcriptRef = findRequestOutputFileRef(state, request.requestDraftId, 'run_stt');
    if (!transcriptRef) {
      throw new Error('文字起こし成果物がないためテーマ候補を作れません');
    }
    const transcript = await readArtifactByUrl<TranscriptArtifact>(transcriptRef.uri);
    return writeJsonArtifact(request, 'theme_json', buildThemeOptions(transcript, request));
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
    return writeJsonArtifact(request, 'edit_plan_json', buildEditPlan(composition));
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
  return renderFixtureVideo(request, editPlan);
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
      ruleIds: ['control-plane:theme-selection-required', 'zev-reference:stt-sample']
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
