import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';

import {
  CommentVelocityAnchorArtifactErrorV001,
  assertCommentVelocityAnchorArtifactV001,
  buildCommentVelocityAnchorArtifactFromBytesV001,
  decodeCommentVelocityAnchorArtifactV001,
  serializeCommentVelocityAnchorArtifactV001,
  validateCommentVelocityAnchorArtifactAgainstInputsV001
} from '../src/comment-velocity-anchor-artifact-v001.js';
import {
  buildSemanticUtteranceArtifactFromTranscriptBytesV001,
  serializeSemanticUtteranceArtifactV001
} from '../src/semantic-utterance-artifact-v001.js';

const workspaceRoot = path.resolve(import.meta.dirname, '..', '..');

function jsonBytes(value: unknown): Buffer {
  return Buffer.from(`${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function semanticBytes(sourceVideoId = 'source'): Buffer {
  const transcript = jsonBytes({
    kind: 'transcript_json',
    mode: 'zev-local-stt',
    sourceUri: `file:///fixture/${sourceVideoId}.mp4`,
    notes: [],
    generatedAt: '2026-08-23T00:00:00.000Z',
    language: 'ja-JP',
    durationSec: 180,
    segmentCount: 3,
    segments: [
      {id: 1, startMs: 59_000, endMs: 61_000, text: '境界をまたぐ発話です。'},
      {id: 2, startMs: 120_000, endMs: 121_000, text: '次の区間の発話です。'},
      {id: 3, startMs: 180_000, endMs: 181_000, text: '選択外の発話です。'}
    ],
    speechUnitGroups: [[1], [2], [3]]
  });
  const artifact = buildSemanticUtteranceArtifactFromTranscriptBytesV001({
    sourceTranscriptPath: 'fixtures/transcript.json',
    sourceTranscriptBytes: transcript
  });
  return serializeSemanticUtteranceArtifactV001(artifact);
}

function commentVelocityBytes(sourceVideoId = 'source'): Buffer {
  return jsonBytes({
    schemaVersion: 1,
    analysisId: 'source-chat-velocity-v001',
    generatedAt: '2026-08-23T00:00:00.000Z',
    analysisType: 'source-only-chat-replay-relative-velocity-ranking',
    sourceVideoId,
    sourceDurationMs: 240_000,
    minuteSeries: [
      {
        minuteIndex: 0,
        sourceStartMs: 0,
        sourceEndMs: 60_000,
        durationMs: 60_000,
        commentCount: 10,
        isFullMinute: true,
        relativeToStreamBaseline: 1.1
      },
      {
        minuteIndex: 1,
        sourceStartMs: 60_000,
        sourceEndMs: 120_000,
        durationMs: 60_000,
        commentCount: 20,
        isFullMinute: true,
        relativeToStreamBaseline: 1.2
      },
      {
        minuteIndex: 2,
        sourceStartMs: 120_000,
        sourceEndMs: 180_000,
        durationMs: 60_000,
        commentCount: 30,
        isFullMinute: true,
        relativeToStreamBaseline: 1.3
      }
    ]
  });
}

function input(overrides: Partial<{
  commentVelocityBytes: Buffer;
  semanticUtteranceBytes: Buffer;
  selectedMinuteIndexes: number[];
}> = {}) {
  return {
    commentVelocityPath: 'fixtures/comment-velocity.json',
    commentVelocityBytes: commentVelocityBytes(),
    semanticUtterancePath: 'fixtures/semantic-utterances.json',
    semanticUtteranceBytes: semanticBytes(),
    selectedMinuteIndexes: [0, 1, 2],
    ...overrides
  };
}

function expectCode(code: string, action: () => unknown): void {
  assert.throws(action, (error: unknown) => (
    error instanceof CommentVelocityAnchorArtifactErrorV001 && error.code === code
  ));
}

test('正の時間交差だけで正式発話を結び付け、境界接触だけの区間は含めない', () => {
  const artifact = buildCommentVelocityAnchorArtifactFromBytesV001(input());
  assert.equal(artifact.commentRangeCount, 3);
  assert.equal(artifact.anchorCount, 2);
  assert.deepEqual(artifact.anchors, [
    {
      anchorId: 'comment-anchor-000001',
      ordinal: 1,
      utteranceId: 'semantic-utterance-000001',
      evidenceCommentRangeIds: ['comment-minute-000000', 'comment-minute-000001']
    },
    {
      anchorId: 'comment-anchor-000002',
      ordinal: 2,
      utteranceId: 'semantic-utterance-000002',
      evidenceCommentRangeIds: ['comment-minute-000002']
    }
  ]);
  assert.equal(
    artifact.anchors[1].evidenceCommentRangeIds.includes('comment-minute-000001'),
    false,
    '120000msで接するだけの区間は根拠に含めない'
  );
});

