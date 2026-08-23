import {createHash} from 'node:crypto';
import {mkdir, readFile, writeFile} from 'node:fs/promises';
import path from 'node:path';

import {
  SEMANTIC_UTTERANCE_ARTIFACT_SCHEMA_V001,
  decodeSemanticUtteranceArtifactV001,
  type SemanticUtteranceArtifactV001
} from './semantic-utterance-artifact-v001.js';

export const COMMENT_VELOCITY_ANCHOR_ARTIFACT_SCHEMA_V001 = 'comment-velocity-anchor-artifact-v001';

export const COMMENT_VELOCITY_ANCHOR_ERROR_CODES_V001 = Object.freeze([
  'COMMENT_VELOCITY_INVALID',
  'COMMENT_VELOCITY_SHA_MISMATCH',
  'SEMANTIC_UTTERANCE_SHA_MISMATCH',
  'SOURCE_VIDEO_MISMATCH',
  'COMMENT_RANGE_UNKNOWN',
  'COMMENT_RANGE_DUPLICATE',
  'COMMENT_RANGE_ORDER_REVERSED',
  'ANCHOR_ARTIFACT_INVALID',
  'ANCHOR_BINDING_MISMATCH'
] as const);

export type CommentVelocityAnchorErrorCodeV001 =
  typeof COMMENT_VELOCITY_ANCHOR_ERROR_CODES_V001[number];

export class CommentVelocityAnchorArtifactErrorV001 extends Error {
  readonly code: CommentVelocityAnchorErrorCodeV001;

  constructor(code: CommentVelocityAnchorErrorCodeV001, message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'CommentVelocityAnchorArtifactErrorV001';
    this.code = code;
  }
}

type FormalFileBinding = {
  path: string;
  schemaVersion: string;
  fileSha256: string;
};

export type CommentVelocityAnchorArtifactV001 = {
  schemaVersion: typeof COMMENT_VELOCITY_ANCHOR_ARTIFACT_SCHEMA_V001;
  sourceVideoId: string;
  commentVelocityBinding: FormalFileBinding;
  semanticUtteranceBinding: FormalFileBinding;
  commentRangeCount: number;
  anchorCount: number;
  commentRanges: Array<{
    commentRangeId: string;
    minuteIndex: number;
    sourceStartMs: number;
    sourceEndMs: number;
    commentCount: number;
    relativeToStreamBaseline: number;
  }>;
  anchors: Array<{
    anchorId: string;
    ordinal: number;
    utteranceId: string;
    evidenceCommentRangeIds: string[];
  }>;
};

type BuildFromBytesInput = {
  commentVelocityPath: string;
  commentVelocityBytes: Uint8Array;
  semanticUtterancePath: string;
  semanticUtteranceBytes: Uint8Array;
  selectedMinuteIndexes: number[];
};

type BuildFromFilesInput = {
  workspaceRoot: string;
  commentVelocityPath: string;
  semanticUtterancePath: string;
  selectedMinuteIndexes: number[];
};

type WriteFromFilesInput = BuildFromFilesInput & {
  outputPath: string;
};

type CommentMinute = {
  minuteIndex: number;
  sourceStartMs: number;
  sourceEndMs: number;
  durationMs: number;
  commentCount: number;
  isFullMinute: boolean;
  relativeToStreamBaseline: number;
};

type CommentVelocityArtifact = {
  schemaVersion: number;
  sourceVideoId: string;
  minuteSeries: CommentMinute[];
};

const SHA256 = /^[0-9a-f]{64}$/u;
const FORMAL_ID = /^[A-Za-z0-9][A-Za-z0-9._-]*$/u;
const SOURCE_VIDEO_ID = /^[A-Za-z0-9_-]+$/u;
const WORKSPACE_RELATIVE_PATH = /^(?!\/)(?!\.\/)(?!.*(?:^|\/)\.\.(?:\/|$))(?!.*\\)(?!.*\/\/)[^\0]+$/u;
const ONE_MINUTE_MS = 60_000;

