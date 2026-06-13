import { spawn } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import {
  type AgentCompletionInput,
  type AgentRequest,
  type AgentRequestType,
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
};

type SttSegment = {
  id: number;
  startMs: number;
  endMs: number;
  text: string;
  speaker?: string;
};

type TranscriptArtifact = {
  kind: 'transcript_json';
  mode: 'zev-inspired-fixture-stt';
  sourceUri: string;
  generatedAt: string;
  language: 'ja-JP';
  durationSec: number;
  segmentCount: number;
  segments: SttSegment[];
  speechUnitGroups: number[][];
};

type CandidateArtifact = {
  kind: 'candidate_json';
  mode: 'zev-inspired-rule-candidates';
  generatedAt: string;
  sourceUri: string;
  candidates: Array<{
    id: string;
    sourceStartMs: number;
    sourceEndMs: number;
    title: string;
    hookText: string;
    transcriptText: string;
    speechIds: number[];
    reason: string;
    evidenceRefs: Array<{ kind: string; refId: string; meaning: string }>;
  }>;
};

type CandidateReviewArtifact = {
  kind: 'candidate_review_json';
  mode: 'zev-inspired-gemini-review-fixture';
  generatedAt: string;
  reviewedCandidates: Array<{
    candidateId: string;
    visualCheck: string;
    captionHint: string;
    risk: 'low' | 'medium';
    nextAction: 'use_for_edit_plan' | 'needs_manual_check';
  }>;
};

