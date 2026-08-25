import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';

import {
  buildCommentVelocityAnchorArtifactFromBytesV001,
  serializeCommentVelocityAnchorArtifactV001
} from '../src/comment-velocity-anchor-artifact-v001.js';
import {
  DISTANT_CONNECTION_LUNA_RESPONSE_SCHEMA_V001,
  DISTANT_CONNECTION_LUNA_SOURCE_PACKAGE_SCHEMA_V001,
  DistantConnectionLunaArtifactErrorV001,
  assertDistantConnectionLunaSourcePackageV001,
  buildDistantConnectionLunaSourcePackageFromBytesV001,
  buildDistantConnectionLunaSourcePackageFromFilesV001,
  decodeDistantConnectionLunaSourcePackageV001,
  serializeDistantConnectionLunaSourcePackageV001,
  validateDistantConnectionLunaResponseV001,
  validateDistantConnectionLunaSourcePackageAgainstInputsV001,
  type BuildDistantConnectionLunaSourcePackageFromBytesInputV001,
  type DistantConnectionLunaResponseV001
} from '../src/distant-connection-luna-source-package-v001.js';
import {
  buildSemanticUtteranceArtifactFromTranscriptBytesV001,
  serializeSemanticUtteranceArtifactV001
} from '../src/semantic-utterance-artifact-v001.js';

const workspaceRoot = path.resolve(import.meta.dirname, '..', '..');
const semanticUtterancePath =
  'evals/clip_composition/outputs/work-distant-connection-semantic-utterance-v001/'
  + 'semantic-utterance-artifact-v001.json';
const commentVelocityAnchorPath =
  'evals/clip_composition/outputs/work-distant-connection-comment-velocity-anchor-v001/'
  + 'comment-velocity-anchor-artifact-v001.json';
const sourcePackagePath =
  'evals/clip_composition/outputs/work-distant-connection-luna-source-package-v001/'
  + 'source-package-v001.json';

const plannedExecution = {
  providerId: 'openai-api',
  modelId: 'gpt-5.6-luna',
  operationId: 'responses',
  jobExperimentValues: []
};

function jsonBytes(value: unknown): Buffer {
  return Buffer.from(`${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function semanticBytes(sourceVideoId = 'source'): Buffer {
  const transcriptBytes = jsonBytes({
    kind: 'transcript_json',
    mode: 'zev-local-stt',
    sourceUri: `file:///fixture/${sourceVideoId}.mp4`,
    notes: [],
    generatedAt: '2026-08-23T00:00:00.000Z',
    language: 'ja-JP',
    durationSec: 20,
    segmentCount: 3,
    segments: [
      {id: 1, startMs: 1_000, endMs: 3_000, text: '前の一言です。'},
      {id: 2, startMs: 4_000, endMs: 6_000, text: '後の前置きです。'},
      {id: 3, startMs: 7_000, endMs: 9_000, text: '後の回収です。'}
    ],
    speechUnitGroups: [[1], [2], [3]]
  });
  return serializeSemanticUtteranceArtifactV001(
    buildSemanticUtteranceArtifactFromTranscriptBytesV001({
      sourceTranscriptPath: 'fixtures/transcript.json',
      sourceTranscriptBytes: transcriptBytes
    })
  );
}

function anchorBytes(
  sourceVideoId = 'source',
  semanticUtteranceBytes: Buffer = semanticBytes(sourceVideoId)
): Buffer {
  const commentVelocityBytes = jsonBytes({
    schemaVersion: 1,
    analysisId: 'source-chat-velocity-v001',
    generatedAt: '2026-08-23T00:00:00.000Z',
    analysisType: 'source-only-chat-replay-relative-velocity-ranking',
    sourceVideoId,
    sourceDurationMs: 60_000,
    minuteSeries: [{
      minuteIndex: 0,
      sourceStartMs: 0,
      sourceEndMs: 60_000,
      durationMs: 60_000,
      commentCount: 3,
      isFullMinute: true,
      relativeToStreamBaseline: 1
    }]
  });
  return serializeCommentVelocityAnchorArtifactV001(
    buildCommentVelocityAnchorArtifactFromBytesV001({
      commentVelocityPath: 'fixtures/comment-velocity.json',
      commentVelocityBytes,
      semanticUtterancePath: 'fixtures/semantic-utterances.json',
      semanticUtteranceBytes,
      selectedMinuteIndexes: [0]
    })
  );
}

