import {createHash} from 'node:crypto';
import {mkdir, readFile, writeFile} from 'node:fs/promises';
import path from 'node:path';

export const COMMENT_VELOCITY_MINUTE_SERIES_SCHEMA_VERSION_V001 = 1 as const;
export const COMMENT_VELOCITY_MINUTE_SERIES_SCHEMA_ID_V001 = 'chat-velocity-analysis-v001';
export const COMMENT_VELOCITY_MINUTE_SERIES_ANALYSIS_TYPE_V001 =
  'distant-connection-comment-velocity-minute-series';

export const COMMENT_VELOCITY_COUNTED_RENDERERS_V001 = Object.freeze([
  'liveChatTextMessageRenderer',
  'liveChatPaidMessageRenderer',
  'liveChatPaidStickerRenderer',
  'liveChatMembershipItemRenderer',
  'liveChatSponsorshipsGiftPurchaseAnnouncementRenderer',
  'liveChatSponsorshipsGiftRedemptionAnnouncementRenderer'
] as const);

export const COMMENT_VELOCITY_MINUTE_SERIES_ERROR_CODES_V001 = Object.freeze([
  'INPUT_INVALID',
  'SOURCE_VIDEO_MISMATCH',
  'RAW_CHAT_SHA_MISMATCH',
  'RAW_CHAT_JSONL_INVALID',
  'RAW_CHAT_OFFSET_INVALID',
  'RAW_CHAT_TIME_RANGE_INVALID',
  'FULL_MINUTE_BASELINE_EMPTY',
  'ARTIFACT_INVALID',
  'ARTIFACT_BINDING_MISMATCH'
] as const);

export type CommentVelocityMinuteSeriesErrorCodeV001 =
  typeof COMMENT_VELOCITY_MINUTE_SERIES_ERROR_CODES_V001[number];

export class CommentVelocityMinuteSeriesArtifactErrorV001 extends Error {
  readonly code: CommentVelocityMinuteSeriesErrorCodeV001;

  constructor(
    code: CommentVelocityMinuteSeriesErrorCodeV001,
    message: string,
    options?: ErrorOptions
  ) {
    super(message, options);
    this.name = 'CommentVelocityMinuteSeriesArtifactErrorV001';
    this.code = code;
  }
}

type RendererCounts = Record<string, number>;

export type CommentVelocityMinuteV001 = {
  minuteIndex: number;
  sourceStartMs: number;
  sourceEndMs: number;
  durationMs: number;
  commentCount: number;
  rendererCounts: RendererCounts;
  isFullMinute: boolean;
  commentRatePerMinute: number;
  relativeToStreamBaseline: number;
};

export type CommentVelocityMinuteSeriesArtifactV001 = {
  schemaVersion: typeof COMMENT_VELOCITY_MINUTE_SERIES_SCHEMA_VERSION_V001;
  analysisId: string;
  analysisType: typeof COMMENT_VELOCITY_MINUTE_SERIES_ANALYSIS_TYPE_V001;
  sourceVideoId: string;
  sourceDurationMs: number;
  acquisition: {
    filePath: string;
    fileBytes: number;
    sha256: string;
    lineCount: number;
    parseErrorCount: 0;
    minOffsetMs: number;
    maxOffsetMs: number;
    rendererCounts: RendererCounts;
  };
  countingPolicy: {
    countedRenderers: Array<typeof COMMENT_VELOCITY_COUNTED_RENDERERS_V001[number]>;
    excludedObservedRenderers: string[];
    chatTextOrAuthorPersistedInAnalysis: false;
    finalPartialMinute: 'included-with-actual-duration-rate-excluded-from-full-minute-baseline';
  };
  sourceOnlyGuard: {
    expectedUsed: false;
    clipUsed: false;
    alignmentUsed: false;
    chatTextIncluded: false;
    chatAuthorIncluded: false;
  };
  baseline: {
    definition: '配信内に完全に収まる1分区間すべての平均コメント数を1.0とする';
    absoluteThresholdUsedForSelection: false;
    fullMinuteCount: number;
    fullMinuteCommentCount: number;
    baselineCommentsPerMinute: number;
    beforeStreamCount: number;
    afterStreamCount: number;
  };
  minuteSeries: CommentVelocityMinuteV001[];
};

