export type EditingRevision = string | number;
export type EditingTargetKind = 'caption' | 'connection';
export type EditingCheckStatus = 'unchecked' | 'checking' | 'applicable' | 'inapplicable' | 'failed' | 'stale';
export type CaptionPreset = 'normal' | 'color' | 'scale' | 'panel' | 'panel-graph-paper' | 'panel-comic-frame' | 'pulse' | 'bounce' | 'shake';
export type ConnectionPreset = 'normal-cut' | 'black-separator' | 'soft-separator';
export type PanelPalette = 'ivory' | 'cool' | 'warm' | 'dark';
export type EditingSelection = 'Normal' | 'Reset' | ConnectionPreset
  | { preset: 'normal' | 'scale' | 'panel-comic-frame' | 'bounce' | 'shake' }
  | { preset: 'panel' | 'panel-graph-paper'; paletteId?: PanelPalette }
  | { preset: 'color'; scope: 'whole-caption' }
  | { preset: 'color'; scope: 'partial-caption'; startUtf16: number; endUtf16: number; selectedText: string }
  | { preset: 'pulse'; anchorPeakId: string };

export interface EditingCaption {
  id: string;
  text: string;
  startFrame: number;
  endFrameExclusive: number;
  preset: string;
  presetLabel: string;
  hasOverride: boolean;
  status: string;
  statusLabel: string;
}

export interface EditingConnection {
  id: string;
  beforeText: string;
  afterText: string;
  boundaryFrame: number;
  preset: string;
  presetLabel: string;
  hasOverride: boolean;
  status: string;
  statusLabel: string;
}

export interface EditingMedia {
  id: string;
  url: string;
  kind: 'full' | 'preview';
  revision: EditingRevision;
  range: { startFrame: number; endFrameExclusive: number };
  isCurrent: boolean;
  createdAt: string;
  label: string;
}

export interface EditingJob {
  id: string;
  kind: 'preview' | 'full';
  status: 'running' | 'succeeded' | 'failed';
  revision: EditingRevision;
  phase: string;
  error?: string;
  mediaId?: string;
}

export interface EditingState {
  title: string;
  revision: EditingRevision;
  savedAt: string;
  fps: number;
  frameCount: number;
  csrfToken: string;
  captions: EditingCaption[];
  connections: EditingConnection[];
  media: EditingMedia[];
  job: EditingJob | null;
}

export interface EditingTarget {
  revision: EditingRevision;
  kind: EditingTargetKind;
  id: string;
  text?: string;
  beforeText?: string;
  afterText?: string;
  selection: EditingSelection;
  options: { value: string; label: string; status: EditingCheckStatus; reason?: string }[];
  peakOptions: { id: string; label: string; displaySeconds: number; status: EditingCheckStatus; reason?: string }[];
  paletteOptions?: {id: PanelPalette; label: string; backgroundColor: string; fontColor: string}[];
  colorRange?: { startUtf16: number; endUtf16: number };
}

export interface EditingCheckRequest {
  expectedRevision: EditingRevision;
  kind: EditingTargetKind;
  itemId: string;
  selection: EditingSelection;
}

export interface EditingCheckResult {
  revision: EditingRevision;
  kind: EditingTargetKind;
  itemId: string;
  selection: EditingSelection;
  checkKey: string;
  status: EditingCheckStatus;
  reason?: string;
}

export interface EditingPlayhead {
  captionIds: string[];
  connectionIds: string[];
  nearbyCaptionIds: string[];
  nearbyConnectionIds: string[];
  originalFrame: number | null;
  revision: EditingRevision;
}

export class EditingApiError extends Error {
  constructor(message: string, public readonly status: number, public readonly code?: string) {
    super(message);
    this.name = 'EditingApiError';
  }
}

const prefix = '/api/editing';

async function request<T>(pathname: string, options: RequestInit = {}): Promise<T> {
  let response: Response;
  try {
    response = await fetch(prefix + pathname, { credentials: 'same-origin', ...options });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error;
    throw new EditingApiError('ローカルの操作サービスに接続できません。接続を確認して再読み込みしてください。', 0);
  }
  const body = await response.json().catch(() => null) as T | { error?: string; code?: string } | null;
  if (!response.ok) {
    const failure = body as { error?: string; code?: string } | null;
    throw new EditingApiError(failure?.error ?? '処理を完了できませんでした。', response.status, failure?.code);
  }
  if (body === null) throw new EditingApiError('操作サービスからの応答を読み取れませんでした。', response.status);
  return body as T;
}

function post<T>(pathname: string, body: unknown, csrfToken: string): Promise<T> {
  return request<T>(pathname, { method: 'POST', headers: { 'Content-Type': 'application/json',
    'X-ZEV-Editing-Token': csrfToken }, body: JSON.stringify(body) });
}

export const fetchEditingState = () => request<EditingState>('/state');
export const fetchEditingTarget = (kind: EditingTargetKind, id: string) =>
  request<EditingTarget>('/targets/' + kind + '/' + encodeURIComponent(id));
export const checkEditingSelection = (body: EditingCheckRequest, csrfToken: string) =>
  post<EditingCheckResult>('/check', body, csrfToken);
export const saveEditingSelection = (body: { expectedRevision: EditingRevision; kind: EditingTargetKind;
  itemId: string; selection: EditingSelection }, csrfToken: string) => post<EditingState>('/save', body, csrfToken);
export const requestEditingJob = (body: { expectedRevision: EditingRevision; kind: 'preview' | 'full';
  target?: { kind: EditingTargetKind; itemId: string }; contextSeconds?: number }, csrfToken: string) =>
  post<EditingJob>('/jobs', body, csrfToken);
export const retryEditingJob = (jobId: string, csrfToken: string) =>
  post<EditingJob>('/retry', { jobId }, csrfToken);
export const fetchEditingPlayhead = (mediaId: string, seconds: number) => request<EditingPlayhead>(
  '/playhead?' + new URLSearchParams({ mediaId, seconds: String(seconds) }).toString());
export const seekEditingTarget = (mediaId: string, kind: EditingTargetKind, itemId: string) =>
  request<{ seconds: number | null; reason?: string }>('/seek?' + new URLSearchParams({ mediaId, kind, itemId }).toString());

const reasonLabels: Record<string, string> = {
  'Caption motion: the complete entrance, eight fully visible stable frames and common exit fade do not fit':
    '登場動作・安定表示・退場動作を入れる表示時間が足りません。',
  'Pulse Accent: the complete pulse and visible normal return do not fit this peak':
    '選んだ音のピークでは、動作して通常表示へ戻るまでの時間を確保できません。',
  'Pulse Accent: the measured peak itself is outside the caption':
    '選んだ音のピークが字幕の表示区間に含まれていません。',
};

export const editingReasonText = (reason: string): string => reasonLabels[reason] ?? reason;

const checkLabels: Record<EditingCheckStatus, string> = {
  unchecked: '未検査', checking: '検査中', applicable: '適用可能', inapplicable: '適用不能',
  failed: '検査失敗', stale: '再確認が必要',
};
export const editingCheckLabel = (status: EditingCheckStatus): string => checkLabels[status];

export function editingErrorText(error: unknown): string {
  return error instanceof Error ? editingReasonText(error.message) : '処理を完了できませんでした。';
}