function packageInput(
  overrides: Partial<BuildDistantConnectionLunaSourcePackageFromBytesInputV001> = {}
): BuildDistantConnectionLunaSourcePackageFromBytesInputV001 {
  const semanticUtteranceBytes = semanticBytes();
  return {
    semanticUtterancePath: 'fixtures/semantic-utterances.json',
    semanticUtteranceBytes,
    commentVelocityAnchorPath: 'fixtures/comment-velocity-anchors.json',
    commentVelocityAnchorBytes: anchorBytes('source', semanticUtteranceBytes),
    sourcePackagePath: 'outputs/source-package.json',
    plannedExecution,
    ...overrides
  };
}

function builtPackage(
  overrides: Partial<BuildDistantConnectionLunaSourcePackageFromBytesInputV001> = {}
) {
  const input = packageInput(overrides);
  const sourcePackage = buildDistantConnectionLunaSourcePackageFromBytesV001(input);
  const sourcePackageBytes = serializeDistantConnectionLunaSourcePackageV001(sourcePackage);
  return {input, sourcePackage, sourcePackageBytes};
}

function responseFor(
  sourcePackageBytes: Buffer,
  overrides: Partial<DistantConnectionLunaResponseV001> = {}
): DistantConnectionLunaResponseV001 {
  return {
    schemaVersion: DISTANT_CONNECTION_LUNA_RESPONSE_SCHEMA_V001,
    sourceVideoId: 'source',
    sourcePackageBinding: {
      path: 'outputs/source-package.json',
      schemaVersion: DISTANT_CONNECTION_LUNA_SOURCE_PACKAGE_SCHEMA_V001,
      fileSha256: createHash('sha256').update(sourcePackageBytes).digest('hex')
    },
    candidates: [{
      candidateId: 'distant-connection-candidate-000001',
      anchorId: 'comment-anchor-000001',
      firstPartSemanticUtteranceIds: ['semantic-utterance-000001'],
      secondPartSemanticUtteranceIds: [
        'semantic-utterance-000002',
        'semantic-utterance-000003'
      ],
      addedUnderstanding: '前の一言が後の回収の意味を変えます。',
      direction: 'future'
    }],
    ...overrides
  };
}

function expectCode(code: string, action: () => unknown): void {
  assert.throws(action, (error: unknown) => (
    error instanceof DistantConnectionLunaArtifactErrorV001 && error.code === code
  ));
}

test('全文の正式意味発話・コメント起点・探索目的・返答schemaを一つの正式入力へ固定する', () => {
  const {sourcePackage} = builtPackage();
  assert.equal(sourcePackage.sourceVideoId, 'source');
  assert.equal(sourcePackage.utteranceCount, 3);
  assert.equal(sourcePackage.anchorCount, 3);
  assert.deepEqual(sourcePackage.anchors, [
    {anchorId: 'comment-anchor-000001', semanticUtteranceId: 'semantic-utterance-000001'},
    {anchorId: 'comment-anchor-000002', semanticUtteranceId: 'semantic-utterance-000002'},
    {anchorId: 'comment-anchor-000003', semanticUtteranceId: 'semantic-utterance-000003'}
  ]);
  assert.deepEqual(sourcePackage.plannedExecution, plannedExecution);
  assert.equal(
    sourcePackage.explorationTask.anchorInstruction,
    'directionはanchorから見た相方の位置を表します。futureの場合はanchor発話をfirstPartに含め、相方を未来側のsecondPartに置いてください。pastの場合はanchor発話をsecondPartに含め、相方を過去側のfirstPartに置いてください。'
  );
  assert.match(
    sourcePackage.explorationTask.objective,
    /後半単独では得られない理解、回収感、意外性、面白さ/u
  );
  assert.match(
    sourcePackage.explorationTask.objective,
    /閉じた分類ではありません/u
  );
  assert.match(
    sourcePackage.explorationTask.returnInstruction,
    /前半を外しても後半の理解や面白さがほぼ変わらない接続は返さない/u
  );
  assert.match(
    sourcePackage.explorationTask.returnInstruction,
    /ゲーム紹介・一般説明そのものを除外せず/u
  );
  assert.match(sourcePackage.explorationTask.boundaryMeaning, /最終切り出し位置ではありません/u);
  assert.equal(sourcePackage.responseContract.sourcePackagePath, 'outputs/source-package.json');
});

