import {createHash} from 'node:crypto';
import {mkdir, readFile, writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

import {
  COMMENT_VELOCITY_MINUTE_SERIES_SCHEMA_ID_V001,
  COMMENT_VELOCITY_MINUTE_SERIES_SCHEMA_VERSION_V001,
  decodeCommentVelocityMinuteSeriesArtifactV001,
  validateCommentVelocityMinuteSeriesArtifactAgainstRawChatBytesV001,
  type CommentVelocityMinuteSeriesArtifactV001
} from './comment-velocity-minute-series-artifact-v001.js';
import {
  DISTANT_CONNECTION_COMMON_UTTERANCE_ARTIFACT_SCHEMA_V001,
  decodeDistantConnectionCommonUtteranceArtifactV001,
  validateDistantConnectionCommonUtteranceArtifactAgainstTranscriptBytesV001,
  type DistantConnectionCommonUtteranceArtifactV001,
  type DistantConnectionCommonUtteranceV001
} from './distant-connection-common-utterance-artifact-v001.js';
import {
  SOURCE_VIDEO_TRANSCRIPT_REUSE_ARTIFACT_SCHEMA_V001,
  buildSourceVideoTranscriptReuseArtifactFromFilesV001,
  decodeSourceVideoTranscriptReuseArtifactV001,
  serializeSourceVideoTranscriptReuseArtifactV001,
  validateSourceVideoTranscriptReuseArtifactAgainstBytesV001,
  type SourceVideoTranscriptReuseArtifactV001
} from './source-video-transcript-reuse-artifact-v001.js';

export const DISTANT_CONNECTION_COMPARISON_SOURCE_PACKAGE_SCHEMA_V001 =
  'distant-connection-comparison-source-package-v001';
export const DISTANT_CONNECTION_COMPARISON_INDEX_RESPONSE_SCHEMA_V001 =
  'distant-connection-comparison-index-response-v001';
export const DISTANT_CONNECTION_COMPARISON_REFERENCE_MODE_V001 =
  'zero-based-index-only-v001';
export const DISTANT_CONNECTION_COMPARISON_FORMAL_ID_RESOLUTION_V001 =
  'deterministic-local-only-v001';

export const DISTANT_CONNECTION_COMPARISON_SOURCE_PACKAGE_ERROR_CODES_V001 = Object.freeze([
  'INPUT_INVALID',
  'SOURCE_REUSE_INVALID',
  'COMMON_UTTERANCE_INVALID',
  'COMMENT_VELOCITY_INVALID',
  'SOURCE_VIDEO_MISMATCH',
  'SOURCE_DURATION_MISMATCH',
  'TRANSCRIPT_BINDING_MISMATCH',
  'SOURCE_PACKAGE_INVALID',
  'SOURCE_PACKAGE_BINDING_MISMATCH',
  'UTTERANCE_DUPLICATE',
  'UTTERANCE_MISSING',
  'UTTERANCE_ORDER_REVERSED',
  'ANCHOR_DUPLICATE',
  'ANCHOR_MISSING',
  'ANCHOR_UNKNOWN_UTTERANCE',
  'ANCHOR_EVIDENCE_MISMATCH'
] as const);

export type DistantConnectionComparisonSourcePackageErrorCodeV001 =
  typeof DISTANT_CONNECTION_COMPARISON_SOURCE_PACKAGE_ERROR_CODES_V001[number];

export class DistantConnectionComparisonSourcePackageErrorV001 extends Error {
  readonly code: DistantConnectionComparisonSourcePackageErrorCodeV001;

  constructor(
    code: DistantConnectionComparisonSourcePackageErrorCodeV001,
    message: string,
    options?: ErrorOptions
  ) {
    super(message, options);
    this.name = 'DistantConnectionComparisonSourcePackageErrorV001';
    this.code = code;
  }
}

export type DistantConnectionComparisonFormalFileBindingV001 = {
  path: string;
  schemaVersion: string;
  fileSha256: string;
};

export type DistantConnectionComparisonCommentVelocityBindingV001 = {
  path: string;
  schemaId: typeof COMMENT_VELOCITY_MINUTE_SERIES_SCHEMA_ID_V001;
  schemaVersion: typeof COMMENT_VELOCITY_MINUTE_SERIES_SCHEMA_VERSION_V001;
  fileSha256: string;
};

export type DistantConnectionComparisonSelectedMinuteV001 = {
  minuteIndex: number;
  sourceStartMs: number;
  sourceEndMs: number;
  commentCount: number;
  relativeToStreamBaseline: number;
};

export type DistantConnectionComparisonAnchorEvidenceV001 =
  DistantConnectionComparisonSelectedMinuteV001;

export type DistantConnectionComparisonAnchorV001 = {
  anchorId: string;
  utteranceId: string;
  evidenceRanges: DistantConnectionComparisonAnchorEvidenceV001[];
};

export type DistantConnectionComparisonSourcePackageV001 = {
  schemaVersion: typeof DISTANT_CONNECTION_COMPARISON_SOURCE_PACKAGE_SCHEMA_V001;
  sourceVideoId: string;
  sourceReuseBinding: DistantConnectionComparisonFormalFileBindingV001;
  commonUtteranceBinding: DistantConnectionComparisonFormalFileBindingV001;
  commentVelocityBinding: DistantConnectionComparisonCommentVelocityBindingV001;
  selectionPolicy: {
    minuteDurationMs: 60_000;
    fullMinutesOnly: true;
    relativeToStreamBaselineOperator: 'strictly-greater-than';
    relativeToStreamBaselineReferenceValue: 1;
    topNUsed: false;
  };
  plannedExecution: {
    providerId: 'openai-api';
    modelId: 'gpt-5.6-luna';
    operationId: 'responses';
    reasoningEffort: 'medium';
    store: false;
  };
  explorationTask: {
    objective: string;
    anchorInstruction: string;
    returnInstruction: string;
    boundaryMeaning: string;
  };
  sourceSegmentCount: number;
  utteranceCount: number;
  selectedMinuteCount: number;
  anchorCount: number;
  utterances: DistantConnectionCommonUtteranceV001[];
  selectedMinutes: DistantConnectionComparisonSelectedMinuteV001[];
  anchors: DistantConnectionComparisonAnchorV001[];
  responseContract: {
    schemaVersion: typeof DISTANT_CONNECTION_COMPARISON_INDEX_RESPONSE_SCHEMA_V001;
    sourcePackagePath: string;
    referenceMode: typeof DISTANT_CONNECTION_COMPARISON_REFERENCE_MODE_V001;
    formalIdResolution: typeof DISTANT_CONNECTION_COMPARISON_FORMAL_ID_RESOLUTION_V001;
  };
};

export type BuildDistantConnectionComparisonSourcePackageFromBytesInputV001 = {
  workspaceRoot: string;
  sourceReusePath: string;
  sourceReuseBytes: Uint8Array;
  commonUtterancePath: string;
  commonUtteranceBytes: Uint8Array;
  commentVelocityPath: string;
  commentVelocityBytes: Uint8Array;
  sourcePackagePath: string;
  sourceVideoBytes: Uint8Array;
  sourceTranscriptBytes: Uint8Array;
  rawChatReplayBytes: Uint8Array;
};

export type BuildDistantConnectionComparisonSourcePackageFromFilesInputV001 = Omit<
  BuildDistantConnectionComparisonSourcePackageFromBytesInputV001,
  | 'sourceReuseBytes'
  | 'commonUtteranceBytes'
  | 'commentVelocityBytes'
  | 'sourceVideoBytes'
  | 'sourceTranscriptBytes'
  | 'rawChatReplayBytes'
>;

export type WriteDistantConnectionComparisonSourcePackageFromFilesInputV001 =
  BuildDistantConnectionComparisonSourcePackageFromFilesInputV001 & {
    outputPath: string;
  };

type DistantConnectionComparisonArtifactInputV001 = Pick<
  BuildDistantConnectionComparisonSourcePackageFromBytesInputV001,
  | 'sourceReusePath'
  | 'sourceReuseBytes'
  | 'commonUtterancePath'
  | 'commonUtteranceBytes'
  | 'commentVelocityPath'
  | 'commentVelocityBytes'
  | 'sourcePackagePath'
>;

type RecordValue = Record<string, unknown>;

const MINUTE_MS = 60_000 as const;
const SHA256 = /^[0-9a-f]{64}$/u;
const SOURCE_VIDEO_ID = /^[A-Za-z0-9_-]+$/u;
const WORKSPACE_RELATIVE_PATH =
  /^(?!\/)(?!\.\/)(?!.*(?:^|\/)\.\.(?:\/|$))(?!.*\\)(?!.*\/\/)[^\0]+$/u;
const FORMAL_ANCHOR_ID = /^comparison-anchor-[0-9]{6}$/u;

const SELECTION_POLICY = Object.freeze({
  minuteDurationMs: MINUTE_MS,
  fullMinutesOnly: true,
  relativeToStreamBaselineOperator: 'strictly-greater-than',
  relativeToStreamBaselineReferenceValue: 1,
  topNUsed: false
} as const);

const PLANNED_EXECUTION = Object.freeze({
  providerId: 'openai-api',
  modelId: 'gpt-5.6-luna',
  operationId: 'responses',
  reasoningEffort: 'medium',
  store: false
} as const);

const EXPLORATION_TASK = Object.freeze({
  objective:
    '各コメント流量アンカーについて、配信全文から時間的に離れた過去または未来の相方を探してください。前振りと回収、予告と実現、原因と後の結果、過去の発言と後の反応、認識・予想と後の出来事、約束・宣言と後の実行、疑問と後の答え、以前の出来事によって後の意味が変わる関係は例であり、閉じた分類ではありません。前半の具体的な情報、出来事、予告、認識または判断が、後半の具体的な出来事、回収、変化、反応または結果として現れ、前から後の順に短く見る価値が生まれる接続だけを候補にしてください。',
  anchorInstruction:
    'directionはanchorから見た相方の位置を表します。futureの場合はanchor発話をfirstPartに含め、相方を未来側のsecondPartに置いてください。pastの場合はanchor発話をsecondPartに含め、相方を過去側のfirstPartに置いてください。anchorと発話は入力にある0-based indexだけで参照してください。',
  returnInstruction:
    '同じゲーム、人物、設定または話題に属するだけ、一般的な背景説明が後半にも当てはまるだけ、単なるオープニングとエンディングの対応、または冒頭の一般説明と終了時総括が時系列上で対称なだけの接続は返さないでください。後半が同じ対象に触れるだけ、前半を単に言い換える、確認する、または自然な具体例として示すだけでも不十分です。前半を外しても後半の理解や面白さがほぼ変わらない接続は返さないでください。前半の具体的な内容が後半の具体的な出来事、反応または結果によって強く回収され、前半を付けることで後半の理解、回収感、意外性または面白さの少なくとも一つが明確に増える必要があります。一般説明そのものは禁止しませんが、後半が具体的に強く回収する場合だけ候補にしてください。普通の視聴者が前半から後半だけを短尺で見て接続を理解でき、外部説明を必要としない候補だけを返してください。意味関係を理解する前提情報が短尺として自然な長さに収まり、長い説明、複雑な前提または大幅な区間拡張を必要としないことも条件です。',
  boundaryMeaning:
    '返す0-based発話indexは意味探索の根拠であり、完成動画の最終切り出し位置ではありません。必要最小限の導入文脈や自然な終端は後続の区間化工程が決めます。正式発話ID、正式anchor IDおよびcandidate IDは返さず、入力範囲内のindexだけを返してください。正式IDへの解決は後続の決定論的なローカル処理だけが行います。'
});

function fail(
  code: DistantConnectionComparisonSourcePackageErrorCodeV001,
  message: string,
  cause?: unknown
): never {
  throw new DistantConnectionComparisonSourcePackageErrorV001(
    code,
    message,
    cause === undefined ? undefined : {cause}
  );
}

function sha256(bytes: Uint8Array): string {
  return createHash('sha256').update(bytes).digest('hex');
}

function isRecord(value: unknown): value is RecordValue {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function hasExactKeys(value: RecordValue, keys: readonly string[]): boolean {
  const actual = Object.keys(value);
  return actual.length === keys.length && actual.every((key, index) => key === keys[index]);
}

function assertWorkspaceRelativePath(value: unknown, label: string): asserts value is string {
  if (typeof value !== 'string' || !WORKSPACE_RELATIVE_PATH.test(value)) {
    fail('INPUT_INVALID', `${label}はworkspace相対pathである必要があります`);
  }
}

function assertWorkspaceRoot(value: unknown): asserts value is string {
  if (typeof value !== 'string' || !path.isAbsolute(value)) {
    fail('INPUT_INVALID', 'workspace rootは絶対pathである必要があります');
  }
}

function assertSha256(value: unknown, label: string): asserts value is string {
  if (typeof value !== 'string' || !SHA256.test(value)) {
    fail('SOURCE_PACKAGE_INVALID', `${label}がSHA-256ではありません`);
  }
}

function assertNonNegativeSafeInteger(value: unknown, label: string): asserts value is number {
  if (!Number.isSafeInteger(value) || (value as number) < 0) {
    fail('SOURCE_PACKAGE_INVALID', `${label}が0以上の安全な整数ではありません`);
  }
}

function assertPositiveSafeInteger(value: unknown, label: string): asserts value is number {
  if (!Number.isSafeInteger(value) || (value as number) < 1) {
    fail('SOURCE_PACKAGE_INVALID', `${label}が正の安全な整数ではありません`);
  }
}

function assertFiniteNumber(value: unknown, label: string): asserts value is number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    fail('SOURCE_PACKAGE_INVALID', `${label}が有限数ではありません`);
  }
}

