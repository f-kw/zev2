import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import test from 'node:test';

import {
  COMMENT_VELOCITY_COUNTED_RENDERERS_V001,
  COMMENT_VELOCITY_MINUTE_SERIES_SCHEMA_ID_V001,
  CommentVelocityMinuteSeriesArtifactErrorV001,
  assertCommentVelocityMinuteSeriesArtifactV001,
  buildCommentVelocityMinuteSeriesArtifactFromBytesV001,
  decodeCommentVelocityMinuteSeriesArtifactV001,
  serializeCommentVelocityMinuteSeriesArtifactV001,
  validateCommentVelocityMinuteSeriesArtifactAgainstRawChatBytesV001
} from '../src/comment-velocity-minute-series-artifact-v001.js';

function replayLine(
  offsetMs: number | string | null,
  renderer = 'liveChatTextMessageRenderer'
): string {
  return JSON.stringify({
    replayChatItemAction: {
      videoOffsetTimeMsec: offsetMs,
      actions: [{
        addChatItemAction: {
          item: {
            [renderer]: {
              message: {runs: [{text: '成果物へ保存してはいけない本文'}]},
              authorName: {simpleText: '成果物へ保存してはいけない投稿者'}
            }
          }
        }
      }]
    }
  });
}

function rawChat(lines: string[] = [
  replayLine(-1_000),
  replayLine(0),
  replayLine(30_000, 'liveChatViewerEngagementMessageRenderer'),
  replayLine('60000', 'liveChatPaidMessageRenderer'),
  replayLine(124_999),
  replayLine(125_000)
]): Buffer {
  return Buffer.from(`${lines.join('\n')}\n`, 'utf8');
}

function input(overrides: Partial<{
  analysisId: string;
  sourceVideoId: string;
  sourceDurationMs: number;
  rawChatReplayPath: string;
  rawChatReplayBytes: Buffer;
}> = {}) {
  return {
    analysisId: 'source-formal-comment-velocity-v001',
    sourceVideoId: 'source',
    sourceDurationMs: 125_000,
    rawChatReplayPath: 'fixtures/chat-replay/source/source.live_chat.json',
    rawChatReplayBytes: rawChat(),
    ...overrides
  };
}

function expectCode(code: string, action: () => unknown): void {
  assert.throws(action, (error: unknown) => (
    error instanceof CommentVelocityMinuteSeriesArtifactErrorV001 && error.code === code
  ));
}

test('raw chat replayを正式な1分流量へ変換し、本文・投稿者を保存しない', () => {
  const source = input();
  const artifact = buildCommentVelocityMinuteSeriesArtifactFromBytesV001(source);

  assert.equal(
    COMMENT_VELOCITY_MINUTE_SERIES_SCHEMA_ID_V001,
    'comment-velocity-minute-series-artifact-v001'
  );
  assert.equal(artifact.schemaVersion, 2);
  assert.equal(artifact.schemaId, 'comment-velocity-minute-series-artifact-v001');
  assert.equal(artifact.sourceVideoId, 'source');
  assert.equal(artifact.acquisition.filePath, source.rawChatReplayPath);
  assert.equal(artifact.acquisition.fileBytes, source.rawChatReplayBytes.byteLength);
  assert.equal(
    artifact.acquisition.sha256,
    createHash('sha256').update(source.rawChatReplayBytes).digest('hex')
  );
  assert.equal(artifact.acquisition.lineCount, 6);
  assert.equal(artifact.acquisition.parseErrorCount, 0);
  assert.equal(artifact.acquisition.minOffsetMs, -1_000);
  assert.equal(artifact.acquisition.maxOffsetMs, 125_000);
  assert.deepEqual(artifact.acquisition.rendererCounts, {
    liveChatPaidMessageRenderer: 1,
    liveChatTextMessageRenderer: 4,
    liveChatViewerEngagementMessageRenderer: 1
  });
  assert.deepEqual(artifact.countingPolicy.countedRenderers, [
    ...COMMENT_VELOCITY_COUNTED_RENDERERS_V001
  ]);
  assert.deepEqual(artifact.countingPolicy.excludedObservedRenderers, [
    'liveChatViewerEngagementMessageRenderer'
  ]);
  assert.deepEqual(artifact.baseline, {
    definition: '配信内に完全に収まる1分区間すべての平均コメント数を1.0とする',
    absoluteThresholdUsedForSelection: false,
    fullMinuteCount: 2,
    fullMinuteCommentCount: 2,
    baselineCommentsPerMinute: 1,
    beforeStreamCount: 1,
    afterStreamCount: 1
  });
  assert.deepEqual(artifact.minuteSeries, [
    {
      minuteIndex: 0,
      sourceStartMs: 0,
      sourceEndMs: 60_000,
      durationMs: 60_000,
      commentCount: 1,
      rendererCounts: {liveChatTextMessageRenderer: 1},
      isFullMinute: true,
      commentRatePerMinute: 1,
      relativeToStreamBaseline: 1
    },
    {
      minuteIndex: 1,
      sourceStartMs: 60_000,
      sourceEndMs: 120_000,
      durationMs: 60_000,
      commentCount: 1,
      rendererCounts: {liveChatPaidMessageRenderer: 1},
      isFullMinute: true,
      commentRatePerMinute: 1,
      relativeToStreamBaseline: 1
    },
    {
      minuteIndex: 2,
      sourceStartMs: 120_000,
      sourceEndMs: 125_000,
      durationMs: 5_000,
      commentCount: 1,
      rendererCounts: {liveChatTextMessageRenderer: 1},
      isFullMinute: false,
      commentRatePerMinute: 12,
      relativeToStreamBaseline: 12
    }
  ]);

  const serialized = serializeCommentVelocityMinuteSeriesArtifactV001(artifact).toString('utf8');
  assert.equal(serialized.includes('成果物へ保存してはいけない本文'), false);
  assert.equal(serialized.includes('成果物へ保存してはいけない投稿者'), false);
});