test('両入力のpath・schema版・SHA-256を正式source packageへ束縛する', () => {
  const {input, sourcePackage} = builtPackage();
  assert.equal(
    sourcePackage.semanticUtteranceBinding.fileSha256,
    createHash('sha256').update(input.semanticUtteranceBytes).digest('hex')
  );
  assert.equal(
    sourcePackage.commentVelocityAnchorBinding.fileSha256,
    createHash('sha256').update(input.commentVelocityAnchorBytes).digest('hex')
  );
  validateDistantConnectionLunaSourcePackageAgainstInputsV001(sourcePackage, input);
});

test('入力SHA不一致とアンカー内の正式意味発話binding不一致を拒否する', () => {
  const {input, sourcePackage} = builtPackage();
  expectCode('SEMANTIC_UTTERANCE_SHA_MISMATCH', () => (
    validateDistantConnectionLunaSourcePackageAgainstInputsV001(sourcePackage, {
      ...input,
      semanticUtteranceBytes: semanticBytes('different-source')
    })
  ));
  expectCode('COMMENT_VELOCITY_ANCHOR_SHA_MISMATCH', () => (
    validateDistantConnectionLunaSourcePackageAgainstInputsV001(sourcePackage, {
      ...input,
      commentVelocityAnchorBytes: Buffer.from(input.commentVelocityAnchorBytes).subarray(0, -1)
    })
  ));

  const anchor = JSON.parse(Buffer.from(input.commentVelocityAnchorBytes).toString('utf8'));
  anchor.semanticUtteranceBinding.fileSha256 = '0'.repeat(64);
  expectCode('SEMANTIC_UTTERANCE_SHA_MISMATCH', () => (
    buildDistantConnectionLunaSourcePackageFromBytesV001({
      ...input,
      commentVelocityAnchorBytes: jsonBytes(anchor)
    })
  ));
});

test('元動画不一致とアンカーからの未知正式発話参照を拒否する', () => {
  const input = packageInput();
  const wrongVideoAnchor = JSON.parse(Buffer.from(input.commentVelocityAnchorBytes).toString('utf8'));
  wrongVideoAnchor.sourceVideoId = 'different-source';
  expectCode('SOURCE_VIDEO_MISMATCH', () => (
    buildDistantConnectionLunaSourcePackageFromBytesV001({
      ...input,
      commentVelocityAnchorBytes: jsonBytes(wrongVideoAnchor)
    })
  ));

  const unknownUtteranceAnchor = JSON.parse(Buffer.from(input.commentVelocityAnchorBytes).toString('utf8'));
  unknownUtteranceAnchor.anchors[0].utteranceId = 'semantic-utterance-999999';
  expectCode('ANCHOR_UNKNOWN_UTTERANCE', () => (
    buildDistantConnectionLunaSourcePackageFromBytesV001({
      ...input,
      commentVelocityAnchorBytes: jsonBytes(unknownUtteranceAnchor)
    })
  ));
});

test('正常なLuna候補はsource packageと元動画をexactに束縛して受理する', () => {
  const {sourcePackageBytes} = builtPackage();
  validateDistantConnectionLunaResponseV001(responseFor(sourcePackageBytes), {
    sourcePackagePath: 'outputs/source-package.json',
    sourcePackageBytes
  });
});

test('返答のsource package SHA不一致と元動画不一致を拒否する', () => {
  const {sourcePackageBytes} = builtPackage();
  const validationInput = {sourcePackagePath: 'outputs/source-package.json', sourcePackageBytes};
  const wrongSha = responseFor(sourcePackageBytes);
  wrongSha.sourcePackageBinding.fileSha256 = '0'.repeat(64);
  expectCode('SOURCE_PACKAGE_SHA_MISMATCH', () => (
    validateDistantConnectionLunaResponseV001(wrongSha, validationInput)
  ));
  expectCode('SOURCE_VIDEO_MISMATCH', () => (
    validateDistantConnectionLunaResponseV001(
      responseFor(sourcePackageBytes, {sourceVideoId: 'different-source'}),
      validationInput
    )
  ));
});

