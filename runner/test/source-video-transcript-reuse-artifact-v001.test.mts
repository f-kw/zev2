import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';

import {
  SourceVideoTranscriptReuseArtifactErrorV001,
  assertSourceVideoTranscriptReuseArtifactV001,
  buildSourceVideoTranscriptReuseArtifactFromBytesV001,
  decodeSourceVideoTranscriptReuseArtifactV001,
  serializeSourceVideoTranscriptReuseArtifactV001,
  validateSourceVideoTranscriptReuseArtifactAgainstBytesV001,
  type BuildSourceVideoTranscriptReuseFromBytesInputV001
} from '../src/source-video-transcript-reuse-artifact-v001.js';

const workspaceRoot = '/workspace';
const sourceVideoPath = 'fixtures/source-video.mp4';
const sourceTranscriptPath = 'fixtures/transcript.json';
const sourceVideoBytes = Buffer.from('source-video-bytes', 'utf8');
const sourceVideoSha256 = createHash('sha256').update(sourceVideoBytes).digest('hex');

function transcript(overrides: Record<string, unknown> = {}): Buffer {
  return Buffer.from(`${JSON.stringify({
    kind: 'transcript_json',
    mode: 'zev-local-stt-chunked',
    sourceUri: '/workspace/fixtures/source-video.mp4',
    notes: [],
    generatedAt: '2026-09-01T00:00:00.000Z',
    language: 'ja-JP',
    durationSec: 3,
    segmentCount: 3,
    segments: [
      {id: 10, startMs: 100, endMs: 700, text: '前半'},
      {id: 20, startMs: 800, endMs: 1_600, text: 'です。'},
      {id: 30, startMs: 2_000, endMs: 2_800, text: '後半です。'}
    ],
    speechUnitGroups: [[10, 20], [30]],
    ...overrides
  }, null, 2)}\n`, 'utf8');
}

function input(
  overrides: Partial<BuildSourceVideoTranscriptReuseFromBytesInputV001> = {}
): BuildSourceVideoTranscriptReuseFromBytesInputV001 {
  return {
    workspaceRoot,
    sourceVideoId: 'source-video',
    sourceVideoPath,
    sourceVideoBytes,
    measuredSourceVideoDurationMs: 3_000,
    approvedSourceVideoSha256: sourceVideoSha256,
    approvedSourceVideoDurationMs: 3_000,
    sourceTranscriptPath,
    sourceTranscriptBytes: transcript(),
    ...overrides
  };
}

function expectCode(code: string, action: () => unknown): void {
  assert.throws(action, (error: unknown) => (
    error instanceof SourceVideoTranscriptReuseArtifactErrorV001 && error.code === code
  ));
}

test('取得動画と既存全文STTを動画ID・path・SHA・実測尺で正式に束縛する', () => {
  const source = input();
  const artifact = buildSourceVideoTranscriptReuseArtifactFromBytesV001(source);
  assert.deepEqual(artifact, {
    schemaVersion: 'source-video-transcript-reuse-artifact-v001',
    sourceVideoId: 'source-video',
    sourceVideoBinding: {
      path: sourceVideoPath,
      fileSha256: sourceVideoSha256,
      measuredDurationMs: 3_000
    },
    approvedSourceIdentity: {
      fileSha256: sourceVideoSha256,
      durationMs: 3_000
    },
    sourceTranscriptBinding: {
      path: sourceTranscriptPath,
      schemaVersion: 'transcript-json-v001',
      fileSha256: createHash('sha256').update(source.sourceTranscriptBytes).digest('hex'),
      mode: 'zev-local-stt-chunked',
      sourceUri: '/workspace/fixtures/source-video.mp4',
      durationMs: 3_000
    },
    transcriptCoverage: {
      segmentCount: 3,
      speechUnitGroupCount: 2,
      coveredSegmentCount: 3,
      firstSegmentStartMs: 100,
      lastSegmentEndMs: 2_800
    }
  });
});

test('取得動画のbyteまたは実測尺が承認済み履歴値と違う場合は拒否する', () => {
  expectCode('SOURCE_VIDEO_SHA_MISMATCH', () => (
    buildSourceVideoTranscriptReuseArtifactFromBytesV001(input({
      approvedSourceVideoSha256: '4c9911c860f7ed42cf6c66c1ceda605e5818381f695c26116632b1f86c4c2a06'
    }))
  ));
  expectCode('SOURCE_VIDEO_DURATION_MISMATCH', () => (
    buildSourceVideoTranscriptReuseArtifactFromBytesV001(input({
      approvedSourceVideoDurationMs: 3_001
    }))
  ));
});

test('動画ID、動画path、transcript動画参照の不一致を個別に拒否する', () => {
  expectCode('SOURCE_VIDEO_ID_MISMATCH', () => (
    buildSourceVideoTranscriptReuseArtifactFromBytesV001(input({sourceVideoId: 'different-video'}))
  ));
  expectCode('SOURCE_VIDEO_ID_MISMATCH', () => (
    buildSourceVideoTranscriptReuseArtifactFromBytesV001(input({
      sourceVideoPath: 'fixtures/other-video.mp4'
    }))
  ));
  expectCode('TRANSCRIPT_SOURCE_MISMATCH', () => (
    buildSourceVideoTranscriptReuseArtifactFromBytesV001(input({
      sourceTranscriptBytes: transcript({
        sourceUri: '/different/root/fixtures/source-video.mp4'
      })
    }))
  ));
  expectCode('SOURCE_VIDEO_ID_MISMATCH', () => (
    buildSourceVideoTranscriptReuseArtifactFromBytesV001(input({
      sourceTranscriptBytes: transcript({
        sourceUri: '/workspace/fixtures/different-video.mp4'
      })
    }))
  ));
});

