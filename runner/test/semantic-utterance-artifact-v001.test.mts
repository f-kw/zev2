import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';

import {
  SemanticUtteranceArtifactErrorV001,
  assertSemanticUtteranceArtifactV001,
  buildSemanticUtteranceArtifactFromTranscriptBytesV001,
  buildSemanticUtteranceArtifactFromTranscriptFileV001,
  decodeSemanticUtteranceArtifactV001,
  serializeSemanticUtteranceArtifactV001,
  validateSemanticUtteranceArtifactAgainstTranscriptBytesV001
} from '../src/semantic-utterance-artifact-v001.js';

const workspaceRoot = path.resolve(import.meta.dirname, '..', '..');
const sourceTranscriptPath = 'docs/artifacts/samples/transcript.json';

function transcript(overrides: Record<string, unknown> = {}): Buffer {
  const value = {
    kind: 'transcript_json',
    mode: 'zev-local-stt',
    sourceUri: 'file:///fixture/source.mp4',
    notes: [],
    generatedAt: '2026-08-23T00:00:00.000Z',
    language: 'ja-JP',
    durationSec: 3,
    segmentCount: 3,
    segments: [
      {id: 10, startMs: 0, endMs: 800, text: '前半です。'},
      {id: 20, startMs: 900, endMs: 1700, text: '続きです。'},
      {id: 30, startMs: 2000, endMs: 2800, text: '後半です。'}
    ],
    speechUnitGroups: [[10, 20], [30]],
    ...overrides
  };
  return Buffer.from(`${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function expectCode(code: string, action: () => unknown): void {
  assert.throws(action, (error: unknown) => (
    error instanceof SemanticUtteranceArtifactErrorV001 && error.code === code
  ));
}

test('正式意味発話は現行の発話まとまりを安定ID・本文・時刻・元断片へ変換する', () => {
  const bytes = transcript();
  const artifact = buildSemanticUtteranceArtifactFromTranscriptBytesV001({
    sourceTranscriptPath: 'fixtures/transcript.json',
    sourceTranscriptBytes: bytes
  });
  assert.deepEqual(artifact, {
    schemaVersion: 'semantic-utterance-artifact-v001',
    sourceTranscriptBinding: {
      path: 'fixtures/transcript.json',
      schemaVersion: 'transcript-json-v001',
      fileSha256: createHash('sha256').update(bytes).digest('hex')
    },
    sourceUri: 'file:///fixture/source.mp4',
    language: 'ja-JP',
    segmentCount: 3,
    utteranceCount: 2,
    utterances: [
      {
        utteranceId: 'semantic-utterance-000001',
        ordinal: 1,
        text: '前半です。続きです。',
        sourceStartMs: 0,
        sourceEndMs: 1700,
        sourceSegmentIds: [10, 20]
      },
      {
        utteranceId: 'semantic-utterance-000002',
        ordinal: 2,
        text: '後半です。',
        sourceStartMs: 2000,
        sourceEndMs: 2800,
        sourceSegmentIds: [30]
      }
    ]
  });
});

test('各STT断片の完全被覆を要求し、未知・重複・欠落・順序逆転を個別に拒否する', () => {
  expectCode('UNKNOWN_SEGMENT_ID', () => buildSemanticUtteranceArtifactFromTranscriptBytesV001({
    sourceTranscriptPath: 'fixtures/transcript.json',
    sourceTranscriptBytes: transcript({speechUnitGroups: [[10, 20], [40]]})
  }));
  expectCode('SEGMENT_DUPLICATE', () => buildSemanticUtteranceArtifactFromTranscriptBytesV001({
    sourceTranscriptPath: 'fixtures/transcript.json',
    sourceTranscriptBytes: transcript({speechUnitGroups: [[10, 20], [20, 30]]})
  }));
  expectCode('SEGMENT_MISSING', () => buildSemanticUtteranceArtifactFromTranscriptBytesV001({
    sourceTranscriptPath: 'fixtures/transcript.json',
    sourceTranscriptBytes: transcript({speechUnitGroups: [[10], [30]]})
  }));
  expectCode('SEGMENT_ORDER_REVERSED', () => buildSemanticUtteranceArtifactFromTranscriptBytesV001({
    sourceTranscriptPath: 'fixtures/transcript.json',
    sourceTranscriptBytes: transcript({speechUnitGroups: [[20, 10], [30]]})
  }));
});

test('元transcript自体の時系列逆転も拒否する', () => {
  expectCode('SEGMENT_ORDER_REVERSED', () => buildSemanticUtteranceArtifactFromTranscriptBytesV001({
    sourceTranscriptPath: 'fixtures/transcript.json',
    sourceTranscriptBytes: transcript({
      segments: [
        {id: 10, startMs: 900, endMs: 1700, text: '後です。'},
        {id: 20, startMs: 0, endMs: 800, text: '前です。'},
        {id: 30, startMs: 2000, endMs: 2800, text: '最後です。'}
      ]
    })
  }));
});

test('束縛した元transcriptのSHA-256が異なる場合はfail-closedで拒否する', () => {
  const original = transcript();
  const artifact = buildSemanticUtteranceArtifactFromTranscriptBytesV001({
    sourceTranscriptPath: 'fixtures/transcript.json',
    sourceTranscriptBytes: original
  });
  expectCode('TRANSCRIPT_SHA_MISMATCH', () => validateSemanticUtteranceArtifactAgainstTranscriptBytesV001(
    artifact,
    {
      sourceTranscriptPath: 'fixtures/transcript.json',
      sourceTranscriptBytes: transcript({notes: ['byte changed']})
    }
  ));
});

test('同一入力はbyte単位で同一の成果物になり、再読後も元transcriptと一致する', () => {
  const sourceTranscriptBytes = transcript();
  const input = {sourceTranscriptPath: 'fixtures/transcript.json', sourceTranscriptBytes};
  const first = buildSemanticUtteranceArtifactFromTranscriptBytesV001(input);
  const second = buildSemanticUtteranceArtifactFromTranscriptBytesV001(input);
  const firstBytes = serializeSemanticUtteranceArtifactV001(first);
  const secondBytes = serializeSemanticUtteranceArtifactV001(second);
  assert.deepEqual(firstBytes, secondBytes);
  const decoded = decodeSemanticUtteranceArtifactV001(firstBytes);
  validateSemanticUtteranceArtifactAgainstTranscriptBytesV001(decoded, input);
});

test('成果物の余分なfieldや元transcriptと異なる本文を拒否する', () => {
  const sourceTranscriptBytes = transcript();
  const input = {sourceTranscriptPath: 'fixtures/transcript.json', sourceTranscriptBytes};
  const artifact = buildSemanticUtteranceArtifactFromTranscriptBytesV001(input);
  expectCode('ARTIFACT_INVALID', () => assertSemanticUtteranceArtifactV001({...artifact, unexpected: true}));
  const changed = structuredClone(artifact);
  changed.utterances[0].text = '書き換え';
  expectCode('ARTIFACT_BINDING_MISMATCH', () => (
    validateSemanticUtteranceArtifactAgainstTranscriptBytesV001(changed, input)
  ));
});

test('保存済みの現行transcriptを正式入力として読める', async () => {
  const artifact = await buildSemanticUtteranceArtifactFromTranscriptFileV001({
    workspaceRoot,
    sourceTranscriptPath
  });
  const bytes = await readFile(path.join(workspaceRoot, sourceTranscriptPath));
  assert.equal(artifact.segmentCount, 3);
  assert.equal(artifact.utteranceCount, 2);
  assert.equal(artifact.sourceTranscriptBinding.fileSha256, createHash('sha256').update(bytes).digest('hex'));
});
