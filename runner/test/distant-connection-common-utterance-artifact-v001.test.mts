import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';

import {
  DistantConnectionCommonUtteranceArtifactErrorV001,
  assertDistantConnectionCommonUtteranceArtifactV001,
  buildDistantConnectionCommonUtteranceArtifactFromTranscriptBytesV001,
  buildDistantConnectionCommonUtteranceArtifactFromTranscriptFileV001,
  decodeDistantConnectionCommonUtteranceArtifactV001,
  serializeDistantConnectionCommonUtteranceArtifactV001,
  validateDistantConnectionCommonUtteranceArtifactAgainstTranscriptBytesV001
} from '../src/distant-connection-common-utterance-artifact-v001.js';

const workspaceRoot = path.resolve(import.meta.dirname, '..', '..');
const ymTranscriptPath =
  'evals/clip_composition/stt/ymUsGrT6EaA_local30_v001/source/transcript.json';
const o8rTranscriptPath =
  'evals/clip_composition/stt/9dtwF5Exu5w_o8rZAhARXAc_local30_v001/source/transcript.json';

function transcript(overrides: Record<string, unknown> = {}): Buffer {
  const value = {
    kind: 'transcript_json',
    mode: 'zev-local-stt-chunked',
    sourceUri: 'file:///fixture/source.mp4',
    notes: [],
    generatedAt: '2026-09-01T00:00:00.000Z',
    language: 'ja-JP',
    durationSec: 1,
    segmentCount: 5,
    segments: [
      {id: 10, startMs: 0, endMs: 100, text: '前'},
      {id: 20, startMs: 90, endMs: 200, text: '半。'},
      {id: 30, startMs: 200, endMs: 300, text: '次'},
      {id: 40, startMs: 301, endMs: 400, text: '後'},
      {id: 50, startMs: 350, endMs: 450, text: '半?'}
    ],
    speechUnitGroups: [[10], [20], [30], [40], [50]],
    ...overrides
  };
  return Buffer.from(`${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function expectCode(code: string, action: () => unknown): void {
  assert.throws(action, (error: unknown) => (
    error instanceof DistantConnectionCommonUtteranceArtifactErrorV001
      && error.code === code
  ));
}

function buildFixture() {
  const sourceTranscriptBytes = transcript();
  const sourceTranscriptPath = 'fixtures/transcript.json';
  const artifact = buildDistantConnectionCommonUtteranceArtifactFromTranscriptBytesV001({
    sourceTranscriptPath,
    sourceTranscriptBytes
  });
  return {artifact, sourceTranscriptBytes, sourceTranscriptPath};
}

test('既存theme生成と同じ句読点・時刻gap条件で共通発話を決定的に結合する', () => {
  const {artifact, sourceTranscriptBytes} = buildFixture();
  assert.deepEqual(artifact, {
    schemaVersion: 'distant-connection-common-utterance-artifact-v001',
    algorithm: 'theme-generation-compact-segments-v001',
    sourceTranscriptBinding: {
      path: 'fixtures/transcript.json',
      schemaVersion: 'transcript-json-v001',
      fileSha256: createHash('sha256').update(sourceTranscriptBytes).digest('hex')
    },
    sourceUri: 'file:///fixture/source.mp4',
    language: 'ja-JP',
    sourceSegmentCount: 5,
    utteranceCount: 3,
    utterances: [
      {
        utteranceId: 'common-utterance-000001',
        ordinal: 1,
        sourceStartMs: 0,
        sourceEndMs: 200,
        text: '前半。',
        sourceSegmentIds: [10, 20]
      },
      {
        utteranceId: 'common-utterance-000002',
        ordinal: 2,
        sourceStartMs: 200,
        sourceEndMs: 300,
        text: '次',
        sourceSegmentIds: [30]
      },
      {
        utteranceId: 'common-utterance-000003',
        ordinal: 3,
        sourceStartMs: 301,
        sourceEndMs: 450,
        text: '後半?',
        sourceSegmentIds: [40, 50]
      }
    ]
  });
});

test('元断片を全件ちょうど1回・元順序のまま保持する', () => {
  const {artifact} = buildFixture();
  assert.deepEqual(
    artifact.utterances.flatMap((utterance) => utterance.sourceSegmentIds),
    [10, 20, 30, 40, 50]
  );
});

test('元transcriptの時系列逆転を並べ替えて隠さず拒否する', () => {
  expectCode('SEGMENT_ORDER_REVERSED', () => (
    buildDistantConnectionCommonUtteranceArtifactFromTranscriptBytesV001({
      sourceTranscriptPath: 'fixtures/transcript.json',
      sourceTranscriptBytes: transcript({
        segments: [
          {id: 20, startMs: 90, endMs: 200, text: '半。'},
          {id: 10, startMs: 0, endMs: 100, text: '前'},
          {id: 30, startMs: 200, endMs: 300, text: '次'},
          {id: 40, startMs: 301, endMs: 400, text: '後'},
          {id: 50, startMs: 350, endMs: 450, text: '半?'}
        ]
      })
    })
  ));
});

test('未知・重複・欠落・順序変更した元断片参照をfail-closedで拒否する', () => {
  const fixture = buildFixture();

  const unknown = structuredClone(fixture.artifact);
  unknown.utterances[0]!.sourceSegmentIds[0] = 999;
  expectCode('UNKNOWN_SEGMENT_ID', () => (
    validateDistantConnectionCommonUtteranceArtifactAgainstTranscriptBytesV001(unknown, fixture)
  ));

  const duplicate = structuredClone(fixture.artifact);
  duplicate.utterances[1]!.sourceSegmentIds[0] = 20;
  expectCode('SEGMENT_DUPLICATE', () => (
    validateDistantConnectionCommonUtteranceArtifactAgainstTranscriptBytesV001(duplicate, fixture)
  ));

  const missing = structuredClone(fixture.artifact);
  missing.utterances[0]!.sourceSegmentIds.pop();
  expectCode('SEGMENT_MISSING', () => (
    validateDistantConnectionCommonUtteranceArtifactAgainstTranscriptBytesV001(missing, fixture)
  ));

  const reversed = structuredClone(fixture.artifact);
  reversed.utterances[0]!.sourceSegmentIds.reverse();
  expectCode('SEGMENT_ORDER_REVERSED', () => (
    validateDistantConnectionCommonUtteranceArtifactAgainstTranscriptBytesV001(reversed, fixture)
  ));
});

test('本文改変・時刻不整合・入力SHA不一致を個別に拒否する', () => {
  const fixture = buildFixture();

  const changedText = structuredClone(fixture.artifact);
  changedText.utterances[0]!.text = '改変。';
  expectCode('TEXT_MISMATCH', () => (
    validateDistantConnectionCommonUtteranceArtifactAgainstTranscriptBytesV001(changedText, fixture)
  ));

  const changedTime = structuredClone(fixture.artifact);
  changedTime.utterances[0]!.sourceEndMs += 1;
  expectCode('TIME_MISMATCH', () => (
    validateDistantConnectionCommonUtteranceArtifactAgainstTranscriptBytesV001(changedTime, fixture)
  ));

  expectCode('TRANSCRIPT_SHA_MISMATCH', () => (
    validateDistantConnectionCommonUtteranceArtifactAgainstTranscriptBytesV001(fixture.artifact, {
      sourceTranscriptPath: fixture.sourceTranscriptPath,
      sourceTranscriptBytes: transcript({notes: ['byte changed']})
    })
  ));
});

test('余分なfieldとformal byteでないJSONを拒否する', () => {
  const {artifact} = buildFixture();
  expectCode('ARTIFACT_INVALID', () => (
    assertDistantConnectionCommonUtteranceArtifactV001({...artifact, unexpected: true})
  ));
  expectCode('ARTIFACT_INVALID', () => (
    decodeDistantConnectionCommonUtteranceArtifactV001(
      Buffer.from(JSON.stringify(artifact), 'utf8')
    )
  ));
});

test('同一入力から同一formal byteを生成し、再読後も元transcriptと一致する', () => {
  const fixture = buildFixture();
  const second = buildDistantConnectionCommonUtteranceArtifactFromTranscriptBytesV001(fixture);
  const firstBytes = serializeDistantConnectionCommonUtteranceArtifactV001(fixture.artifact);
  const secondBytes = serializeDistantConnectionCommonUtteranceArtifactV001(second);
  assert.deepEqual(firstBytes, secondBytes);
  const decoded = decodeDistantConnectionCommonUtteranceArtifactV001(firstBytes);
  validateDistantConnectionCommonUtteranceArtifactAgainstTranscriptBytesV001(decoded, fixture);
});

test('ymとo8rの既存全文STTを同じ結合処理で完全被覆する', async () => {
  const cases = [
    {
      path: ymTranscriptPath,
      transcriptSha256: '28938e70d267c617a50568f2782c541c9d6814eda7537349fefae1b45053960f',
      segmentCount: 10_723,
      utteranceCount: 431
    },
    {
      path: o8rTranscriptPath,
      transcriptSha256: 'cd79fbf244bdb73b2eb7ddcffa3fca55e087046b72cbf26b69b87856dae01389',
      segmentCount: 34_507,
      utteranceCount: 1_323
    }
  ];

  for (const expected of cases) {
    const artifact = await buildDistantConnectionCommonUtteranceArtifactFromTranscriptFileV001({
      workspaceRoot,
      sourceTranscriptPath: expected.path
    });
    const bytes = await readFile(path.join(workspaceRoot, expected.path));
    assert.equal(createHash('sha256').update(bytes).digest('hex'), expected.transcriptSha256);
    assert.equal(artifact.sourceTranscriptBinding.fileSha256, expected.transcriptSha256);
    assert.equal(artifact.sourceSegmentCount, expected.segmentCount);
    assert.equal(artifact.utteranceCount, expected.utteranceCount);
    assert.equal(
      artifact.utterances.reduce((count, utterance) => count + utterance.sourceSegmentIds.length, 0),
      expected.segmentCount
    );
    validateDistantConnectionCommonUtteranceArtifactAgainstTranscriptBytesV001(artifact, {
      sourceTranscriptPath: expected.path,
      sourceTranscriptBytes: bytes
    });
  }
});