test('同じ正式発話が複数区間に重なってもアンカーは1件で根拠を全件保持する', () => {
  const artifact = buildCommentVelocityAnchorArtifactFromBytesV001(input());
  const matching = artifact.anchors.filter((anchor) => (
    anchor.utteranceId === 'semantic-utterance-000001'
  ));
  assert.equal(matching.length, 1);
  assert.deepEqual(matching[0].evidenceCommentRangeIds, [
    'comment-minute-000000',
    'comment-minute-000001'
  ]);
});

test('コメント区間の閾値や件数を固定せず、指定された既存minuteIndexだけを接続する', () => {
  const artifact = buildCommentVelocityAnchorArtifactFromBytesV001(input({
    selectedMinuteIndexes: [1]
  }));
  assert.equal(artifact.commentRangeCount, 1);
  assert.deepEqual(artifact.commentRanges.map((range) => range.minuteIndex), [1]);
  assert.deepEqual(artifact.anchors.map((anchor) => anchor.utteranceId), [
    'semantic-utterance-000001'
  ]);
});

test('未知・重複・時系列逆転したコメント区間指定をfail-closedで拒否する', () => {
  expectCode('COMMENT_RANGE_UNKNOWN', () => buildCommentVelocityAnchorArtifactFromBytesV001(input({
    selectedMinuteIndexes: [4]
  })));
  expectCode('COMMENT_RANGE_DUPLICATE', () => buildCommentVelocityAnchorArtifactFromBytesV001(input({
    selectedMinuteIndexes: [0, 0]
  })));
  expectCode('COMMENT_RANGE_ORDER_REVERSED', () => buildCommentVelocityAnchorArtifactFromBytesV001(input({
    selectedMinuteIndexes: [2, 1]
  })));
});

test('コメント流量と正式意味発話の元動画が一致しなければ拒否する', () => {
  expectCode('SOURCE_VIDEO_MISMATCH', () => buildCommentVelocityAnchorArtifactFromBytesV001(input({
    commentVelocityBytes: commentVelocityBytes('different-source')
  })));
});

test('既存の1分コメント流量集計を変更せず正式発話へ接続できる', async () => {
  const commentVelocityBytes = await readFile(path.join(
    workspaceRoot,
    'evals/clip_composition/outputs/chat-velocity-analysis/'
      + 'DmWu0jVQfTE-first-gate-unseen-source-only-v001.json'
  ));
  const artifact = buildCommentVelocityAnchorArtifactFromBytesV001(input({
    commentVelocityBytes,
    semanticUtteranceBytes: semanticBytes('DmWu0jVQfTE'),
    selectedMinuteIndexes: [0]
  }));
  assert.equal(artifact.sourceVideoId, 'DmWu0jVQfTE');
  assert.equal(artifact.commentRangeCount, 1);
  assert.equal(artifact.commentVelocityBinding.schemaVersion, 'chat-velocity-analysis-v001');
});

test('両入力のpath・SHAを束縛し、SHA差をそれぞれ拒否する', () => {
  const originalInput = input();
  const artifact = buildCommentVelocityAnchorArtifactFromBytesV001(originalInput);
  expectCode('COMMENT_VELOCITY_SHA_MISMATCH', () => (
    validateCommentVelocityAnchorArtifactAgainstInputsV001(artifact, input({
      commentVelocityBytes: commentVelocityBytes('source-with-different-bytes')
    }))
  ));
  expectCode('SEMANTIC_UTTERANCE_SHA_MISMATCH', () => (
    validateCommentVelocityAnchorArtifactAgainstInputsV001(artifact, input({
      semanticUtteranceBytes: semanticBytes('source-with-different-bytes')
    }))
  ));
});

test('同一入力は同一byteになり、余分なfieldや内容改変を受理しない', () => {
  const originalInput = input();
  const first = buildCommentVelocityAnchorArtifactFromBytesV001(originalInput);
  const second = buildCommentVelocityAnchorArtifactFromBytesV001(originalInput);
  const firstBytes = serializeCommentVelocityAnchorArtifactV001(first);
  assert.deepEqual(firstBytes, serializeCommentVelocityAnchorArtifactV001(second));
  const decoded = decodeCommentVelocityAnchorArtifactV001(firstBytes);
  validateCommentVelocityAnchorArtifactAgainstInputsV001(decoded, originalInput);
  expectCode('ANCHOR_ARTIFACT_INVALID', () => (
    assertCommentVelocityAnchorArtifactV001({...first, unexpected: true})
  ));
  const changed = structuredClone(first);
  changed.anchors[0].evidenceCommentRangeIds = ['comment-minute-000002'];
  expectCode('ANCHOR_BINDING_MISMATCH', () => (
    validateCommentVelocityAnchorArtifactAgainstInputsV001(changed, originalInput)
  ));
});