test('transcriptの動画尺差、時系列逆転、動画尺外断片を拒否する', () => {
  expectCode('SOURCE_VIDEO_DURATION_MISMATCH', () => (
    buildSourceVideoTranscriptReuseArtifactFromBytesV001(input({
      sourceTranscriptBytes: transcript({durationSec: 3.001})
    }))
  ));
  expectCode('TRANSCRIPT_CHRONOLOGY_INVALID', () => (
    buildSourceVideoTranscriptReuseArtifactFromBytesV001(input({
      sourceTranscriptBytes: transcript({
        segments: [
          {id: 10, startMs: 800, endMs: 1_600, text: '後'},
          {id: 20, startMs: 100, endMs: 700, text: '前'},
          {id: 30, startMs: 2_000, endMs: 2_800, text: '最後'}
        ]
      })
    }))
  ));
  expectCode('TRANSCRIPT_CHRONOLOGY_INVALID', () => (
    buildSourceVideoTranscriptReuseArtifactFromBytesV001(input({
      sourceTranscriptBytes: transcript({
        segments: [
          {id: 10, startMs: 100, endMs: 700, text: '前半'},
          {id: 20, startMs: 800, endMs: 1_600, text: 'です。'},
          {id: 30, startMs: 2_000, endMs: 3_001, text: '尺外'}
        ]
      })
    }))
  ));
});

test('元STT断片の欠落、重複、順序変更を完全被覆検査で拒否する', () => {
  expectCode('TRANSCRIPT_COVERAGE_INVALID', () => (
    buildSourceVideoTranscriptReuseArtifactFromBytesV001(input({
      sourceTranscriptBytes: transcript({speechUnitGroups: [[10, 20]]})
    }))
  ));
  expectCode('TRANSCRIPT_COVERAGE_INVALID', () => (
    buildSourceVideoTranscriptReuseArtifactFromBytesV001(input({
      sourceTranscriptBytes: transcript({speechUnitGroups: [[10, 20], [20, 30]]})
    }))
  ));
  expectCode('TRANSCRIPT_COVERAGE_INVALID', () => (
    buildSourceVideoTranscriptReuseArtifactFromBytesV001(input({
      sourceTranscriptBytes: transcript({speechUnitGroups: [[20, 10], [30]]})
    }))
  ));
});

test('同じ入力は同じformal byteになり、SHA差と余分なfieldはfail-closedする', () => {
  const source = input();
  const first = buildSourceVideoTranscriptReuseArtifactFromBytesV001(source);
  const second = buildSourceVideoTranscriptReuseArtifactFromBytesV001(source);
  const firstBytes = serializeSourceVideoTranscriptReuseArtifactV001(first);
  assert.deepEqual(firstBytes, serializeSourceVideoTranscriptReuseArtifactV001(second));
  const decoded = decodeSourceVideoTranscriptReuseArtifactV001(firstBytes);
  validateSourceVideoTranscriptReuseArtifactAgainstBytesV001(decoded, source);

  expectCode('TRANSCRIPT_SHA_MISMATCH', () => (
    validateSourceVideoTranscriptReuseArtifactAgainstBytesV001(decoded, input({
      sourceTranscriptBytes: transcript({notes: ['changed']})
    }))
  ));
  expectCode('ARTIFACT_INVALID', () => (
    assertSourceVideoTranscriptReuseArtifactV001({...decoded, unexpected: true})
  ));
});

test('o8rの既存34,507断片STTは再生成せず正式再利用検査へ入力できる', async () => {
  const realWorkspaceRoot = path.resolve(import.meta.dirname, '..', '..');
  const realTranscriptPath =
    'evals/clip_composition/stt/9dtwF5Exu5w_o8rZAhARXAc_local30_v001/source/transcript.json';
  const sourceTranscriptBytes = await readFile(path.join(realWorkspaceRoot, realTranscriptPath));
  assert.equal(
    createHash('sha256').update(sourceTranscriptBytes).digest('hex'),
    'cd79fbf244bdb73b2eb7ddcffa3fca55e087046b72cbf26b69b87856dae01389'
  );
  const fixtureVideoBytes = Buffer.from('actual video is acquired in the approved later stage', 'utf8');
  const fixtureVideoSha = createHash('sha256').update(fixtureVideoBytes).digest('hex');
  const artifact = buildSourceVideoTranscriptReuseArtifactFromBytesV001({
    workspaceRoot: realWorkspaceRoot,
    sourceVideoId: 'o8rZAhARXAc',
    sourceVideoPath:
      'evals/clip_composition/research/downloads/9dtwF5Exu5w/sources/o8rZAhARXAc/o8rZAhARXAc.mp4',
    sourceVideoBytes: fixtureVideoBytes,
    measuredSourceVideoDurationMs: 11_898_441,
    approvedSourceVideoSha256: fixtureVideoSha,
    approvedSourceVideoDurationMs: 11_898_441,
    sourceTranscriptPath: realTranscriptPath,
    sourceTranscriptBytes
  });
  assert.equal(artifact.sourceVideoId, 'o8rZAhARXAc');
  assert.equal(artifact.sourceTranscriptBinding.fileSha256,
    'cd79fbf244bdb73b2eb7ddcffa3fca55e087046b72cbf26b69b87856dae01389');
  assert.equal(artifact.transcriptCoverage.segmentCount, 34_507);
  assert.equal(artifact.transcriptCoverage.coveredSegmentCount, 34_507);
  assert.equal(artifact.transcriptCoverage.speechUnitGroupCount, 34_507);
  assert.equal(artifact.sourceTranscriptBinding.durationMs, 11_898_441);
});