test('未知の正式発話IDと空の前半・後半を個別に拒否する', () => {
  const {sourcePackageBytes} = builtPackage();
  const validationInput = {sourcePackagePath: 'outputs/source-package.json', sourcePackageBytes};
  const unknown = responseFor(sourcePackageBytes);
  unknown.candidates[0].secondPartSemanticUtteranceIds = ['semantic-utterance-999999'];
  expectCode('UNKNOWN_UTTERANCE_ID', () => (
    validateDistantConnectionLunaResponseV001(unknown, validationInput)
  ));
  const emptyFirst = responseFor(sourcePackageBytes);
  emptyFirst.candidates[0].firstPartSemanticUtteranceIds = [];
  expectCode('EMPTY_FIRST_PART', () => (
    validateDistantConnectionLunaResponseV001(emptyFirst, validationInput)
  ));
  const emptySecond = responseFor(sourcePackageBytes);
  emptySecond.candidates[0].secondPartSemanticUtteranceIds = [];
  expectCode('EMPTY_SECOND_PART', () => (
    validateDistantConnectionLunaResponseV001(emptySecond, validationInput)
  ));
});

test('発話の重複・時系列逆転・前後同一位置・方向不一致を拒否する', () => {
  const {sourcePackageBytes} = builtPackage();
  const validationInput = {sourcePackagePath: 'outputs/source-package.json', sourcePackageBytes};
  const duplicate = responseFor(sourcePackageBytes);
  duplicate.candidates[0].secondPartSemanticUtteranceIds = [
    'semantic-utterance-000001',
    'semantic-utterance-000002'
  ];
  expectCode('UTTERANCE_DUPLICATE', () => (
    validateDistantConnectionLunaResponseV001(duplicate, validationInput)
  ));
  const reversed = responseFor(sourcePackageBytes);
  reversed.candidates[0].secondPartSemanticUtteranceIds = [
    'semantic-utterance-000003',
    'semantic-utterance-000002'
  ];
  expectCode('UTTERANCE_ORDER_REVERSED', () => (
    validateDistantConnectionLunaResponseV001(reversed, validationInput)
  ));
  const samePosition = responseFor(sourcePackageBytes);
  samePosition.candidates[0].firstPartSemanticUtteranceIds = ['semantic-utterance-000002'];
  samePosition.candidates[0].secondPartSemanticUtteranceIds = ['semantic-utterance-000001'];
  expectCode('UTTERANCE_ORDER_REVERSED', () => (
    validateDistantConnectionLunaResponseV001(samePosition, validationInput)
  ));
  const wrongDirection = responseFor(sourcePackageBytes);
  wrongDirection.candidates[0].anchorId = 'comment-anchor-000003';
  expectCode('ANCHOR_DIRECTION_MISMATCH', () => (
    validateDistantConnectionLunaResponseV001(wrongDirection, validationInput)
  ));
});

test('provider schemaではuniqueItemsを使わず、前半・後半の重複はローカルで拒否する', () => {
  const {sourcePackage, sourcePackageBytes} = builtPackage();
  const validationInput = {sourcePackagePath: 'outputs/source-package.json', sourcePackageBytes};
  assert.equal(
    JSON.stringify(sourcePackage.responseContract.jsonSchema).includes('uniqueItems'),
    false
  );
  const candidateProperties = (sourcePackage.responseContract.jsonSchema as any)
    .properties.candidates.items.properties;
  assert.equal(candidateProperties.anchorId.enum, undefined);
  assert.equal(candidateProperties.anchorId.pattern, '^[A-Za-z0-9][A-Za-z0-9._-]*$');
  assert.equal(candidateProperties.firstPartSemanticUtteranceIds.items.enum, undefined);
  assert.equal(
    candidateProperties.firstPartSemanticUtteranceIds.items.pattern,
    '^semantic-utterance-[0-9]{6}$'
  );

  const duplicateFirst = responseFor(sourcePackageBytes);
  duplicateFirst.candidates[0].firstPartSemanticUtteranceIds = [
    'semantic-utterance-000001',
    'semantic-utterance-000001'
  ];
  expectCode('UTTERANCE_DUPLICATE', () => (
    validateDistantConnectionLunaResponseV001(duplicateFirst, validationInput)
  ));

  const duplicateSecond = responseFor(sourcePackageBytes);
  duplicateSecond.candidates[0].secondPartSemanticUtteranceIds = [
    'semantic-utterance-000002',
    'semantic-utterance-000002'
  ];
  expectCode('UTTERANCE_DUPLICATE', () => (
    validateDistantConnectionLunaResponseV001(duplicateSecond, validationInput)
  ));
});