export type BuildCommentVelocityMinuteSeriesFromBytesInputV001 = {
  analysisId: string;
  sourceVideoId: string;
  sourceDurationMs: number;
  rawChatReplayPath: string;
  rawChatReplayBytes: Uint8Array;
};

export type BuildCommentVelocityMinuteSeriesFromFileInputV001 = Omit<
  BuildCommentVelocityMinuteSeriesFromBytesInputV001,
  'rawChatReplayBytes'
> & {
  workspaceRoot: string;
};

export type WriteCommentVelocityMinuteSeriesFromFileInputV001 =
  BuildCommentVelocityMinuteSeriesFromFileInputV001 & {
    outputPath: string;
  };

type ChatEvent = {
  offsetMs: number;
  renderer: typeof COMMENT_VELOCITY_COUNTED_RENDERERS_V001[number];
};

const MINUTE_MS = 60_000;
const SHA256 = /^[0-9a-f]{64}$/u;
const FORMAL_ID = /^[A-Za-z0-9][A-Za-z0-9._-]*$/u;
const SOURCE_VIDEO_ID = /^[A-Za-z0-9_-]+$/u;
const RENDERER_NAME = /^[A-Za-z][A-Za-z0-9]*Renderer$/u;
const WORKSPACE_RELATIVE_PATH =
  /^(?!\/)(?!\.\/)(?!.*(?:^|\/)\.\.(?:\/|$))(?!.*\\)(?!.*\/\/)[^\0]+$/u;
const COUNTED_RENDERER_SET = new Set<string>(COMMENT_VELOCITY_COUNTED_RENDERERS_V001);
const BASELINE_DEFINITION =
  '配信内に完全に収まる1分区間すべての平均コメント数を1.0とする' as const;
const FINAL_PARTIAL_MINUTE_POLICY =
  'included-with-actual-duration-rate-excluded-from-full-minute-baseline' as const;