test('最後の1分未満だけ実尺で正規化し、動画尺が1分単位なら余分な区間を作らない', () => {
  const artifact = buildCommentVelocityMinuteSeriesArtifactFromBytesV001(input({
    sourceDurationMs: 120_000,
    rawChatReplayBytes: rawChat([
      replayLine(0),
      replayLine(60_000),
      replayLine(120_000)
    ])
  }));
  assert.equal(artifact.minuteSeries.length, 2);
  assert.equal(artifact.minuteSeries.every((minute) => minute.isFullMinute), true);
  assert.equal(artifact.baseline.afterStreamCount, 1);
});

test('JSONL parse失敗・空行・不正offset・末尾未到達をfail-closedで拒否する', () => {
  expectCode('RAW_CHAT_JSONL_INVALID', () => (
    buildCommentVelocityMinuteSeriesArtifactFromBytesV001(input({
      rawChatReplayBytes: rawChat([replayLine(0), '{not-json}', replayLine(125_000)])
    }))
  ));
  expectCode('RAW_CHAT_JSONL_INVALID', () => (
    buildCommentVelocityMinuteSeriesArtifactFromBytesV001(input({
      rawChatReplayBytes: rawChat([replayLine(0), '', replayLine(125_000)])
    }))
  ));
  expectCode('RAW_CHAT_OFFSET_INVALID', () => (
    buildCommentVelocityMinuteSeriesArtifactFromBytesV001(input({
      rawChatReplayBytes: rawChat([replayLine(0), replayLine(null), replayLine(125_000)])
    }))
  ));
  expectCode('RAW_CHAT_TIME_RANGE_INVALID', () => (
    buildCommentVelocityMinuteSeriesArtifactFromBytesV001(input({
      rawChatReplayBytes: rawChat([replayLine(0), replayLine(124_999)])
    }))
  ));
  const invalidUtf8 = rawChat();
  const textByte = Buffer.from('成果物', 'utf8')[0];
  const invalidIndex = invalidUtf8.indexOf(textByte);
  assert.notEqual(invalidIndex, -1);
  invalidUtf8[invalidIndex] = 0xff;
  expectCode('RAW_CHAT_JSONL_INVALID', () => (
    buildCommentVelocityMinuteSeriesArtifactFromBytesV001(input({
      rawChatReplayBytes: invalidUtf8
    }))
  ));
});

test('raw chat replay pathの動画ID不一致と完全1分の基準不足を拒否する', () => {
  expectCode('SOURCE_VIDEO_MISMATCH', () => (
    buildCommentVelocityMinuteSeriesArtifactFromBytesV001(input({
      rawChatReplayPath: 'fixtures/chat-replay/other/other.live_chat.json'
    }))
  ));
  expectCode('FULL_MINUTE_BASELINE_EMPTY', () => (
    buildCommentVelocityMinuteSeriesArtifactFromBytesV001(input({sourceDurationMs: 59_999}))
  ));
  expectCode('FULL_MINUTE_BASELINE_EMPTY', () => (
    buildCommentVelocityMinuteSeriesArtifactFromBytesV001(input({
      rawChatReplayBytes: rawChat([
        replayLine(-1),
        replayLine(125_000)
      ])
    }))
  ));
});