type EditPlanArtifact = {
  kind: 'edit_plan_json';
  mode: 'zev-inspired-edit-plan-fixture';
  generatedAt: string;
  selectedCandidateId: string;
  title: string;
  hookText: string;
  sourceStartMs: number;
  sourceEndMs: number;
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
  candidate_json: 'candidates.json',
  candidate_review_json: 'candidate-review.json',
  edit_plan_json: 'edit-plan.json',
  patch_json: 'adjustment-patch.json',
  output_video: 'output.mp4'
} satisfies Record<FileRefKind, string>;
const ZEV_SPEECH_UNIT_LONG_GAP_MS = 1200;

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
  const agentRequest = state.agentRequests.find(
    (request) => request.requestDraftId === requestDraftId && request.type === type
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
    access: 'internal'
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

function buildFixtureSegments(request: AgentRequest): SttSegment[] {
  const sourceLabel = request.target.sourceUri.startsWith('file:')
    ? 'ローカル素材'
    : '配信素材';
  const baseTexts = [
    `${sourceLabel}の状況を確認します。`,
    'ここで話題が切り替わります。',
    'え、今の展開はかなり使えます。',
    '理由は前後の流れが短くまとまっているからです。',
    'この部分なら冒頭で視聴者に伝わります。',
    '最後に反応が返って、短尺の締めになります。'
  ];

  return baseTexts.map((text, index) => {
    const startMs = index * 4500;
    return {
      id: index + 1,
      startMs,
      endMs: startMs + 3200,
      text,
      speaker: index % 2 === 0 ? 'speaker_1' : 'speaker_2'
    };
  });
}

function segmentTextByIds(transcript: TranscriptArtifact, ids: number[]): string {
  const idSet = new Set(ids);
  return transcript.segments
    .filter((segment) => idSet.has(segment.id))
    .map((segment) => segment.text)
    .join('');
}

function buildCandidates(transcript: TranscriptArtifact, request: AgentRequest): CandidateArtifact {
  const requestedCount = parseCount(request.constraints.candidateCountLabel);
  const windows = transcript.speechUnitGroups.length > 0
    ? transcript.speechUnitGroups
    : transcript.segments.map((segment) => [segment.id]);
  const candidates = windows.slice(0, requestedCount).map((speechIds, index) => {
    const segments = transcript.segments.filter((segment) => speechIds.includes(segment.id));
    const first = segments[0] ?? transcript.segments[0];
    const last = segments[segments.length - 1] ?? first;
    const transcriptText = segmentTextByIds(transcript, speechIds);
    const candidateNumber = index + 1;
    return {
      id: `candidate_${candidateNumber}`,
      sourceStartMs: first.startMs,
      sourceEndMs: last.endMs,
      title: `候補${candidateNumber}: ${transcriptText.slice(0, 18)}`,
      hookText: transcriptText.slice(0, 28),
      transcriptText,
      speechIds,
      reason: 'ZEVの発話まとまり方式を参考に、話者切替、長い間、文末で区切ったまとまりを候補にした',
      evidenceRefs: speechIds.map((speechId) => ({
        kind: 'time_range',
        refId: `speech_${speechId}`,
        meaning: `STT発話 ${speechId} を含む`
      }))
    };
  });

  return {
    kind: 'candidate_json',
    mode: 'zev-inspired-rule-candidates',
    generatedAt: new Date().toISOString(),
    sourceUri: request.target.sourceUri,
    candidates
  };
}

function buildCandidateReview(candidates: CandidateArtifact): CandidateReviewArtifact {
  return {
    kind: 'candidate_review_json',
    mode: 'zev-inspired-gemini-review-fixture',
    generatedAt: new Date().toISOString(),
    reviewedCandidates: candidates.candidates.map((candidate, index) => ({
      candidateId: candidate.id,
      visualCheck: '仮Gemini確認として、候補区間の前後関係、字幕化しやすさ、短尺の始点と終点を確認対象にした',
      captionHint: candidate.hookText,
      risk: index === 0 ? 'low' : 'medium',
      nextAction: index === 0 ? 'use_for_edit_plan' : 'needs_manual_check'
    }))
  };
}

function buildEditPlan(candidates: CandidateArtifact, review: CandidateReviewArtifact): EditPlanArtifact {
  const preferredReview = review.reviewedCandidates.find((item) => item.nextAction === 'use_for_edit_plan');
  const selectedCandidate = candidates.candidates.find((candidate) => candidate.id === preferredReview?.candidateId)
    ?? candidates.candidates[0];
  if (!selectedCandidate) {
    throw new Error('編集案に使える候補がありません');
  }

  const middleMs = Math.round((selectedCandidate.sourceStartMs + selectedCandidate.sourceEndMs) / 2);
  return {
    kind: 'edit_plan_json',
    mode: 'zev-inspired-edit-plan-fixture',
    generatedAt: new Date().toISOString(),
    selectedCandidateId: selectedCandidate.id,
    title: selectedCandidate.title,
    hookText: selectedCandidate.hookText,
    sourceStartMs: selectedCandidate.sourceStartMs,
    sourceEndMs: selectedCandidate.sourceEndMs,
    renderSegments: [
      {
        sourceStartMs: selectedCandidate.sourceStartMs,
        sourceEndMs: middleMs,
        role: 'HOOK',
        caption: selectedCandidate.hookText
      },
      {
        sourceStartMs: middleMs,
        sourceEndMs: selectedCandidate.sourceEndMs,
        role: 'PAYOFF',
        caption: selectedCandidate.transcriptText.slice(-28)
      }
    ],
    telopPlan: [
      {
        atMs: 0,
        text: selectedCandidate.hookText,
        role: 'HOOK'
      },
      {
        atMs: middleMs - selectedCandidate.sourceStartMs,
        text: selectedCandidate.transcriptText.slice(-28),
        role: 'PAYOFF'
      }
    ]
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
        action: '候補区間を動画生成に渡せる連続区間へ確定',
        reason: 'ZEVのrender segment計算と同じく、編集案と動画生成の入力を分けるため'
      },
      {
        target: 'telopPlan',
        action: '冒頭と締めのテロップを仮配置',
        reason: '初期確認画面で編集案の意味を見られるようにするため'
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

async function renderFixtureVideo(request: AgentRequest, editPlan: EditPlanArtifact): Promise<ArtifactInfo> {
  const directory = requestArtifactDir(request);
  const outputPath = path.join(directory, OUTPUT_FILE_NAME_BY_KIND.output_video);
  const titleFile = path.join(directory, 'output-title.txt');
  await mkdir(directory, { recursive: true });
  await writeFile(titleFile, `${editPlan.title}\n${editPlan.hookText}`, 'utf8');
  const durationSeconds = Math.max(1, (editPlan.sourceEndMs - editPlan.sourceStartMs) / 1000);

  await runCommand('ffmpeg', [
    '-y',
    '-f',
    'lavfi',
    '-i',
    `testsrc2=s=1080x1920:d=${durationSeconds}`,
    '-c:v',
    'libx264',
    '-pix_fmt',
    'yuv420p',
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
    const segments = buildFixtureSegments(request);
    const transcript: TranscriptArtifact = {
      kind: 'transcript_json',
      mode: 'zev-inspired-fixture-stt',
      sourceUri: request.target.sourceUri,
      generatedAt: new Date().toISOString(),
      language: 'ja-JP',
      durationSec: Math.round((segments[segments.length - 1]?.endMs ?? 0) / 100) / 10,
      segmentCount: segments.length,
      segments,
      speechUnitGroups: buildSpeechUnitGroupsFromSegments(segments)
    };
    return writeJsonArtifact(request, 'transcript_json', transcript);
  }

  if (request.type === 'find_candidates') {
    const transcriptRef = findRequestOutputFileRef(state, request.requestDraftId, 'run_stt');
    if (!transcriptRef) {
      throw new Error('STT成果物がないため候補探索できません');
    }
    const transcript = await readArtifactByUrl<TranscriptArtifact>(transcriptRef.uri);
    return writeJsonArtifact(request, 'candidate_json', buildCandidates(transcript, request));
  }

  if (request.type === 'gemini_candidate_review') {
    const candidateRef = findRequestOutputFileRef(state, request.requestDraftId, 'find_candidates');
    if (!candidateRef) {
      throw new Error('候補成果物がないためGemini確認できません');
    }
    const candidates = await readArtifactByUrl<CandidateArtifact>(candidateRef.uri);
    return writeJsonArtifact(request, 'candidate_review_json', buildCandidateReview(candidates));
  }

  if (request.type === 'create_edit_plan') {
    const candidateRef = findRequestOutputFileRef(state, request.requestDraftId, 'find_candidates');
    const reviewRef = findRequestOutputFileRef(state, request.requestDraftId, 'gemini_candidate_review');
    if (!candidateRef || !reviewRef) {
      throw new Error('候補または確認結果がないため編集案を作れません');
    }
    const candidates = await readArtifactByUrl<CandidateArtifact>(candidateRef.uri);
    const review = await readArtifactByUrl<CandidateReviewArtifact>(reviewRef.uri);
    return writeJsonArtifact(request, 'edit_plan_json', buildEditPlan(candidates, review));
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

  if (request.type === 'find_candidates') {
    completion.decision = {
      decisionType: 'candidate_selection',
      decision: '候補探索結果を人間確認へ進める',
      reason: 'ZEVの発話まとまり方式を参考に、STT発話から候補JSONを作成したため、映像確認へ進める前に人間が確認できる',
      evidenceRefs: [
        {
          refId: artifact.uri,
          kind: 'file_ref',
          meaning: '候補JSONの実体'
        }
      ],
      proposedNextState: 'review_required',
      requiresHumanReview: true,
      humanQuestion: 'この候補探索結果を映像確認へ進めてよいか',
      ruleIds: ['control-plane:candidate-review-required', 'zev-reference:speech-unit-groups']
    };
  }

  if (request.type === 'apply_adjustment') {
    completion.decision = {
      decisionType: 'render_readiness',
      decision: '動画生成前に人間確認へ進める',
      reason: '編集案と微調整結果が成果物として保存されたため、動画生成へ進める前に人間が確認できる',
      evidenceRefs: [
        {
          refId: artifact.uri,
          kind: 'file_ref',
          meaning: '動画生成前の微調整JSON'
        }
      ],
      proposedNextState: 'review_required',
      requiresHumanReview: true,
      humanQuestion: 'この編集案で動画生成へ進めてよいか',
      ruleIds: ['control-plane:render-approval-required', 'zev-reference:render-segments']
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