function fail(
  code: CommentVelocityMinuteSeriesErrorCodeV001,
  message: string,
  cause?: unknown
): never {
  throw new CommentVelocityMinuteSeriesArtifactErrorV001(
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

function compareStrings(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function hasExactKeys(value: Record<string, unknown>, keys: readonly string[]): boolean {
  const actual = Object.keys(value);
  return actual.length === keys.length && actual.every((key, index) => key === keys[index]);
}

function assertWorkspaceRelativePath(
  value: unknown,
  label: string,
  code: CommentVelocityMinuteSeriesErrorCodeV001 = 'INPUT_INVALID'
): asserts value is string {
  if (typeof value !== 'string' || !WORKSPACE_RELATIVE_PATH.test(value)) {
    fail(code, `${label}はworkspace相対pathである必要があります`);
  }
}

function assertNonNegativeSafeInteger(
  value: unknown,
  label: string,
  code: CommentVelocityMinuteSeriesErrorCodeV001 = 'ARTIFACT_INVALID'
): asserts value is number {
  if (!Number.isSafeInteger(value) || (value as number) < 0) {
    fail(code, `${label}は0以上の安全な整数である必要があります`);
  }
}

function assertPositiveSafeInteger(
  value: unknown,
  label: string,
  code: CommentVelocityMinuteSeriesErrorCodeV001 = 'INPUT_INVALID'
): asserts value is number {
  if (!Number.isSafeInteger(value) || (value as number) <= 0) {
    fail(code, `${label}は正の安全な整数である必要があります`);
  }
}

function assertSafeInteger(
  value: unknown,
  label: string,
  code: CommentVelocityMinuteSeriesErrorCodeV001 = 'ARTIFACT_INVALID'
): asserts value is number {
  if (!Number.isSafeInteger(value)) {
    fail(code, `${label}は安全な整数である必要があります`);
  }
}

function assertFiniteNonNegative(
  value: unknown,
  label: string,
  code: CommentVelocityMinuteSeriesErrorCodeV001 = 'ARTIFACT_INVALID'
): asserts value is number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
    fail(code, `${label}は0以上の有限数である必要があります`);
  }
}

function rawChatReplayVideoId(filePath: string): string {
  const basename = path.posix.basename(filePath);
  const suffix = '.live_chat.json';
  if (!basename.endsWith(suffix)) {
    fail('SOURCE_VIDEO_MISMATCH', 'raw chat replayのfile名から元動画IDを解決できません');
  }
  const sourceVideoId = basename.slice(0, -suffix.length);
  if (!SOURCE_VIDEO_ID.test(sourceVideoId)) {
    fail('SOURCE_VIDEO_MISMATCH', 'raw chat replayのfile名に有効な元動画IDがありません');
  }
  return sourceVideoId;
}

function validateBuildInput(input: BuildCommentVelocityMinuteSeriesFromBytesInputV001): void {
  if (typeof input.analysisId !== 'string' || !FORMAL_ID.test(input.analysisId)) {
    fail('INPUT_INVALID', 'analysisIdが不正です');
  }
  if (typeof input.sourceVideoId !== 'string' || !SOURCE_VIDEO_ID.test(input.sourceVideoId)) {
    fail('INPUT_INVALID', '元動画IDが不正です');
  }
  assertPositiveSafeInteger(input.sourceDurationMs, '元動画尺');
  if (input.sourceDurationMs < MINUTE_MS) {
    fail('FULL_MINUTE_BASELINE_EMPTY', '完全な1分区間がないため配信内基準流量を作れません');
  }
  assertWorkspaceRelativePath(input.rawChatReplayPath, 'raw chat replayのpath');
  if (rawChatReplayVideoId(input.rawChatReplayPath) !== input.sourceVideoId) {
    fail('SOURCE_VIDEO_MISMATCH', 'raw chat replayのfile名と指定された元動画IDが一致しません');
  }
  if (!(input.rawChatReplayBytes instanceof Uint8Array) || input.rawChatReplayBytes.byteLength === 0) {
    fail('INPUT_INVALID', 'raw chat replayが空またはbyte列ではありません');
  }
}

function canonicalRendererCounts(counts: Map<string, number>): RendererCounts {
  return Object.fromEntries([...counts.entries()].sort(([left], [right]) => compareStrings(left, right)));
}

function parseRawChatReplay(
  bytes: Uint8Array
): {
  events: ChatEvent[];
  lineCount: number;
  minOffsetMs: number;
  maxOffsetMs: number;
  rendererCounts: RendererCounts;
} {
  const text = Buffer.from(bytes).toString('utf8');
  const lines = text.split(/\r?\n/u);
  if (lines.at(-1) === '') lines.pop();
  if (lines.length === 0) {
    fail('RAW_CHAT_JSONL_INVALID', 'raw chat replayにJSON Linesがありません');
  }

  const events: ChatEvent[] = [];
  const rendererCounts = new Map<string, number>();
  let minOffsetMs = Number.POSITIVE_INFINITY;
  let maxOffsetMs = Number.NEGATIVE_INFINITY;
  let replayActionCount = 0;

  for (const [index, line] of lines.entries()) {
    if (line.length === 0) {
      fail('RAW_CHAT_JSONL_INVALID', `raw chat replayの${index + 1}行目が空です`);
    }
    let value: unknown;
    try {
      value = JSON.parse(line);
    } catch (error) {
      fail('RAW_CHAT_JSONL_INVALID', `raw chat replayの${index + 1}行目をJSONとして読めません`, error);
    }
    if (!isRecord(value)) {
      fail('RAW_CHAT_JSONL_INVALID', `raw chat replayの${index + 1}行目がJSON objectではありません`);
    }
    const replay = value.replayChatItemAction;
    if (replay === undefined) continue;
    if (!isRecord(replay)) {
      fail('RAW_CHAT_JSONL_INVALID', `raw chat replayの${index + 1}行目のreplay actionが不正です`);
    }
    replayActionCount += 1;
    const rawOffsetMs = replay.videoOffsetTimeMsec;
    if ((typeof rawOffsetMs !== 'string' || !/^-?\d+$/u.test(rawOffsetMs))
      && !Number.isSafeInteger(rawOffsetMs)) {
      fail('RAW_CHAT_OFFSET_INVALID', `raw chat replayの${index + 1}行目の配信時刻が不正です`);
    }
    const offsetMs = Number(rawOffsetMs);
    if (!Number.isSafeInteger(offsetMs)) {
      fail('RAW_CHAT_OFFSET_INVALID', `raw chat replayの${index + 1}行目の配信時刻が安全な整数ではありません`);
    }
    minOffsetMs = Math.min(minOffsetMs, offsetMs);
    maxOffsetMs = Math.max(maxOffsetMs, offsetMs);
    if (!Array.isArray(replay.actions)) {
      fail('RAW_CHAT_JSONL_INVALID', `raw chat replayの${index + 1}行目のactionsが配列ではありません`);
    }
    for (const action of replay.actions) {
      if (!isRecord(action)) continue;
      const addChatItemAction = action.addChatItemAction;
      if (!isRecord(addChatItemAction)) continue;
      const item = addChatItemAction.item;
      if (!isRecord(item)) continue;
      for (const renderer of Object.keys(item)) {
        rendererCounts.set(renderer, (rendererCounts.get(renderer) ?? 0) + 1);
        if (COUNTED_RENDERER_SET.has(renderer)) {
          events.push({
            offsetMs,
            renderer: renderer as typeof COMMENT_VELOCITY_COUNTED_RENDERERS_V001[number]
          });
        }
      }
    }
  }

  if (replayActionCount === 0 || !Number.isFinite(minOffsetMs) || !Number.isFinite(maxOffsetMs)) {
    fail('RAW_CHAT_TIME_RANGE_INVALID', 'raw chat replayに時刻付きreplay actionがありません');
  }
  return {
    events,
    lineCount: lines.length,
    minOffsetMs,
    maxOffsetMs,
    rendererCounts: canonicalRendererCounts(rendererCounts)
  };
}

function buildMinuteSeries(
  sourceDurationMs: number,
  events: ChatEvent[]
): {
  minuteSeries: CommentVelocityMinuteV001[];
  fullMinuteCount: number;
  fullMinuteCommentCount: number;
  baselineCommentsPerMinute: number;
  beforeStreamCount: number;
  afterStreamCount: number;
} {
  const minuteCount = Math.ceil(sourceDurationMs / MINUTE_MS);
  const fullMinuteCount = Math.floor(sourceDurationMs / MINUTE_MS);
  const minuteSeries: CommentVelocityMinuteV001[] = Array.from(
    {length: minuteCount},
    (_, minuteIndex) => {
      const sourceStartMs = minuteIndex * MINUTE_MS;
      const sourceEndMs = Math.min((minuteIndex + 1) * MINUTE_MS, sourceDurationMs);
      const durationMs = sourceEndMs - sourceStartMs;
      return {
        minuteIndex,
        sourceStartMs,
        sourceEndMs,
        durationMs,
        commentCount: 0,
        rendererCounts: {},
        isFullMinute: durationMs === MINUTE_MS,
        commentRatePerMinute: 0,
        relativeToStreamBaseline: 0
      };
    }
  );
  let beforeStreamCount = 0;
  let afterStreamCount = 0;
  for (const event of events) {
    if (event.offsetMs < 0) {
      beforeStreamCount += 1;
      continue;
    }
    if (event.offsetMs >= sourceDurationMs) {
      afterStreamCount += 1;
      continue;
    }
    const minute = minuteSeries[Math.floor(event.offsetMs / MINUTE_MS)];
    if (!minute) {
      fail('RAW_CHAT_TIME_RANGE_INVALID', '配信内コメントを対応する1分区間へ解決できません');
    }
    minute.commentCount += 1;
    minute.rendererCounts[event.renderer] = (minute.rendererCounts[event.renderer] ?? 0) + 1;
  }

  const fullMinuteCommentCount = minuteSeries
    .slice(0, fullMinuteCount)
    .reduce((total, minute) => total + minute.commentCount, 0);
  const baselineCommentsPerMinute = fullMinuteCommentCount / fullMinuteCount;
  if (!Number.isFinite(baselineCommentsPerMinute) || baselineCommentsPerMinute <= 0) {
    fail('FULL_MINUTE_BASELINE_EMPTY', '完全な1分区間のコメントが0件です');
  }
  for (const minute of minuteSeries) {
    minute.rendererCounts = canonicalRendererCounts(new Map(Object.entries(minute.rendererCounts)));
    minute.commentRatePerMinute = minute.commentCount / (minute.durationMs / MINUTE_MS);
    minute.relativeToStreamBaseline = minute.commentRatePerMinute / baselineCommentsPerMinute;
  }
  return {
    minuteSeries,
    fullMinuteCount,
    fullMinuteCommentCount,
    baselineCommentsPerMinute,
    beforeStreamCount,
    afterStreamCount
  };
}

export function buildCommentVelocityMinuteSeriesArtifactFromBytesV001(
  input: BuildCommentVelocityMinuteSeriesFromBytesInputV001
): CommentVelocityMinuteSeriesArtifactV001 {
  validateBuildInput(input);
  const raw = parseRawChatReplay(input.rawChatReplayBytes);
  if (raw.maxOffsetMs < input.sourceDurationMs) {
    fail('RAW_CHAT_TIME_RANGE_INVALID', 'raw chat replayが配信終了まで届いていません');
  }
  const series = buildMinuteSeries(input.sourceDurationMs, raw.events);
  const excludedObservedRenderers = Object.keys(raw.rendererCounts)
    .filter((renderer) => !COUNTED_RENDERER_SET.has(renderer))
    .sort(compareStrings);

  return {
    schemaVersion: COMMENT_VELOCITY_MINUTE_SERIES_SCHEMA_VERSION_V001,
    analysisId: input.analysisId,
    analysisType: COMMENT_VELOCITY_MINUTE_SERIES_ANALYSIS_TYPE_V001,
    sourceVideoId: input.sourceVideoId,
    sourceDurationMs: input.sourceDurationMs,
    acquisition: {
      filePath: input.rawChatReplayPath,
      fileBytes: input.rawChatReplayBytes.byteLength,
      sha256: sha256(input.rawChatReplayBytes),
      lineCount: raw.lineCount,
      parseErrorCount: 0,
      minOffsetMs: raw.minOffsetMs,
      maxOffsetMs: raw.maxOffsetMs,
      rendererCounts: raw.rendererCounts
    },
    countingPolicy: {
      countedRenderers: [...COMMENT_VELOCITY_COUNTED_RENDERERS_V001],
      excludedObservedRenderers,
      chatTextOrAuthorPersistedInAnalysis: false,
      finalPartialMinute: FINAL_PARTIAL_MINUTE_POLICY
    },
    sourceOnlyGuard: {
      expectedUsed: false,
      clipUsed: false,
      alignmentUsed: false,
      chatTextIncluded: false,
      chatAuthorIncluded: false
    },
    baseline: {
      definition: BASELINE_DEFINITION,
      absoluteThresholdUsedForSelection: false,
      fullMinuteCount: series.fullMinuteCount,
      fullMinuteCommentCount: series.fullMinuteCommentCount,
      baselineCommentsPerMinute: series.baselineCommentsPerMinute,
      beforeStreamCount: series.beforeStreamCount,
      afterStreamCount: series.afterStreamCount
    },
    minuteSeries: series.minuteSeries
  };
}

export async function buildCommentVelocityMinuteSeriesArtifactFromFileV001(
  input: BuildCommentVelocityMinuteSeriesFromFileInputV001
): Promise<CommentVelocityMinuteSeriesArtifactV001> {
  assertWorkspaceRelativePath(input.rawChatReplayPath, 'raw chat replayのpath');
  const rawChatReplayBytes = await readFile(path.join(input.workspaceRoot, input.rawChatReplayPath));
  return buildCommentVelocityMinuteSeriesArtifactFromBytesV001({...input, rawChatReplayBytes});
}

function assertRendererCounts(value: unknown, label: string): asserts value is RendererCounts {
  if (!isRecord(value)) {
    fail('ARTIFACT_INVALID', `${label}がobjectではありません`);
  }
  const keys = Object.keys(value);
  if (keys.some((key, index) => !RENDERER_NAME.test(key)
    || (index > 0 && compareStrings(keys[index - 1], key) >= 0))) {
    fail('ARTIFACT_INVALID', `${label}のrenderer名または順序が不正です`);
  }
  for (const [renderer, count] of Object.entries(value)) {
    assertNonNegativeSafeInteger(count, `${label}.${renderer}`);
  }
}

function assertExactStringArray(value: unknown, expected: readonly string[], label: string): void {
  if (!Array.isArray(value)
    || value.length !== expected.length
    || value.some((item, index) => item !== expected[index])) {
    fail('ARTIFACT_INVALID', `${label}が正式値と一致しません`);
  }
}

export function assertCommentVelocityMinuteSeriesArtifactV001(
  value: unknown
): asserts value is CommentVelocityMinuteSeriesArtifactV001 {
  if (!isRecord(value) || !hasExactKeys(value, [
    'schemaVersion',
    'analysisId',
    'analysisType',
    'sourceVideoId',
    'sourceDurationMs',
    'acquisition',
    'countingPolicy',
    'sourceOnlyGuard',
    'baseline',
    'minuteSeries'
  ])) {
    fail('ARTIFACT_INVALID', '正式1分コメント流量成果物のroot構造が不正です');
  }
  if (value.schemaVersion !== COMMENT_VELOCITY_MINUTE_SERIES_SCHEMA_VERSION_V001
    || typeof value.analysisId !== 'string'
    || !FORMAL_ID.test(value.analysisId)
    || value.analysisType !== COMMENT_VELOCITY_MINUTE_SERIES_ANALYSIS_TYPE_V001
    || typeof value.sourceVideoId !== 'string'
    || !SOURCE_VIDEO_ID.test(value.sourceVideoId)) {
    fail('ARTIFACT_INVALID', '正式1分コメント流量成果物の版・ID・種類が不正です');
  }
  assertPositiveSafeInteger(value.sourceDurationMs, '元動画尺', 'ARTIFACT_INVALID');

  if (!isRecord(value.acquisition) || !hasExactKeys(value.acquisition, [
    'filePath', 'fileBytes', 'sha256', 'lineCount', 'parseErrorCount',
    'minOffsetMs', 'maxOffsetMs', 'rendererCounts'
  ])) {
    fail('ARTIFACT_INVALID', 'raw chat replay bindingの構造が不正です');
  }
  assertWorkspaceRelativePath(value.acquisition.filePath, 'raw chat replayのpath', 'ARTIFACT_INVALID');
  assertPositiveSafeInteger(value.acquisition.fileBytes, 'raw chat replayのbyte数', 'ARTIFACT_INVALID');
  assertPositiveSafeInteger(value.acquisition.lineCount, 'raw chat replayの行数', 'ARTIFACT_INVALID');
  if (typeof value.acquisition.sha256 !== 'string'
    || !SHA256.test(value.acquisition.sha256)
    || value.acquisition.parseErrorCount !== 0) {
    fail('ARTIFACT_INVALID', 'raw chat replayのSHAまたはparse結果が不正です');
  }
  if (rawChatReplayVideoId(value.acquisition.filePath) !== value.sourceVideoId) {
    fail('SOURCE_VIDEO_MISMATCH', '成果物の元動画IDとraw chat replay pathが一致しません');
  }
  assertSafeInteger(value.acquisition.minOffsetMs, 'raw chat replayの最小時刻');
  assertSafeInteger(value.acquisition.maxOffsetMs, 'raw chat replayの最大時刻');
  if (value.acquisition.minOffsetMs > value.acquisition.maxOffsetMs
    || value.acquisition.maxOffsetMs < value.sourceDurationMs) {
    fail('ARTIFACT_INVALID', 'raw chat replayの時刻範囲が不正です');
  }
  assertRendererCounts(value.acquisition.rendererCounts, 'raw chat replayのrenderer件数');

  if (!isRecord(value.countingPolicy) || !hasExactKeys(value.countingPolicy, [
    'countedRenderers',
    'excludedObservedRenderers',
    'chatTextOrAuthorPersistedInAnalysis',
    'finalPartialMinute'
  ])) {
    fail('ARTIFACT_INVALID', 'コメント計数方針の構造が不正です');
  }
  assertExactStringArray(
    value.countingPolicy.countedRenderers,
    COMMENT_VELOCITY_COUNTED_RENDERERS_V001,
    '計数対象renderer'
  );
  const expectedExcluded = Object.keys(value.acquisition.rendererCounts)
    .filter((renderer) => !COUNTED_RENDERER_SET.has(renderer))
    .sort(compareStrings);
  assertExactStringArray(
    value.countingPolicy.excludedObservedRenderers,
    expectedExcluded,
    '計数除外renderer'
  );
  if (value.countingPolicy.chatTextOrAuthorPersistedInAnalysis !== false
    || value.countingPolicy.finalPartialMinute !== FINAL_PARTIAL_MINUTE_POLICY) {
    fail('ARTIFACT_INVALID', 'コメント計数方針の固定値が不正です');
  }

  if (!isRecord(value.sourceOnlyGuard) || !hasExactKeys(value.sourceOnlyGuard, [
    'expectedUsed', 'clipUsed', 'alignmentUsed', 'chatTextIncluded', 'chatAuthorIncluded'
  ]) || Object.values(value.sourceOnlyGuard).some((item) => item !== false)) {
    fail('ARTIFACT_INVALID', 'source-only保証が不正です');
  }
  if (!isRecord(value.baseline) || !hasExactKeys(value.baseline, [
    'definition',
    'absoluteThresholdUsedForSelection',
    'fullMinuteCount',
    'fullMinuteCommentCount',
    'baselineCommentsPerMinute',
    'beforeStreamCount',
    'afterStreamCount'
  ])) {
    fail('ARTIFACT_INVALID', '配信内基準流量の構造が不正です');
  }
  if (value.baseline.definition !== BASELINE_DEFINITION
    || value.baseline.absoluteThresholdUsedForSelection !== false) {
    fail('ARTIFACT_INVALID', '配信内基準流量の定義が不正です');
  }
  assertPositiveSafeInteger(value.baseline.fullMinuteCount, '完全な1分区間数', 'ARTIFACT_INVALID');
  assertPositiveSafeInteger(
    value.baseline.fullMinuteCommentCount,
    '完全な1分区間のコメント総数',
    'ARTIFACT_INVALID'
  );
  assertFiniteNonNegative(value.baseline.baselineCommentsPerMinute, '配信内基準流量');
  assertNonNegativeSafeInteger(value.baseline.beforeStreamCount, '配信前コメント数');
  assertNonNegativeSafeInteger(value.baseline.afterStreamCount, '配信後コメント数');

  if (!Array.isArray(value.minuteSeries)
    || value.minuteSeries.length !== Math.ceil(value.sourceDurationMs / MINUTE_MS)
    || value.baseline.fullMinuteCount !== Math.floor(value.sourceDurationMs / MINUTE_MS)) {
    fail('ARTIFACT_INVALID', '1分区間数が元動画尺と一致しません');
  }
  let calculatedFullMinuteCommentCount = 0;
  for (const [index, minute] of value.minuteSeries.entries()) {
    if (!isRecord(minute) || !hasExactKeys(minute, [
      'minuteIndex',
      'sourceStartMs',
      'sourceEndMs',
      'durationMs',
      'commentCount',
      'rendererCounts',
      'isFullMinute',
      'commentRatePerMinute',
      'relativeToStreamBaseline'
    ])) {
      fail('ARTIFACT_INVALID', `1分区間 ${index + 1}件目の構造が不正です`);
    }
    const expectedStartMs = index * MINUTE_MS;
    const expectedEndMs = Math.min((index + 1) * MINUTE_MS, value.sourceDurationMs);
    const expectedDurationMs = expectedEndMs - expectedStartMs;
    assertNonNegativeSafeInteger(minute.commentCount, `1分区間 ${index + 1}件目のコメント数`);
    assertRendererCounts(minute.rendererCounts, `1分区間 ${index + 1}件目のrenderer件数`);
    const rendererCount = Object.values(minute.rendererCounts)
      .reduce((total, count) => total + count, 0);
    const expectedRate = minute.commentCount / (expectedDurationMs / MINUTE_MS);
    const expectedRelative = expectedRate / value.baseline.baselineCommentsPerMinute;
    if (minute.minuteIndex !== index
      || minute.sourceStartMs !== expectedStartMs
      || minute.sourceEndMs !== expectedEndMs
      || minute.durationMs !== expectedDurationMs
      || minute.isFullMinute !== (expectedDurationMs === MINUTE_MS)
      || minute.commentCount !== rendererCount
      || minute.commentRatePerMinute !== expectedRate
      || minute.relativeToStreamBaseline !== expectedRelative) {
      fail('ARTIFACT_INVALID', `1分区間 ${index + 1}件目の時刻・件数・流量値が不正です`);
    }
    if (minute.isFullMinute) calculatedFullMinuteCommentCount += minute.commentCount;
  }
  if (value.baseline.fullMinuteCommentCount !== calculatedFullMinuteCommentCount
    || value.baseline.baselineCommentsPerMinute
      !== calculatedFullMinuteCommentCount / value.baseline.fullMinuteCount) {
    fail('ARTIFACT_INVALID', '配信内基準流量の集計値が1分区間と一致しません');
  }
}

export function serializeCommentVelocityMinuteSeriesArtifactV001(
  artifact: CommentVelocityMinuteSeriesArtifactV001
): Buffer {
  assertCommentVelocityMinuteSeriesArtifactV001(artifact);
  return Buffer.from(`${JSON.stringify(artifact, null, 2)}\n`, 'utf8');
}

export function decodeCommentVelocityMinuteSeriesArtifactV001(
  bytes: Uint8Array
): CommentVelocityMinuteSeriesArtifactV001 {
  let value: unknown;
  try {
    value = JSON.parse(Buffer.from(bytes).toString('utf8'));
  } catch (error) {
    fail('ARTIFACT_INVALID', '正式1分コメント流量成果物をJSONとして読めません', error);
  }
  assertCommentVelocityMinuteSeriesArtifactV001(value);
  return value;
}

export function validateCommentVelocityMinuteSeriesArtifactAgainstRawChatBytesV001(
  artifact: unknown,
  input: BuildCommentVelocityMinuteSeriesFromBytesInputV001
): void {
  assertCommentVelocityMinuteSeriesArtifactV001(artifact);
  if (artifact.sourceVideoId !== input.sourceVideoId) {
    fail('SOURCE_VIDEO_MISMATCH', '成果物と実入力の元動画IDが一致しません');
  }
  if (artifact.acquisition.filePath !== input.rawChatReplayPath
    || artifact.analysisId !== input.analysisId
    || artifact.sourceDurationMs !== input.sourceDurationMs) {
    fail('ARTIFACT_BINDING_MISMATCH', '成果物と実入力のpath・ID・動画尺が一致しません');
  }
  if (artifact.acquisition.sha256 !== sha256(input.rawChatReplayBytes)
    || artifact.acquisition.fileBytes !== input.rawChatReplayBytes.byteLength) {
    fail('RAW_CHAT_SHA_MISMATCH', 'raw chat replayのbyteまたはSHA-256がbindingと一致しません');
  }
  const rebuilt = buildCommentVelocityMinuteSeriesArtifactFromBytesV001(input);
  if (!serializeCommentVelocityMinuteSeriesArtifactV001(artifact)
    .equals(serializeCommentVelocityMinuteSeriesArtifactV001(rebuilt))) {
    fail('ARTIFACT_BINDING_MISMATCH', '成果物がraw chat replayからの決定的再構築結果と一致しません');
  }
}

export async function writeCommentVelocityMinuteSeriesArtifactFromFileV001(
  input: WriteCommentVelocityMinuteSeriesFromFileInputV001
): Promise<{artifact: CommentVelocityMinuteSeriesArtifactV001; bytes: Buffer}> {
  assertWorkspaceRelativePath(input.outputPath, '出力path');
  const artifact = await buildCommentVelocityMinuteSeriesArtifactFromFileV001(input);
  const bytes = serializeCommentVelocityMinuteSeriesArtifactV001(artifact);
  const absoluteOutputPath = path.join(input.workspaceRoot, input.outputPath);
  await mkdir(path.dirname(absoluteOutputPath), {recursive: true});
  await writeFile(absoluteOutputPath, bytes, {flag: 'wx'});
  return {artifact, bytes};
}