test('同一入力は同一byteとなり、再読後もraw SHA・全内容を照合できる', () => {
  const source = input();
  const first = buildCommentVelocityMinuteSeriesArtifactFromBytesV001(source);
  const second = buildCommentVelocityMinuteSeriesArtifactFromBytesV001(source);
  const firstBytes = serializeCommentVelocityMinuteSeriesArtifactV001(first);
  assert.deepEqual(firstBytes, serializeCommentVelocityMinuteSeriesArtifactV001(second));

  const decoded = decodeCommentVelocityMinuteSeriesArtifactV001(firstBytes);
  validateCommentVelocityMinuteSeriesArtifactAgainstRawChatBytesV001(decoded, source);
  expectCode('ARTIFACT_INVALID', () => (
    decodeCommentVelocityMinuteSeriesArtifactV001(
      Buffer.from(JSON.stringify(decoded), 'utf8')
    )
  ));
});

test('raw chat replayのSHA差、動画差、生成内容改変をそれぞれ拒否する', () => {
  const source = input();
  const artifact = buildCommentVelocityMinuteSeriesArtifactFromBytesV001(source);
  expectCode('RAW_CHAT_SHA_MISMATCH', () => (
    validateCommentVelocityMinuteSeriesArtifactAgainstRawChatBytesV001(artifact, input({
      rawChatReplayBytes: rawChat([
        replayLine(-1_000),
        replayLine(1),
        replayLine(30_000, 'liveChatViewerEngagementMessageRenderer'),
        replayLine('60000', 'liveChatPaidMessageRenderer'),
        replayLine(124_999),
        replayLine(125_000)
      ])
    }))
  ));
  expectCode('SOURCE_VIDEO_MISMATCH', () => (
    validateCommentVelocityMinuteSeriesArtifactAgainstRawChatBytesV001(artifact, input({
      sourceVideoId: 'other',
      rawChatReplayPath: 'fixtures/chat-replay/other/other.live_chat.json'
    }))
  ));
  const changed = structuredClone(artifact);
  changed.minuteSeries[0].commentCount = 2;
  changed.minuteSeries[0].rendererCounts.liveChatTextMessageRenderer = 2;
  changed.minuteSeries[0].commentRatePerMinute = 2;
  changed.minuteSeries[0].relativeToStreamBaseline = 2;
  changed.baseline.fullMinuteCommentCount = 3;
  changed.baseline.baselineCommentsPerMinute = 1.5;
  expectCode('ARTIFACT_INVALID', () => assertCommentVelocityMinuteSeriesArtifactV001(changed));
});

test('余分なfield・未知schema・minute順序差・計数対象外renderer・総数差を拒否する', () => {
  const artifact = buildCommentVelocityMinuteSeriesArtifactFromBytesV001(input());
  expectCode('ARTIFACT_INVALID', () => (
    assertCommentVelocityMinuteSeriesArtifactV001({...artifact, unexpected: true})
  ));
  expectCode('ARTIFACT_INVALID', () => (
    assertCommentVelocityMinuteSeriesArtifactV001({...artifact, schemaVersion: 3})
  ));
  const reversed = structuredClone(artifact);
  [reversed.minuteSeries[0], reversed.minuteSeries[1]] = [
    reversed.minuteSeries[1],
    reversed.minuteSeries[0]
  ];
  expectCode('ARTIFACT_INVALID', () => assertCommentVelocityMinuteSeriesArtifactV001(reversed));

  const uncountedInMinute = structuredClone(artifact);
  uncountedInMinute.minuteSeries[0]!.rendererCounts = {
    liveChatViewerEngagementMessageRenderer: 1
  };
  expectCode('ARTIFACT_INVALID', () => (
    assertCommentVelocityMinuteSeriesArtifactV001(uncountedInMinute)
  ));

  const forgedAcquisitionTotal = structuredClone(artifact);
  forgedAcquisitionTotal.acquisition.rendererCounts.liveChatTextMessageRenderer += 1;
  expectCode('ARTIFACT_INVALID', () => (
    assertCommentVelocityMinuteSeriesArtifactV001(forgedAcquisitionTotal)
  ));
});