function fail(code: CommentVelocityAnchorErrorCodeV001, message: string, cause?: unknown): never {
  throw new CommentVelocityAnchorArtifactErrorV001(
    code,
    message,
    cause === undefined ? undefined : {cause}
  );
}

function sha256(bytes: Uint8Array): string {
  return createHash('sha256').update(bytes).digest('hex');
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function hasExactKeys(value: Record<string, unknown>, keys: string[]): boolean {
  const actual = Object.keys(value);
  return actual.length === keys.length && actual.every((key, index) => key === keys[index]);
}

function assertWorkspaceRelativePath(value: unknown, label: string): asserts value is string {
  if (typeof value !== 'string' || !WORKSPACE_RELATIVE_PATH.test(value)) {
    fail('ANCHOR_ARTIFACT_INVALID', `${label}はworkspace相対pathである必要があります`);
  }
}

function assertSafeNonNegativeInteger(value: unknown, label: string): asserts value is number {
  if (!Number.isSafeInteger(value) || (value as number) < 0) {
    fail('ANCHOR_ARTIFACT_INVALID', `${label}は0以上の安全な整数である必要があります`);
  }
}

function parseCommentVelocityArtifact(bytes: Uint8Array): CommentVelocityArtifact {
  let value: unknown;
  try {
    value = JSON.parse(Buffer.from(bytes).toString('utf8'));
  } catch (error) {
    fail('COMMENT_VELOCITY_INVALID', 'コメント流量成果物がJSONとして読めません', error);
  }
  if (!isRecord(value)
    || !Number.isSafeInteger(value.schemaVersion)
    || (value.schemaVersion as number) < 1
    || typeof value.sourceVideoId !== 'string'
    || !SOURCE_VIDEO_ID.test(value.sourceVideoId)
    || !Array.isArray(value.minuteSeries)
    || value.minuteSeries.length === 0) {
    fail('COMMENT_VELOCITY_INVALID', 'コメント流量成果物の基礎構造が不正です');
  }

  const seenMinuteIndexes = new Set<number>();
  const minuteSeries = value.minuteSeries.map((item, index): CommentMinute => {
    if (!isRecord(item)) {
      fail('COMMENT_VELOCITY_INVALID', `コメント流量の1分区間 ${index + 1}件目が不正です`);
    }
    const minuteIndex = item.minuteIndex;
    const sourceStartMs = item.sourceStartMs;
    const sourceEndMs = item.sourceEndMs;
    const durationMs = item.durationMs;
    const commentCount = item.commentCount;
    const isFullMinute = item.isFullMinute;
    const relativeToStreamBaseline = item.relativeToStreamBaseline;
    if (!Number.isSafeInteger(minuteIndex) || (minuteIndex as number) < 0
      || !Number.isSafeInteger(sourceStartMs) || (sourceStartMs as number) < 0
      || !Number.isSafeInteger(sourceEndMs) || (sourceEndMs as number) <= (sourceStartMs as number)
      || !Number.isSafeInteger(durationMs) || (durationMs as number) <= 0
      || !Number.isSafeInteger(commentCount) || (commentCount as number) < 0
      || typeof isFullMinute !== 'boolean'
      || (typeof relativeToStreamBaseline !== 'number' && relativeToStreamBaseline !== null)
      || (typeof relativeToStreamBaseline === 'number' && !Number.isFinite(relativeToStreamBaseline))) {
      fail('COMMENT_VELOCITY_INVALID', `コメント流量の1分区間 ${index + 1}件目の値が不正です`);
    }
    if (seenMinuteIndexes.has(minuteIndex as number)) {
      fail('COMMENT_VELOCITY_INVALID', `コメント流量のminuteIndex ${minuteIndex} が重複しています`);
    }
    seenMinuteIndexes.add(minuteIndex as number);
    return {
      minuteIndex: minuteIndex as number,
      sourceStartMs: sourceStartMs as number,
      sourceEndMs: sourceEndMs as number,
      durationMs: durationMs as number,
      commentCount: commentCount as number,
      isFullMinute,
      relativeToStreamBaseline: relativeToStreamBaseline as number
    };
  });
  return {
    schemaVersion: value.schemaVersion as number,
    sourceVideoId: value.sourceVideoId,
    minuteSeries
  };
}

function sourceVideoIdFromUri(sourceUri: string): string {
  let candidate = sourceUri;
  try {
    const parsed = new URL(sourceUri);
    if (parsed.hostname === 'youtu.be') {
      candidate = parsed.pathname.split('/').filter(Boolean)[0] ?? '';
    } else if (parsed.hostname.endsWith('youtube.com')) {
      candidate = parsed.searchParams.get('v') ?? path.basename(parsed.pathname);
    } else {
      candidate = path.basename(parsed.pathname);
    }
  } catch {
    candidate = path.basename(sourceUri.split(/[?#]/u, 1)[0]);
  }
  const extension = path.extname(candidate);
  const sourceVideoId = extension ? candidate.slice(0, -extension.length) : candidate;
  if (!SOURCE_VIDEO_ID.test(sourceVideoId)) {
    fail('SOURCE_VIDEO_MISMATCH', '正式意味発話成果物の動画参照から元動画IDを一意に解決できません');
  }
  return sourceVideoId;
}

function resolveSelectedMinutes(
  commentVelocity: CommentVelocityArtifact,
  selectedMinuteIndexes: number[]
): CommentMinute[] {
  if (!Array.isArray(selectedMinuteIndexes) || selectedMinuteIndexes.length === 0) {
    fail('COMMENT_RANGE_UNKNOWN', '接続対象のコメント1分区間が指定されていません');
  }
  const byIndex = new Map(commentVelocity.minuteSeries.map((minute) => [minute.minuteIndex, minute]));
  const seen = new Set<number>();
  const selected: CommentMinute[] = [];
  for (const [index, minuteIndex] of selectedMinuteIndexes.entries()) {
    if (!Number.isSafeInteger(minuteIndex) || minuteIndex < 0 || !byIndex.has(minuteIndex)) {
      fail('COMMENT_RANGE_UNKNOWN', `指定されたminuteIndex ${minuteIndex} がコメント流量成果物にありません`);
    }
    if (seen.has(minuteIndex)) {
      fail('COMMENT_RANGE_DUPLICATE', `minuteIndex ${minuteIndex} が複数回指定されています`);
    }
    const minute = byIndex.get(minuteIndex)!;
    if (!minute.isFullMinute
      || minute.durationMs !== ONE_MINUTE_MS
      || minute.sourceEndMs - minute.sourceStartMs !== ONE_MINUTE_MS
      || !Number.isFinite(minute.relativeToStreamBaseline)) {
      fail('COMMENT_VELOCITY_INVALID', `minuteIndex ${minuteIndex} は完全な1分区間ではありません`);
    }
    if (index > 0 && minute.sourceStartMs < selected[index - 1].sourceStartMs) {
      fail('COMMENT_RANGE_ORDER_REVERSED', '接続対象のコメント1分区間が時系列順ではありません');
    }
    seen.add(minuteIndex);
    selected.push(minute);
  }
  return selected;
}

function overlapsPositively(
  leftStartMs: number,
  leftEndMs: number,
  rightStartMs: number,
  rightEndMs: number
): boolean {
  return leftStartMs < rightEndMs && leftEndMs > rightStartMs;
}

function commentRangeId(minuteIndex: number): string {
  return `comment-minute-${String(minuteIndex).padStart(6, '0')}`;
}

export function buildCommentVelocityAnchorArtifactFromBytesV001(
  input: BuildFromBytesInput
): CommentVelocityAnchorArtifactV001 {
  assertWorkspaceRelativePath(input.commentVelocityPath, '元コメント流量成果物のpath');
  assertWorkspaceRelativePath(input.semanticUtterancePath, '正式意味発話成果物のpath');
  const commentVelocity = parseCommentVelocityArtifact(input.commentVelocityBytes);
  const semanticUtterances = decodeSemanticUtteranceArtifactV001(input.semanticUtteranceBytes);
  const semanticSourceVideoId = sourceVideoIdFromUri(semanticUtterances.sourceUri);
  if (commentVelocity.sourceVideoId !== semanticSourceVideoId) {
    fail(
      'SOURCE_VIDEO_MISMATCH',
      `コメント流量の元動画 ${commentVelocity.sourceVideoId} と正式意味発話の元動画 ${semanticSourceVideoId} が一致しません`
    );
  }
  const selectedMinutes = resolveSelectedMinutes(commentVelocity, input.selectedMinuteIndexes);
  const commentRanges = selectedMinutes.map((minute) => ({
    commentRangeId: commentRangeId(minute.minuteIndex),
    minuteIndex: minute.minuteIndex,
    sourceStartMs: minute.sourceStartMs,
    sourceEndMs: minute.sourceEndMs,
    commentCount: minute.commentCount,
    relativeToStreamBaseline: minute.relativeToStreamBaseline
  }));

  const anchors = semanticUtterances.utterances.flatMap((utterance) => {
    const evidenceCommentRangeIds = commentRanges
      .filter((range) => overlapsPositively(
        utterance.sourceStartMs,
        utterance.sourceEndMs,
        range.sourceStartMs,
        range.sourceEndMs
      ))
      .map((range) => range.commentRangeId);
    if (evidenceCommentRangeIds.length === 0) {
      return [];
    }
    return [{
      anchorId: `comment-anchor-${String(utterance.ordinal).padStart(6, '0')}`,
      ordinal: utterance.ordinal,
      utteranceId: utterance.utteranceId,
      evidenceCommentRangeIds
    }];
  });

  return {
    schemaVersion: COMMENT_VELOCITY_ANCHOR_ARTIFACT_SCHEMA_V001,
    sourceVideoId: commentVelocity.sourceVideoId,
    commentVelocityBinding: {
      path: input.commentVelocityPath,
      schemaVersion: `chat-velocity-analysis-v${String(commentVelocity.schemaVersion).padStart(3, '0')}`,
      fileSha256: sha256(input.commentVelocityBytes)
    },
    semanticUtteranceBinding: {
      path: input.semanticUtterancePath,
      schemaVersion: SEMANTIC_UTTERANCE_ARTIFACT_SCHEMA_V001,
      fileSha256: sha256(input.semanticUtteranceBytes)
    },
    commentRangeCount: commentRanges.length,
    anchorCount: anchors.length,
    commentRanges,
    anchors
  };
}

export async function buildCommentVelocityAnchorArtifactFromFilesV001(
  input: BuildFromFilesInput
): Promise<CommentVelocityAnchorArtifactV001> {
  assertWorkspaceRelativePath(input.commentVelocityPath, '元コメント流量成果物のpath');
  assertWorkspaceRelativePath(input.semanticUtterancePath, '正式意味発話成果物のpath');
  const [commentVelocityBytes, semanticUtteranceBytes] = await Promise.all([
    readFile(path.join(input.workspaceRoot, input.commentVelocityPath)),
    readFile(path.join(input.workspaceRoot, input.semanticUtterancePath))
  ]);
  return buildCommentVelocityAnchorArtifactFromBytesV001({
    commentVelocityPath: input.commentVelocityPath,
    commentVelocityBytes,
    semanticUtterancePath: input.semanticUtterancePath,
    semanticUtteranceBytes,
    selectedMinuteIndexes: input.selectedMinuteIndexes
  });
}

export function serializeCommentVelocityAnchorArtifactV001(
  artifact: CommentVelocityAnchorArtifactV001
): Buffer {
  assertCommentVelocityAnchorArtifactV001(artifact);
  return Buffer.from(`${JSON.stringify(artifact, null, 2)}\n`, 'utf8');
}

export async function writeCommentVelocityAnchorArtifactFromFilesV001(
  input: WriteFromFilesInput
): Promise<{artifact: CommentVelocityAnchorArtifactV001; bytes: Buffer}> {
  assertWorkspaceRelativePath(input.outputPath, '出力path');
  const artifact = await buildCommentVelocityAnchorArtifactFromFilesV001(input);
  const bytes = serializeCommentVelocityAnchorArtifactV001(artifact);
  const absoluteOutputPath = path.join(input.workspaceRoot, input.outputPath);
  await mkdir(path.dirname(absoluteOutputPath), {recursive: true});
  await writeFile(absoluteOutputPath, bytes, {flag: 'wx'});
  return {artifact, bytes};
}

function assertFormalBinding(value: unknown, label: string): asserts value is FormalFileBinding {
  if (!isRecord(value)
    || !hasExactKeys(value, ['path', 'schemaVersion', 'fileSha256'])
    || typeof value.schemaVersion !== 'string'
    || !FORMAL_ID.test(value.schemaVersion)
    || typeof value.fileSha256 !== 'string'
    || !SHA256.test(value.fileSha256)) {
    fail('ANCHOR_ARTIFACT_INVALID', `${label}が不正です`);
  }
  assertWorkspaceRelativePath(value.path, `${label}のpath`);
}

export function assertCommentVelocityAnchorArtifactV001(
  value: unknown
): asserts value is CommentVelocityAnchorArtifactV001 {
  if (!isRecord(value) || !hasExactKeys(value, [
    'schemaVersion',
    'sourceVideoId',
    'commentVelocityBinding',
    'semanticUtteranceBinding',
    'commentRangeCount',
    'anchorCount',
    'commentRanges',
    'anchors'
  ])) {
    fail('ANCHOR_ARTIFACT_INVALID', 'コメント流量アンカー成果物のroot構造が不正です');
  }
  if (value.schemaVersion !== COMMENT_VELOCITY_ANCHOR_ARTIFACT_SCHEMA_V001
    || typeof value.sourceVideoId !== 'string'
    || !SOURCE_VIDEO_ID.test(value.sourceVideoId)) {
    fail('ANCHOR_ARTIFACT_INVALID', 'コメント流量アンカー成果物の版または元動画IDが不正です');
  }
  assertFormalBinding(value.commentVelocityBinding, '元コメント流量成果物binding');
  assertFormalBinding(value.semanticUtteranceBinding, '正式意味発話成果物binding');
  if (value.semanticUtteranceBinding.schemaVersion !== SEMANTIC_UTTERANCE_ARTIFACT_SCHEMA_V001
    || !Array.isArray(value.commentRanges)
    || !Array.isArray(value.anchors)
    || value.commentRangeCount !== value.commentRanges.length
    || value.anchorCount !== value.anchors.length) {
    fail('ANCHOR_ARTIFACT_INVALID', 'コメント流量アンカー成果物の件数またはbinding版が不正です');
  }

  const knownRangeIds = new Set<string>();
  for (const [index, item] of value.commentRanges.entries()) {
    if (!isRecord(item) || !hasExactKeys(item, [
      'commentRangeId', 'minuteIndex', 'sourceStartMs', 'sourceEndMs',
      'commentCount', 'relativeToStreamBaseline'
    ])) {
      fail('ANCHOR_ARTIFACT_INVALID', `コメント区間 ${index + 1}件目の構造が不正です`);
    }
    assertSafeNonNegativeInteger(item.minuteIndex, `コメント区間 ${index + 1}件目のminuteIndex`);
    assertSafeNonNegativeInteger(item.sourceStartMs, `コメント区間 ${index + 1}件目の開始時刻`);
    assertSafeNonNegativeInteger(item.sourceEndMs, `コメント区間 ${index + 1}件目の終了時刻`);
    assertSafeNonNegativeInteger(item.commentCount, `コメント区間 ${index + 1}件目のコメント数`);
    if (item.commentRangeId !== commentRangeId(item.minuteIndex)
      || item.sourceEndMs - item.sourceStartMs !== ONE_MINUTE_MS
      || typeof item.relativeToStreamBaseline !== 'number'
      || !Number.isFinite(item.relativeToStreamBaseline)
      || knownRangeIds.has(item.commentRangeId)) {
      fail('ANCHOR_ARTIFACT_INVALID', `コメント区間 ${index + 1}件目の値が不正です`);
    }
    knownRangeIds.add(item.commentRangeId);
  }

  const knownUtteranceIds = new Set<string>();
  for (const [index, item] of value.anchors.entries()) {
    if (!isRecord(item) || !hasExactKeys(item, [
      'anchorId', 'ordinal', 'utteranceId', 'evidenceCommentRangeIds'
    ])) {
      fail('ANCHOR_ARTIFACT_INVALID', `アンカー ${index + 1}件目の構造が不正です`);
    }
    if (!Number.isSafeInteger(item.ordinal) || (item.ordinal as number) < 1
      || item.anchorId !== `comment-anchor-${String(item.ordinal).padStart(6, '0')}`
      || typeof item.utteranceId !== 'string'
      || !FORMAL_ID.test(item.utteranceId)
      || knownUtteranceIds.has(item.utteranceId)
      || !Array.isArray(item.evidenceCommentRangeIds)
      || item.evidenceCommentRangeIds.length === 0) {
      fail('ANCHOR_ARTIFACT_INVALID', `アンカー ${index + 1}件目のID・順序・根拠が不正です`);
    }
    const evidenceIds = item.evidenceCommentRangeIds;
    if (new Set(evidenceIds).size !== evidenceIds.length
      || evidenceIds.some((rangeId) => typeof rangeId !== 'string' || !knownRangeIds.has(rangeId))) {
      fail('ANCHOR_ARTIFACT_INVALID', `アンカー ${index + 1}件目が未知または重複したコメント区間を参照しています`);
    }
    knownUtteranceIds.add(item.utteranceId);
  }
}

export function decodeCommentVelocityAnchorArtifactV001(
  bytes: Uint8Array
): CommentVelocityAnchorArtifactV001 {
  let value: unknown;
  try {
    value = JSON.parse(Buffer.from(bytes).toString('utf8'));
  } catch (error) {
    fail('ANCHOR_ARTIFACT_INVALID', 'コメント流量アンカー成果物がJSONとして読めません', error);
  }
  assertCommentVelocityAnchorArtifactV001(value);
  return value;
}

export function validateCommentVelocityAnchorArtifactAgainstInputsV001(
  artifact: unknown,
  input: BuildFromBytesInput
): void {
  assertCommentVelocityAnchorArtifactV001(artifact);
  if (artifact.commentVelocityBinding.path !== input.commentVelocityPath
    || artifact.semanticUtteranceBinding.path !== input.semanticUtterancePath) {
    fail('ANCHOR_BINDING_MISMATCH', 'コメント流量アンカー成果物が束縛する入力pathと実入力が一致しません');
  }
  if (artifact.commentVelocityBinding.fileSha256 !== sha256(input.commentVelocityBytes)) {
    fail('COMMENT_VELOCITY_SHA_MISMATCH', '元コメント流量成果物のSHA-256がbindingと一致しません');
  }
  if (artifact.semanticUtteranceBinding.fileSha256 !== sha256(input.semanticUtteranceBytes)) {
    fail('SEMANTIC_UTTERANCE_SHA_MISMATCH', '正式意味発話成果物のSHA-256がbindingと一致しません');
  }
  const rebuilt = buildCommentVelocityAnchorArtifactFromBytesV001(input);
  if (!serializeCommentVelocityAnchorArtifactV001(artifact)
    .equals(serializeCommentVelocityAnchorArtifactV001(rebuilt))) {
    fail('ANCHOR_BINDING_MISMATCH', 'コメント流量アンカー成果物が入力からの決定的再構築結果と一致しません');
  }
}