test('返答の余分なfieldとschema外構造を拒否する', () => {
  const {sourcePackageBytes} = builtPackage();
  const validationInput = {sourcePackagePath: 'outputs/source-package.json', sourcePackageBytes};
  expectCode('RESPONSE_INVALID', () => (
    validateDistantConnectionLunaResponseV001(
      {...responseFor(sourcePackageBytes), unexpected: true},
      validationInput
    )
  ));
  const candidateExtra = responseFor(sourcePackageBytes) as unknown as Record<string, unknown>;
  (candidateExtra.candidates as Array<Record<string, unknown>>)[0].confidence = 1;
  expectCode('RESPONSE_INVALID', () => (
    validateDistantConnectionLunaResponseV001(candidateExtra, validationInput)
  ));
});

test('同一入力はbyte単位で同一の正式source packageになる', () => {
  const input = packageInput();
  const first = buildDistantConnectionLunaSourcePackageFromBytesV001(input);
  const second = buildDistantConnectionLunaSourcePackageFromBytesV001(input);
  const firstBytes = serializeDistantConnectionLunaSourcePackageV001(first);
  assert.deepEqual(firstBytes, serializeDistantConnectionLunaSourcePackageV001(second));
  assertDistantConnectionLunaSourcePackageV001(JSON.parse(firstBytes.toString('utf8')));
});

test('保存済みの正式意味発話・コメント流量アンカーを無変更で読み込める', async () => {
  const [semanticBefore, anchorBefore] = await Promise.all([
    readFile(path.join(workspaceRoot, semanticUtterancePath)),
    readFile(path.join(workspaceRoot, commentVelocityAnchorPath))
  ]);
  const sourcePackage = await buildDistantConnectionLunaSourcePackageFromFilesV001({
    workspaceRoot,
    semanticUtterancePath,
    commentVelocityAnchorPath,
    sourcePackagePath,
    plannedExecution
  });
  const [semanticAfter, anchorAfter] = await Promise.all([
    readFile(path.join(workspaceRoot, semanticUtterancePath)),
    readFile(path.join(workspaceRoot, commentVelocityAnchorPath))
  ]);
  assert.deepEqual(semanticAfter, semanticBefore);
  assert.deepEqual(anchorAfter, anchorBefore);
  assert.equal(sourcePackage.utteranceCount, 2);
  assert.equal(sourcePackage.anchorCount, 2);
  assert.equal(sourcePackage.sourceVideoId, 'source');
});

test('保存済み旧source packageは履歴としてbyte不変に保ち、現行入力は薄化後byteへ再構築する', async () => {
  const [semanticUtteranceBytes, commentVelocityAnchorBytes, sourcePackageBytes] = await Promise.all([
    readFile(path.join(workspaceRoot, semanticUtterancePath)),
    readFile(path.join(workspaceRoot, commentVelocityAnchorPath)),
    readFile(path.join(workspaceRoot, sourcePackagePath))
  ]);
  const rebuilt = buildDistantConnectionLunaSourcePackageFromBytesV001({
    semanticUtterancePath,
    semanticUtteranceBytes,
    commentVelocityAnchorPath,
    commentVelocityAnchorBytes,
    sourcePackagePath,
    plannedExecution
  });
  const rebuiltBytes = serializeDistantConnectionLunaSourcePackageV001(rebuilt);
  assert.notDeepEqual(rebuiltBytes, sourcePackageBytes);
  assert.equal(sourcePackageBytes.toString('utf8').includes('"enum"'), true);
  assert.equal(rebuiltBytes.toString('utf8').includes('"enum"'), true);
  const candidateProperties = (rebuilt.responseContract.jsonSchema as any)
    .properties.candidates.items.properties;
  assert.equal(candidateProperties.anchorId.enum, undefined);
  assert.deepEqual(
    await readFile(path.join(workspaceRoot, sourcePackagePath)),
    sourcePackageBytes
  );
});