function sourceVideoIdFromUri(sourceUri: string): string {
  let candidate = sourceUri;
  try {
    const parsed = new URL(sourceUri);
    if (parsed.hostname === 'youtu.be') {
      candidate = parsed.pathname.split('/').filter(Boolean)[0] ?? '';
    } else if (parsed.hostname.endsWith('youtube.com')) {
      candidate = parsed.searchParams.get('v') ?? path.basename(parsed.pathname);
    } else if (parsed.protocol === 'file:') {
      candidate = path.basename(fileURLToPath(parsed));
    } else {
      candidate = path.basename(parsed.pathname);
    }
  } catch {
    candidate = path.basename(sourceUri.split(/[?#]/u, 1)[0]);
  }
  const extension = path.extname(candidate);
  const sourceVideoId = extension ? candidate.slice(0, -extension.length) : candidate;
  if (!SOURCE_VIDEO_ID.test(sourceVideoId)) {
    fail('SOURCE_VIDEO_MISMATCH', '共通発話のsource URIから元動画IDを一意に解決できません');
  }
  return sourceVideoId;
}

function assertFormalBinding(
  value: unknown,
  label: string,
  expectedSchemaVersion: string
): asserts value is DistantConnectionComparisonFormalFileBindingV001 {
  if (!isRecord(value) || !hasExactKeys(value, ['path', 'schemaVersion', 'fileSha256'])) {
    fail('SOURCE_PACKAGE_INVALID', `${label}の構造が不正です`);
  }
  assertWorkspaceRelativePath(value.path, `${label}のpath`);
  if (value.schemaVersion !== expectedSchemaVersion) {
    fail('SOURCE_PACKAGE_INVALID', `${label}のschema版が不正です`);
  }
  assertSha256(value.fileSha256, `${label}のSHA-256`);
}

function assertCommentVelocityBinding(
  value: unknown
): asserts value is DistantConnectionComparisonCommentVelocityBindingV001 {
  if (!isRecord(value) || !hasExactKeys(value, [
    'path', 'schemaId', 'schemaVersion', 'fileSha256'
  ])) {
    fail('SOURCE_PACKAGE_INVALID', '正式コメント流量bindingの構造が不正です');
  }
  assertWorkspaceRelativePath(value.path, '正式コメント流量bindingのpath');
  if (value.schemaId !== COMMENT_VELOCITY_MINUTE_SERIES_SCHEMA_ID_V001
    || value.schemaVersion !== COMMENT_VELOCITY_MINUTE_SERIES_SCHEMA_VERSION_V001) {
    fail('SOURCE_PACKAGE_INVALID', '正式コメント流量bindingのschemaが不正です');
  }
  assertSha256(value.fileSha256, '正式コメント流量bindingのSHA-256');
}

function assertSelectionPolicy(value: unknown): void {
  if (!isRecord(value)
    || !hasExactKeys(value, [
      'minuteDurationMs',
      'fullMinutesOnly',
      'relativeToStreamBaselineOperator',
      'relativeToStreamBaselineReferenceValue',
      'topNUsed'
    ])
    || JSON.stringify(value) !== JSON.stringify(SELECTION_POLICY)) {
    fail('SOURCE_PACKAGE_INVALID', 'コメント流量区間の固定選択条件が不正です');
  }
}

function assertPlannedExecution(value: unknown): void {
  if (!isRecord(value)
    || !hasExactKeys(value, [
      'providerId', 'modelId', 'operationId', 'reasoningEffort', 'store'
    ])
    || JSON.stringify(value) !== JSON.stringify(PLANNED_EXECUTION)) {
    fail('SOURCE_PACKAGE_INVALID', 'provider/model/operation/reasoning/store予定値が不正です');
  }
}

function assertExplorationTask(value: unknown): void {
  if (!isRecord(value)
    || !hasExactKeys(value, [
      'objective', 'anchorInstruction', 'returnInstruction', 'boundaryMeaning'
    ])
    || JSON.stringify(value) !== JSON.stringify(EXPLORATION_TASK)) {
    fail('SOURCE_PACKAGE_INVALID', '一般探索指示が正式値と一致しません');
  }
}

function assertCommonUtterance(
  value: unknown,
  index: number,
  seenSegmentIds: Set<number>
): asserts value is DistantConnectionCommonUtteranceV001 {
  if (!isRecord(value) || !hasExactKeys(value, [
    'utteranceId', 'ordinal', 'sourceStartMs', 'sourceEndMs', 'text', 'sourceSegmentIds'
  ])) {
    fail('SOURCE_PACKAGE_INVALID', `正式発話 ${index + 1}件目の構造が不正です`);
  }
  if (value.utteranceId !== `common-utterance-${String(index + 1).padStart(6, '0')}`
    || value.ordinal !== index + 1
    || typeof value.text !== 'string'
    || value.text.trim().length === 0) {
    fail('SOURCE_PACKAGE_INVALID', `正式発話 ${index + 1}件目のID・順序・本文が不正です`);
  }
  assertNonNegativeSafeInteger(value.sourceStartMs, `正式発話 ${index + 1}件目の開始時刻`);
  assertNonNegativeSafeInteger(value.sourceEndMs, `正式発話 ${index + 1}件目の終了時刻`);
  if ((value.sourceEndMs as number) < (value.sourceStartMs as number)
    || !Array.isArray(value.sourceSegmentIds)
    || value.sourceSegmentIds.length === 0) {
    fail('SOURCE_PACKAGE_INVALID', `正式発話 ${index + 1}件目の時刻・元断片参照が不正です`);
  }
  for (const segmentId of value.sourceSegmentIds) {
    if (!Number.isSafeInteger(segmentId) || segmentId <= 0) {
      fail('SOURCE_PACKAGE_INVALID', `正式発話 ${index + 1}件目の元断片IDが不正です`);
    }
    if (seenSegmentIds.has(segmentId)) {
      fail('UTTERANCE_DUPLICATE', `元STT断片ID ${segmentId} が複数の正式発話に所属しています`);
    }
    seenSegmentIds.add(segmentId);
  }
}

function assertSelectedMinute(
  value: unknown,
  index: number,
  previousMinuteIndex: number
): asserts value is DistantConnectionComparisonSelectedMinuteV001 {
  if (!isRecord(value) || !hasExactKeys(value, [
    'minuteIndex',
    'sourceStartMs',
    'sourceEndMs',
    'commentCount',
    'relativeToStreamBaseline'
  ])) {
    fail('SOURCE_PACKAGE_INVALID', `選択コメント区間 ${index + 1}件目の構造が不正です`);
  }
  assertNonNegativeSafeInteger(value.minuteIndex, `選択コメント区間 ${index + 1}件目の番号`);
  assertNonNegativeSafeInteger(value.commentCount, `選択コメント区間 ${index + 1}件目のコメント数`);
  assertFiniteNumber(
    value.relativeToStreamBaseline,
    `選択コメント区間 ${index + 1}件目の配信内相対流量`
  );
  const expectedStartMs = (value.minuteIndex as number) * MINUTE_MS;
  if ((value.minuteIndex as number) <= previousMinuteIndex
    || value.sourceStartMs !== expectedStartMs
    || value.sourceEndMs !== expectedStartMs + MINUTE_MS
    || (value.relativeToStreamBaseline as number) <= 1) {
    fail('SOURCE_PACKAGE_INVALID', `選択コメント区間 ${index + 1}件目が固定選択条件と一致しません`);
  }
}

function hasPositiveOverlap(
  utterance: Pick<DistantConnectionCommonUtteranceV001, 'sourceStartMs' | 'sourceEndMs'>,
  minute: Pick<DistantConnectionComparisonSelectedMinuteV001, 'sourceStartMs' | 'sourceEndMs'>
): boolean {
  return utterance.sourceStartMs < minute.sourceEndMs
    && minute.sourceStartMs < utterance.sourceEndMs;
}

function evidenceForUtterance(
  utterance: DistantConnectionCommonUtteranceV001,
  selectedMinutes: DistantConnectionComparisonSelectedMinuteV001[]
): DistantConnectionComparisonAnchorEvidenceV001[] {
  return selectedMinutes
    .filter((minute) => hasPositiveOverlap(utterance, minute))
    .map((minute) => ({...minute}));
}

function selectedMinuteFromVelocity(
  minute: CommentVelocityMinuteSeriesArtifactV001['minuteSeries'][number]
): DistantConnectionComparisonSelectedMinuteV001 {
  return {
    minuteIndex: minute.minuteIndex,
    sourceStartMs: minute.sourceStartMs,
    sourceEndMs: minute.sourceEndMs,
    commentCount: minute.commentCount,
    relativeToStreamBaseline: minute.relativeToStreamBaseline
  };
}

function decodeInputs(input: DistantConnectionComparisonArtifactInputV001): {
  sourceReuse: SourceVideoTranscriptReuseArtifactV001;
  commonUtterance: DistantConnectionCommonUtteranceArtifactV001;
  commentVelocity: CommentVelocityMinuteSeriesArtifactV001;
} {
  let sourceReuse: SourceVideoTranscriptReuseArtifactV001;
  let commonUtterance: DistantConnectionCommonUtteranceArtifactV001;
  let commentVelocity: CommentVelocityMinuteSeriesArtifactV001;
  try {
    sourceReuse = decodeSourceVideoTranscriptReuseArtifactV001(input.sourceReuseBytes);
  } catch (error) {
    fail('SOURCE_REUSE_INVALID', '動画・既存文字起こし再利用成果物を正式入力として読めません', error);
  }
  try {
    commonUtterance = decodeDistantConnectionCommonUtteranceArtifactV001(
      input.commonUtteranceBytes
    );
  } catch (error) {
    fail('COMMON_UTTERANCE_INVALID', '共通発話成果物を正式入力として読めません', error);
  }
  try {
    commentVelocity = decodeCommentVelocityMinuteSeriesArtifactV001(
      input.commentVelocityBytes
    );
  } catch (error) {
    fail('COMMENT_VELOCITY_INVALID', '正式コメント流量成果物を正式入力として読めません', error);
  }
  return {sourceReuse, commonUtterance, commentVelocity};
}

function assertInputArtifactBindings(
  sourceReuse: SourceVideoTranscriptReuseArtifactV001,
  commonUtterance: DistantConnectionCommonUtteranceArtifactV001,
  commentVelocity: CommentVelocityMinuteSeriesArtifactV001
): void {
  if (sourceReuse.sourceTranscriptBinding.path !== commonUtterance.sourceTranscriptBinding.path
    || sourceReuse.sourceTranscriptBinding.schemaVersion
      !== commonUtterance.sourceTranscriptBinding.schemaVersion
    || sourceReuse.sourceTranscriptBinding.fileSha256
      !== commonUtterance.sourceTranscriptBinding.fileSha256
    || sourceReuse.sourceTranscriptBinding.sourceUri !== commonUtterance.sourceUri
    || sourceReuse.transcriptCoverage.segmentCount !== commonUtterance.sourceSegmentCount) {
    fail(
      'TRANSCRIPT_BINDING_MISMATCH',
      '動画再利用成果物と共通発話成果物のtranscript path・schema・SHA・source・断片件数が一致しません'
    );
  }
  const commonVideoId = sourceVideoIdFromUri(commonUtterance.sourceUri);
  if (sourceReuse.sourceVideoId !== commonVideoId
    || commentVelocity.sourceVideoId !== commonVideoId) {
    fail('SOURCE_VIDEO_MISMATCH', '3入力成果物の元動画IDが一致しません');
  }
  if (sourceReuse.sourceVideoBinding.measuredDurationMs !== commentVelocity.sourceDurationMs) {
    fail('SOURCE_DURATION_MISMATCH', '動画再利用成果物と正式コメント流量成果物の動画尺が一致しません');
  }
}

function validateCommonUtteranceAndVelocityAgainstOriginalBytes(
  input: Pick<
    BuildDistantConnectionComparisonSourcePackageFromBytesInputV001,
    'sourceTranscriptBytes' | 'rawChatReplayBytes'
  >,
  sourceReuse: SourceVideoTranscriptReuseArtifactV001,
  commonUtterance: DistantConnectionCommonUtteranceArtifactV001,
  commentVelocity: CommentVelocityMinuteSeriesArtifactV001
): void {
  try {
    validateDistantConnectionCommonUtteranceArtifactAgainstTranscriptBytesV001(
      commonUtterance,
      {
        sourceTranscriptPath: sourceReuse.sourceTranscriptBinding.path,
        sourceTranscriptBytes: input.sourceTranscriptBytes
      }
    );
  } catch (error) {
    fail(
      'COMMON_UTTERANCE_INVALID',
      '共通発話成果物が元文字起こしbyteからの決定的再構築結果と一致しません',
      error
    );
  }
  try {
    validateCommentVelocityMinuteSeriesArtifactAgainstRawChatBytesV001(
      commentVelocity,
      {
        analysisId: commentVelocity.analysisId,
        sourceVideoId: commentVelocity.sourceVideoId,
        sourceDurationMs: commentVelocity.sourceDurationMs,
        rawChatReplayPath: commentVelocity.acquisition.filePath,
        rawChatReplayBytes: input.rawChatReplayBytes
      }
    );
  } catch (error) {
    fail(
      'COMMENT_VELOCITY_INVALID',
      '正式コメント流量成果物がraw chat replay byteからの決定的再構築結果と一致しません',
      error
    );
  }
}

function validateDecodedArtifactsAgainstOriginalBytes(
  input: BuildDistantConnectionComparisonSourcePackageFromBytesInputV001,
  sourceReuse: SourceVideoTranscriptReuseArtifactV001,
  commonUtterance: DistantConnectionCommonUtteranceArtifactV001,
  commentVelocity: CommentVelocityMinuteSeriesArtifactV001
): void {
  try {
    validateSourceVideoTranscriptReuseArtifactAgainstBytesV001(
      sourceReuse,
      {
        workspaceRoot: input.workspaceRoot,
        sourceVideoId: sourceReuse.sourceVideoId,
        sourceVideoPath: sourceReuse.sourceVideoBinding.path,
        sourceVideoBytes: input.sourceVideoBytes,
        measuredSourceVideoDurationMs: sourceReuse.sourceVideoBinding.measuredDurationMs,
        approvedSourceVideoSha256: sourceReuse.approvedSourceIdentity.fileSha256,
        approvedSourceVideoDurationMs: sourceReuse.approvedSourceIdentity.durationMs,
        sourceTranscriptPath: sourceReuse.sourceTranscriptBinding.path,
        sourceTranscriptBytes: input.sourceTranscriptBytes
      }
    );
  } catch (error) {
    fail(
      'SOURCE_REUSE_INVALID',
      '動画・文字起こし再利用成果物が元動画・元文字起こしbyteからの決定的再構築結果と一致しません',
      error
    );
  }
  validateCommonUtteranceAndVelocityAgainstOriginalBytes(
    input,
    sourceReuse,
    commonUtterance,
    commentVelocity
  );
}

function buildPackageValue(
  input: DistantConnectionComparisonArtifactInputV001,
  sourceReuse: SourceVideoTranscriptReuseArtifactV001,
  commonUtterance: DistantConnectionCommonUtteranceArtifactV001,
  commentVelocity: CommentVelocityMinuteSeriesArtifactV001
): DistantConnectionComparisonSourcePackageV001 {
  assertInputArtifactBindings(sourceReuse, commonUtterance, commentVelocity);
  const selectedMinutes = commentVelocity.minuteSeries
    .filter((minute) => (
      minute.isFullMinute
      && minute.durationMs === MINUTE_MS
      && minute.relativeToStreamBaseline > 1
    ))
    .map(selectedMinuteFromVelocity);
  if (selectedMinutes.length === 0) {
    fail('SOURCE_PACKAGE_INVALID', '固定選択条件に合う完全な1分コメント区間がありません');
  }

  const anchors: DistantConnectionComparisonAnchorV001[] = [];
  for (const utterance of commonUtterance.utterances) {
    const evidenceRanges = evidenceForUtterance(utterance, selectedMinutes);
    if (evidenceRanges.length === 0) continue;
    anchors.push({
      anchorId: `comparison-anchor-${String(anchors.length + 1).padStart(6, '0')}`,
      utteranceId: utterance.utteranceId,
      evidenceRanges
    });
  }
  if (anchors.length === 0) {
    fail('SOURCE_PACKAGE_INVALID', '選択コメント区間と正に重なる正式発話がありません');
  }

  return {
    schemaVersion: DISTANT_CONNECTION_COMPARISON_SOURCE_PACKAGE_SCHEMA_V001,
    sourceVideoId: sourceReuse.sourceVideoId,
    sourceReuseBinding: {
      path: input.sourceReusePath,
      schemaVersion: SOURCE_VIDEO_TRANSCRIPT_REUSE_ARTIFACT_SCHEMA_V001,
      fileSha256: sha256(input.sourceReuseBytes)
    },
    commonUtteranceBinding: {
      path: input.commonUtterancePath,
      schemaVersion: DISTANT_CONNECTION_COMMON_UTTERANCE_ARTIFACT_SCHEMA_V001,
      fileSha256: sha256(input.commonUtteranceBytes)
    },
    commentVelocityBinding: {
      path: input.commentVelocityPath,
      schemaId: COMMENT_VELOCITY_MINUTE_SERIES_SCHEMA_ID_V001,
      schemaVersion: COMMENT_VELOCITY_MINUTE_SERIES_SCHEMA_VERSION_V001,
      fileSha256: sha256(input.commentVelocityBytes)
    },
    selectionPolicy: structuredClone(SELECTION_POLICY),
    plannedExecution: structuredClone(PLANNED_EXECUTION),
    explorationTask: structuredClone(EXPLORATION_TASK),
    sourceSegmentCount: commonUtterance.sourceSegmentCount,
    utteranceCount: commonUtterance.utteranceCount,
    selectedMinuteCount: selectedMinutes.length,
    anchorCount: anchors.length,
    utterances: structuredClone(commonUtterance.utterances),
    selectedMinutes,
    anchors,
    responseContract: {
      schemaVersion: DISTANT_CONNECTION_COMPARISON_INDEX_RESPONSE_SCHEMA_V001,
      sourcePackagePath: input.sourcePackagePath,
      referenceMode: DISTANT_CONNECTION_COMPARISON_REFERENCE_MODE_V001,
      formalIdResolution: DISTANT_CONNECTION_COMPARISON_FORMAL_ID_RESOLUTION_V001
    }
  };
}

export function buildDistantConnectionComparisonSourcePackageFromBytesV001(
  input: BuildDistantConnectionComparisonSourcePackageFromBytesInputV001
): DistantConnectionComparisonSourcePackageV001 {
  assertWorkspaceRoot(input.workspaceRoot);
  assertWorkspaceRelativePath(input.sourceReusePath, '動画・既存文字起こし再利用成果物path');
  assertWorkspaceRelativePath(input.commonUtterancePath, '共通発話成果物path');
  assertWorkspaceRelativePath(input.commentVelocityPath, '正式コメント流量成果物path');
  assertWorkspaceRelativePath(input.sourcePackagePath, '比較用Luna source package path');
  const decoded = decodeInputs(input);
  validateDecodedArtifactsAgainstOriginalBytes(
    input,
    decoded.sourceReuse,
    decoded.commonUtterance,
    decoded.commentVelocity
  );
  const value = buildPackageValue(input, decoded.sourceReuse, decoded.commonUtterance, decoded.commentVelocity);
  assertDistantConnectionComparisonSourcePackageV001(value);
  return value;
}

export async function buildDistantConnectionComparisonSourcePackageFromFilesV001(
  input: BuildDistantConnectionComparisonSourcePackageFromFilesInputV001
): Promise<DistantConnectionComparisonSourcePackageV001> {
  assertWorkspaceRoot(input.workspaceRoot);
  assertWorkspaceRelativePath(input.sourceReusePath, '動画・既存文字起こし再利用成果物path');
  assertWorkspaceRelativePath(input.commonUtterancePath, '共通発話成果物path');
  assertWorkspaceRelativePath(input.commentVelocityPath, '正式コメント流量成果物path');
  assertWorkspaceRelativePath(input.sourcePackagePath, '比較用Luna source package path');
  const [sourceReuseBytes, commonUtteranceBytes, commentVelocityBytes] = await Promise.all([
    readFile(path.join(input.workspaceRoot, input.sourceReusePath)),
    readFile(path.join(input.workspaceRoot, input.commonUtterancePath)),
    readFile(path.join(input.workspaceRoot, input.commentVelocityPath))
  ]);
  const decoded = decodeInputs({
    sourceReusePath: input.sourceReusePath,
    sourceReuseBytes,
    commonUtterancePath: input.commonUtterancePath,
    commonUtteranceBytes,
    commentVelocityPath: input.commentVelocityPath,
    commentVelocityBytes,
    sourcePackagePath: input.sourcePackagePath
  });
  assertInputArtifactBindings(
    decoded.sourceReuse,
    decoded.commonUtterance,
    decoded.commentVelocity
  );
  const [sourceTranscriptBytes, rawChatReplayBytes, rebuiltSourceReuse] = await Promise.all([
    readFile(path.join(
      input.workspaceRoot,
      decoded.sourceReuse.sourceTranscriptBinding.path
    )),
    readFile(path.join(
      input.workspaceRoot,
      decoded.commentVelocity.acquisition.filePath
    )),
    buildSourceVideoTranscriptReuseArtifactFromFilesV001({
      workspaceRoot: input.workspaceRoot,
      sourceVideoId: decoded.sourceReuse.sourceVideoId,
      sourceVideoPath: decoded.sourceReuse.sourceVideoBinding.path,
      measuredSourceVideoDurationMs:
        decoded.sourceReuse.sourceVideoBinding.measuredDurationMs,
      approvedSourceVideoSha256:
        decoded.sourceReuse.approvedSourceIdentity.fileSha256,
      approvedSourceVideoDurationMs:
        decoded.sourceReuse.approvedSourceIdentity.durationMs,
      sourceTranscriptPath: decoded.sourceReuse.sourceTranscriptBinding.path
    }).catch((error: unknown) => fail(
      'SOURCE_REUSE_INVALID',
      '動画・文字起こし再利用成果物を元動画fileから決定的に再構築できません',
      error
    ))
  ]);
  if (!serializeSourceVideoTranscriptReuseArtifactV001(rebuiltSourceReuse)
    .equals(Buffer.from(sourceReuseBytes))) {
    fail(
      'SOURCE_REUSE_INVALID',
      '動画・文字起こし再利用成果物が元動画fileからの決定的再構築結果と一致しません'
    );
  }
  validateCommonUtteranceAndVelocityAgainstOriginalBytes(
    {sourceTranscriptBytes, rawChatReplayBytes},
    decoded.sourceReuse,
    decoded.commonUtterance,
    decoded.commentVelocity
  );
  const value = buildPackageValue(
    {
      sourceReusePath: input.sourceReusePath,
      sourceReuseBytes,
      commonUtterancePath: input.commonUtterancePath,
      commonUtteranceBytes,
      commentVelocityPath: input.commentVelocityPath,
      commentVelocityBytes,
      sourcePackagePath: input.sourcePackagePath
    },
    decoded.sourceReuse,
    decoded.commonUtterance,
    decoded.commentVelocity
  );
  assertDistantConnectionComparisonSourcePackageV001(value);
  return value;
}

export function assertDistantConnectionComparisonSourcePackageV001(
  value: unknown
): asserts value is DistantConnectionComparisonSourcePackageV001 {
  if (!isRecord(value) || !hasExactKeys(value, [
    'schemaVersion',
    'sourceVideoId',
    'sourceReuseBinding',
    'commonUtteranceBinding',
    'commentVelocityBinding',
    'selectionPolicy',
    'plannedExecution',
    'explorationTask',
    'sourceSegmentCount',
    'utteranceCount',
    'selectedMinuteCount',
    'anchorCount',
    'utterances',
    'selectedMinutes',
    'anchors',
    'responseContract'
  ])) {
    fail('SOURCE_PACKAGE_INVALID', '比較用Luna source packageのroot構造が不正です');
  }
  if (value.schemaVersion !== DISTANT_CONNECTION_COMPARISON_SOURCE_PACKAGE_SCHEMA_V001
    || typeof value.sourceVideoId !== 'string'
    || !SOURCE_VIDEO_ID.test(value.sourceVideoId)) {
    fail('SOURCE_PACKAGE_INVALID', '比較用Luna source packageの版または元動画IDが不正です');
  }
  assertFormalBinding(
    value.sourceReuseBinding,
    '動画・既存文字起こし再利用成果物binding',
    SOURCE_VIDEO_TRANSCRIPT_REUSE_ARTIFACT_SCHEMA_V001
  );
  assertFormalBinding(
    value.commonUtteranceBinding,
    '共通発話成果物binding',
    DISTANT_CONNECTION_COMMON_UTTERANCE_ARTIFACT_SCHEMA_V001
  );
  assertCommentVelocityBinding(value.commentVelocityBinding);
  assertSelectionPolicy(value.selectionPolicy);
  assertPlannedExecution(value.plannedExecution);
  assertExplorationTask(value.explorationTask);
  assertPositiveSafeInteger(value.sourceSegmentCount, '元STT断片件数');
  assertPositiveSafeInteger(value.utteranceCount, '正式発話件数');
  assertPositiveSafeInteger(value.selectedMinuteCount, '選択コメント区間件数');
  assertPositiveSafeInteger(value.anchorCount, 'アンカー件数');
  if (!Array.isArray(value.utterances) || value.utterances.length !== value.utteranceCount
    || !Array.isArray(value.selectedMinutes)
    || value.selectedMinutes.length !== value.selectedMinuteCount
    || !Array.isArray(value.anchors) || value.anchors.length !== value.anchorCount) {
    fail('SOURCE_PACKAGE_INVALID', '比較用Luna source packageの件数と配列長が一致しません');
  }

  const seenSegmentIds = new Set<number>();
  let previousStartMs = -1;
  let previousEndMs = -1;
  for (const [index, utterance] of value.utterances.entries()) {
    assertCommonUtterance(utterance, index, seenSegmentIds);
    if (utterance.sourceStartMs < previousStartMs
      || (utterance.sourceStartMs === previousStartMs && utterance.sourceEndMs < previousEndMs)) {
      fail('UTTERANCE_ORDER_REVERSED', '正式発話の時系列順が逆転しています');
    }
    previousStartMs = utterance.sourceStartMs;
    previousEndMs = utterance.sourceEndMs;
  }
  if (seenSegmentIds.size !== value.sourceSegmentCount) {
    fail('UTTERANCE_MISSING', '元STT断片の完全被覆件数がsource package概要と一致しません');
  }

  let previousMinuteIndex = -1;
  for (const [index, minute] of value.selectedMinutes.entries()) {
    assertSelectedMinute(minute, index, previousMinuteIndex);
    previousMinuteIndex = minute.minuteIndex;
  }

  const formalUtterances = value.utterances as DistantConnectionCommonUtteranceV001[];
  const formalSelectedMinutes =
    value.selectedMinutes as DistantConnectionComparisonSelectedMinuteV001[];
  const formalAnchors = value.anchors as DistantConnectionComparisonAnchorV001[];
  const utteranceById = new Map(
    formalUtterances.map((utterance) => [utterance.utteranceId, utterance])
  );
  const seenAnchorUtteranceIds = new Set<string>();
  let expectedAnchorOrdinal = 1;
  for (const [index, anchor] of value.anchors.entries()) {
    if (!isRecord(anchor) || !hasExactKeys(anchor, [
      'anchorId', 'utteranceId', 'evidenceRanges'
    ])) {
      fail('SOURCE_PACKAGE_INVALID', `アンカー ${index + 1}件目の構造が不正です`);
    }
    const expectedAnchorId =
      `comparison-anchor-${String(expectedAnchorOrdinal).padStart(6, '0')}`;
    if (anchor.anchorId !== expectedAnchorId || !FORMAL_ANCHOR_ID.test(anchor.anchorId)) {
      fail('SOURCE_PACKAGE_INVALID', `アンカー ${index + 1}件目のIDまたは順序が不正です`);
    }
    expectedAnchorOrdinal += 1;
    if (typeof anchor.utteranceId !== 'string' || !utteranceById.has(anchor.utteranceId)) {
      fail('ANCHOR_UNKNOWN_UTTERANCE', `アンカー ${anchor.anchorId} が未知の正式発話を参照しています`);
    }
    if (seenAnchorUtteranceIds.has(anchor.utteranceId)) {
      fail('ANCHOR_DUPLICATE', `正式発話 ${anchor.utteranceId} が複数のアンカーになっています`);
    }
    seenAnchorUtteranceIds.add(anchor.utteranceId);
    const utterance = utteranceById.get(anchor.utteranceId)!;
    const expectedEvidence = evidenceForUtterance(utterance, formalSelectedMinutes);
    if (!Array.isArray(anchor.evidenceRanges)
      || anchor.evidenceRanges.length === 0
      || JSON.stringify(anchor.evidenceRanges) !== JSON.stringify(expectedEvidence)) {
      fail(
        'ANCHOR_EVIDENCE_MISMATCH',
        `アンカー ${anchor.anchorId} のコメント区間根拠が正の時間交差全件と一致しません`
      );
    }
  }
  const expectedAnchoredUtteranceIds = formalUtterances
    .filter((utterance) => evidenceForUtterance(utterance, formalSelectedMinutes).length > 0)
    .map((utterance) => utterance.utteranceId);
  if (expectedAnchoredUtteranceIds.length !== formalAnchors.length
    || expectedAnchoredUtteranceIds.some(
      (utteranceId, index) => formalAnchors[index]?.utteranceId !== utteranceId
    )) {
    fail('ANCHOR_MISSING', '選択コメント区間と正に重なる正式発話の完全被覆または順序が不正です');
  }

  if (!isRecord(value.responseContract) || !hasExactKeys(value.responseContract, [
    'schemaVersion', 'sourcePackagePath', 'referenceMode', 'formalIdResolution'
  ])
    || value.responseContract.schemaVersion
      !== DISTANT_CONNECTION_COMPARISON_INDEX_RESPONSE_SCHEMA_V001
    || value.responseContract.referenceMode
      !== DISTANT_CONNECTION_COMPARISON_REFERENCE_MODE_V001
    || value.responseContract.formalIdResolution
      !== DISTANT_CONNECTION_COMPARISON_FORMAL_ID_RESOLUTION_V001) {
    fail('SOURCE_PACKAGE_INVALID', 'index参照返答契約が不正です');
  }
  assertWorkspaceRelativePath(
    value.responseContract.sourcePackagePath,
    'index参照返答契約のsource package path'
  );
}

export function serializeDistantConnectionComparisonSourcePackageV001(
  value: DistantConnectionComparisonSourcePackageV001
): Buffer {
  assertDistantConnectionComparisonSourcePackageV001(value);
  return Buffer.from(`${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

export function decodeDistantConnectionComparisonSourcePackageV001(
  bytes: Uint8Array
): DistantConnectionComparisonSourcePackageV001 {
  let value: unknown;
  try {
    value = JSON.parse(Buffer.from(bytes).toString('utf8'));
  } catch (error) {
    fail('SOURCE_PACKAGE_INVALID', '比較用Luna source packageをJSONとして読めません', error);
  }
  assertDistantConnectionComparisonSourcePackageV001(value);
  const formalBytes = serializeDistantConnectionComparisonSourcePackageV001(value);
  if (!formalBytes.equals(Buffer.from(bytes))) {
    fail('SOURCE_PACKAGE_INVALID', '比較用Luna source packageがformal byteではありません');
  }
  return value;
}

export function validateDistantConnectionComparisonSourcePackageAgainstBytesV001(
  value: unknown,
  input: BuildDistantConnectionComparisonSourcePackageFromBytesInputV001
): void {
  assertDistantConnectionComparisonSourcePackageV001(value);
  if (value.sourceReuseBinding.path !== input.sourceReusePath
    || value.sourceReuseBinding.fileSha256 !== sha256(input.sourceReuseBytes)
    || value.commonUtteranceBinding.path !== input.commonUtterancePath
    || value.commonUtteranceBinding.fileSha256 !== sha256(input.commonUtteranceBytes)
    || value.commentVelocityBinding.path !== input.commentVelocityPath
    || value.commentVelocityBinding.fileSha256 !== sha256(input.commentVelocityBytes)
    || value.responseContract.sourcePackagePath !== input.sourcePackagePath) {
    fail('SOURCE_PACKAGE_BINDING_MISMATCH', 'source packageのpath・SHA bindingが実入力と一致しません');
  }
  const rebuilt = buildDistantConnectionComparisonSourcePackageFromBytesV001(input);
  if (!serializeDistantConnectionComparisonSourcePackageV001(value)
    .equals(serializeDistantConnectionComparisonSourcePackageV001(rebuilt))) {
    fail('SOURCE_PACKAGE_BINDING_MISMATCH', 'source packageが3入力からの決定的再構築結果と一致しません');
  }
}

export async function writeDistantConnectionComparisonSourcePackageFromFilesV001(
  input: WriteDistantConnectionComparisonSourcePackageFromFilesInputV001
): Promise<{sourcePackage: DistantConnectionComparisonSourcePackageV001; bytes: Buffer}> {
  assertWorkspaceRelativePath(input.outputPath, '出力path');
  if (input.outputPath !== input.sourcePackagePath) {
    fail(
      'INPUT_INVALID',
      '出力pathがsource package内で正式に束縛するpathと一致しません'
    );
  }
  const sourcePackage = await buildDistantConnectionComparisonSourcePackageFromFilesV001(input);
  const bytes = serializeDistantConnectionComparisonSourcePackageV001(sourcePackage);
  const outputAbsolutePath = path.join(input.workspaceRoot, input.outputPath);
  await mkdir(path.dirname(outputAbsolutePath), {recursive: true});
  await writeFile(outputAbsolutePath, bytes, {flag: 'wx'});
  return {sourcePackage, bytes};
}
