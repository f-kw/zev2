import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import test from 'node:test';

import {
  buildCommentVelocityAnchorArtifactFromBytesV001,
  serializeCommentVelocityAnchorArtifactV001
} from '../src/comment-velocity-anchor-artifact-v001.js';
import {
  DISTANT_CONNECTION_LUNA_B5_MEASUREMENT_SCHEMA_V002,
  DISTANT_CONNECTION_LUNA_REQUEST_SCHEMA_V002,
  DISTANT_CONNECTION_LUNA_REQUEST_SETTINGS_V002,
  DistantConnectionLunaB5LocalErrorV002,
  assertDistantConnectionLunaB5LocalManifestV002,
  assertDistantConnectionLunaB6RequestBindingV002,
  assertDistantConnectionLunaExactRequestV002,
  buildDistantConnectionLunaB5LocalArtifactsFromBytesV002,
  buildDistantConnectionLunaB5LocalArtifactsFromFileV002,
  decodeDistantConnectionLunaB5LocalManifestV002,
  serializeDistantConnectionLunaExactRequestV002,
  validateDistantConnectionLunaB5LocalArtifactsV002,
  type BuildDistantConnectionLunaB5LocalInputV002,
  type DistantConnectionLunaRequestSettingsV002
} from '../src/distant-connection-luna-b5-local-v002.js';
import {
  DISTANT_CONNECTION_LUNA_SOURCE_PACKAGE_SCHEMA_V001
} from '../src/distant-connection-luna-source-package-v001.js';
import {
  DISTANT_CONNECTION_LUNA_SOURCE_PACKAGE_SCHEMA_V002,
  buildDistantConnectionLunaSourcePackageFromBytesV002,
  decodeDistantConnectionLunaSourcePackageV002,
  serializeDistantConnectionLunaSourcePackageV002
} from '../src/distant-connection-luna-source-package-v002.js';
import {
  buildSemanticUtteranceArtifactFromTranscriptBytesV001,
  serializeSemanticUtteranceArtifactV001
} from '../src/semantic-utterance-artifact-v001.js';

const semanticPath = 'fixtures/semantic-utterances.json';
const anchorPath = 'fixtures/comment-velocity-anchors.json';
const sourcePackagePath = 'outputs/source-package-v002.json';
const rejectedPath = 'outputs/rejected-candidate.json';
const reviewPath = 'outputs/rejected-candidate-human-review.json';
const auditPath = 'outputs/rejected-candidate-duplicate-audit.json';
const priorPath = 'outputs/prior-candidates.json';
const requestPath = 'outputs/exact-request-v002.json';
const HUMAN_REVIEW_RESPONSIBILITY =
  '本成果物はcandidate review artifactを見た人間の候補評価を保存する。正式selectionや正式区間を生成・承認せず、不採用候補をnot-selectedのまま保持する。';

function jsonBytes(value: unknown): Buffer {
  return Buffer.from(`${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function sha256(bytes: Uint8Array): string {
  return createHash('sha256').update(bytes).digest('hex');
}

function candidateResponse(candidates: Array<{candidateId: string; secondOrdinal: number}>): Buffer {
  return jsonBytes({
    schemaVersion: 'distant-connection-luna-response-v001',
    sourceVideoId: 'source',
    sourcePackageBinding: {
      path: 'outputs/historical-source-package.json',
      schemaVersion: DISTANT_CONNECTION_LUNA_SOURCE_PACKAGE_SCHEMA_V001,
      fileSha256: 'a'.repeat(64)
    },
    candidates: candidates.map(({candidateId, secondOrdinal}) => ({
      candidateId,
      anchorId: 'comment-anchor-000001',
      firstPartSemanticUtteranceIds: ['semantic-utterance-000001'],
      secondPartSemanticUtteranceIds: [
        `semantic-utterance-${String(secondOrdinal).padStart(6, '0')}`
      ],
      addedUnderstanding: `${candidateId}の接続理由です。`,
      direction: 'future'
    }))
  });
}

function buildSourcePackageBytes(): Buffer {
  const semanticBytes = serializeSemanticUtteranceArtifactV001(
    buildSemanticUtteranceArtifactFromTranscriptBytesV001({
      sourceTranscriptPath: 'fixtures/transcript.json',
      sourceTranscriptBytes: jsonBytes({
        kind: 'transcript_json',
        mode: 'zev-local-stt',
        sourceUri: 'file:///fixture/source.mp4',
        notes: [],
        generatedAt: '2026-08-30T00:00:00.000Z',
        language: 'ja-JP',
        durationSec: 60,
        segmentCount: 6,
        segments: [
          {id: 1, startMs: 1_000, endMs: 2_000, text: '具体的な前振りです。'},
          {id: 2, startMs: 5_000, endMs: 6_000, text: '以前の回収Aです。'},
          {id: 3, startMs: 10_000, endMs: 11_000, text: '以前の回収Bです。'},
          {id: 4, startMs: 15_000, endMs: 16_000, text: '以前の回収Cです。'},
          {id: 5, startMs: 20_000, endMs: 21_000, text: '以前の回収Dです。'},
          {id: 6, startMs: 50_000, endMs: 51_000, text: '不採用になった後半です。'}
        ],
        speechUnitGroups: [[1], [2], [3], [4], [5], [6]]
      })
    })
  );
  const anchorBytes = serializeCommentVelocityAnchorArtifactV001(
    buildCommentVelocityAnchorArtifactFromBytesV001({
      commentVelocityPath: 'fixtures/comment-velocity.json',
      commentVelocityBytes: jsonBytes({
        schemaVersion: 1,
        analysisId: 'source-chat-velocity-v001',
        generatedAt: '2026-08-30T00:00:00.000Z',
        analysisType: 'source-only-chat-replay-relative-velocity-ranking',
        sourceVideoId: 'source',
        sourceDurationMs: 60_000,
        minuteSeries: [{
          minuteIndex: 0,
          sourceStartMs: 0,
          sourceEndMs: 60_000,
          durationMs: 60_000,
          commentCount: 6,
          isFullMinute: true,
          relativeToStreamBaseline: 1
        }]
      }),
      semanticUtterancePath: semanticPath,
      semanticUtteranceBytes: semanticBytes,
      selectedMinuteIndexes: [0]
    })
  );
  const rejectedBytes = candidateResponse([{candidateId: 'candidate-rejected', secondOrdinal: 6}]);
  const rejectedSha = sha256(rejectedBytes);
  const reviewBytes = jsonBytes({
    schemaVersion: 'distant-connection-candidate-human-review-result-v001',
    reviewId: 'candidate-rejected-human-review-001',
    sourceVideoId: 'source',
    candidateId: 'candidate-rejected',
    reviewedAt: '2026-08-30T03:00:00.000Z',
    reviewer: {kind: 'human', id: 'kawafmm'},
    sourceBindings: {
      candidateResponse: {
        path: rejectedPath,
        schemaVersion: 'distant-connection-luna-response-v001',
        fileSha256: rejectedSha
      },
      candidateReviewResult: {
        path: 'outputs/candidate-review-result.json',
        schemaVersion: 'distant-connection-candidate-review-result-v001',
        fileSha256: 'b'.repeat(64)
      }
    },
    evaluatedIntervals: {
      firstPartSourceInterval: {sourceStartMs: 1_000, sourceEndMs: 2_000},
      secondPartSourceInterval: {sourceStartMs: 50_000, sourceEndMs: 51_000}
    },
    verdict: 'rejected',
    primaryCause: 'candidate-selection',
    reason: '短尺だけでは接続が分からず、面白さも増えません。',
    selectionStatus: 'not-selected',
    responsibilityPrinciple: HUMAN_REVIEW_RESPONSIBILITY
  });
  const priorBytes = candidateResponse([
    {candidateId: 'prior-a', secondOrdinal: 2},
    {candidateId: 'prior-b', secondOrdinal: 3},
    {candidateId: 'prior-c', secondOrdinal: 4},
    {candidateId: 'prior-d', secondOrdinal: 5}
  ]);
  const priorSha = sha256(priorBytes);
  const priorIds = ['prior-a', 'prior-b', 'prior-c', 'prior-d'];
  const auditBytes = jsonBytes({
    recordVersion: 'distant-connection-candidate-duplicate-audit-v001',
    candidateResponseBinding: {path: rejectedPath, fileSha256: rejectedSha},
    candidateId: 'candidate-rejected',
    comparedPriorCandidateCount: 4,
    exactPairDuplicate: false,
    exactPairMatches: [],
    sameFirstPartMatches: priorIds.map((candidateId) => ({
      path: priorPath, fileSha256: priorSha, candidateId
    })),
    sameSecondPartMatches: [],
    conclusion: 'not-exact-duplicate-but-first-part-reuses-prior-introduction'
  });
  return serializeDistantConnectionLunaSourcePackageV002(
    buildDistantConnectionLunaSourcePackageFromBytesV002({
      semanticUtterancePath: semanticPath,
      semanticUtteranceBytes: semanticBytes,
      commentVelocityAnchorPath: anchorPath,
      commentVelocityAnchorBytes: anchorBytes,
      sourcePackagePath,
      plannedExecution: {
        providerId: 'openai-api',
        modelId: 'gpt-5.6-luna',
        operationId: 'responses',
        jobExperimentValues: []
      },
      rejectedCandidateResponsePath: rejectedPath,
      rejectedCandidateResponseBytes: rejectedBytes,
      expectedRejectedCandidateResponseSha256: rejectedSha,
      humanCandidateReviewResultPath: reviewPath,
      humanCandidateReviewResultBytes: reviewBytes,
      expectedHumanCandidateReviewResultSha256: sha256(reviewBytes),
      duplicateAuditPath: auditPath,
      duplicateAuditBytes: auditBytes,
      expectedDuplicateAuditSha256: sha256(auditBytes),
      priorCandidateResponses: priorIds.map(() => ({
        path: priorPath,
        bytes: priorBytes,
        expectedFileSha256: priorSha
      }))
    })
  );
}

function buildInput(
  sourcePackageBytes: Uint8Array,
  overrides: Partial<BuildDistantConnectionLunaB5LocalInputV002> = {}
): BuildDistantConnectionLunaB5LocalInputV002 {
  return {
    sourcePackageBinding: {
      path: sourcePackagePath,
      schemaVersion: DISTANT_CONNECTION_LUNA_SOURCE_PACKAGE_SCHEMA_V002,
      fileSha256: sha256(sourcePackageBytes)
    },
    sourcePackageBytes,
    requestPath,
    requestSettings: DISTANT_CONNECTION_LUNA_REQUEST_SETTINGS_V002,
    ...overrides
  };
}

function expectCode(code: string, action: () => unknown): void {
  assert.throws(action, (error: unknown) => (
    error instanceof DistantConnectionLunaB5LocalErrorV002 && error.code === code
  ));
}

test('v002 source全byteを承認済み設定のexact requestへ固定する', () => {
  const sourceBytes = buildSourcePackageBytes();
  const sourcePackage = decodeDistantConnectionLunaSourcePackageV002(sourceBytes);
  const artifacts = buildDistantConnectionLunaB5LocalArtifactsFromBytesV002(buildInput(sourceBytes));
  assert.deepEqual(DISTANT_CONNECTION_LUNA_REQUEST_SETTINGS_V002, {
    providerId: 'openai-api',
    modelId: 'gpt-5.6-luna',
    operationId: 'responses',
    reasoningEffort: 'medium',
    responseFormatName: 'distant_connection_candidates_v001',
    store: false
  });
  assert.equal(artifacts.request.model, 'gpt-5.6-luna');
  assert.equal(artifacts.request.input, sourceBytes.toString('utf8'));
  const visibleSourcePackage = JSON.parse(artifacts.request.input);
  assert.deepEqual(visibleSourcePackage.learningContext, sourcePackage.learningContext);
  assert.equal(visibleSourcePackage.learningContext.humanVerdict, 'rejected');
  assert.equal(
    visibleSourcePackage.learningContext.rejectionPrimaryCause,
    'candidate-selection'
  );
  assert.equal(
    visibleSourcePackage.learningContext.rejectionReason,
    '短尺だけでは接続が分からず、面白さも増えません。'
  );
  assert.equal(visibleSourcePackage.learningContext.selectionStatus, 'not-selected');
  assert.deepEqual(
    visibleSourcePackage.learningContext.rejectedCandidate.secondPartSemanticUtteranceIds,
    ['semantic-utterance-000006']
  );
  assert.equal(
    visibleSourcePackage.learningContext.rejectedCandidate.addedUnderstanding,
    'candidate-rejectedの接続理由です。'
  );
  assert.match(artifacts.request.instructions, /explorationTaskとlearningContext/u);
  assert.match(artifacts.request.instructions, new RegExp(sha256(sourceBytes), 'u'));
  assert.deepEqual(artifacts.request.reasoning, {effort: 'medium'});
  assert.equal(artifacts.request.text.format.name, 'distant_connection_candidates_v001');
  assert.equal(artifacts.request.text.format.strict, true);
  assert.deepEqual(artifacts.request.text.format.schema, sourcePackage.responseContract.jsonSchema);
  assert.equal(artifacts.request.store, false);
  assert.doesNotThrow(() => assertDistantConnectionLunaExactRequestV002(
    artifacts.request, sourcePackage
  ));
});

test('manifestはsource・request SHAとB6継続条件を束縛する', () => {
  const sourceBytes = buildSourcePackageBytes();
  const input = buildInput(sourceBytes);
  const artifacts = buildDistantConnectionLunaB5LocalArtifactsFromBytesV002(input);
  assert.deepEqual(artifacts.manifest.sourcePackageBinding, input.sourcePackageBinding);
  assert.deepEqual(artifacts.manifest.requestBinding, {
    path: requestPath,
    schemaVersion: DISTANT_CONNECTION_LUNA_REQUEST_SCHEMA_V002,
    fileSha256: sha256(artifacts.requestBytes)
  });
  assert.equal(
    artifacts.manifest.measurementContract.schemaVersion,
    DISTANT_CONNECTION_LUNA_B5_MEASUREMENT_SCHEMA_V002
  );
  assert.deepEqual(
    artifacts.manifest.b6ContinuationContract.requiredRequestBinding,
    artifacts.manifest.requestBinding
  );
  assert.deepEqual(
    decodeDistantConnectionLunaB5LocalManifestV002(artifacts.manifestBytes),
    artifacts.manifest
  );
  assert.doesNotThrow(() => validateDistantConnectionLunaB5LocalArtifactsV002(artifacts, input));
});

test('同一source入力はrequest・manifestをbyte単位で決定的に再生成する', () => {
  const sourceBytes = buildSourcePackageBytes();
  const input = buildInput(sourceBytes);
  const first = buildDistantConnectionLunaB5LocalArtifactsFromBytesV002(input);
  const second = buildDistantConnectionLunaB5LocalArtifactsFromBytesV002(input);
  assert.deepEqual(first.requestBytes, second.requestBytes);
  assert.deepEqual(first.manifestBytes, second.manifestBytes);
  assert.equal(first.manifest.requestBinding.fileSha256, sha256(first.requestBytes));
});

test('sourceのSHA・v002版・正式byte表現の不一致を送信前に拒否する', () => {
  const sourceBytes = buildSourcePackageBytes();
  const input = buildInput(sourceBytes);
  expectCode('SOURCE_PACKAGE_SHA_MISMATCH', () => (
    buildDistantConnectionLunaB5LocalArtifactsFromBytesV002({
      ...input,
      sourcePackageBinding: {...input.sourcePackageBinding, fileSha256: '0'.repeat(64)}
    })
  ));
  expectCode('SOURCE_PACKAGE_INVALID', () => (
    buildDistantConnectionLunaB5LocalArtifactsFromBytesV002({
      ...input,
      sourcePackageBinding: {
        ...input.sourcePackageBinding,
        schemaVersion: DISTANT_CONNECTION_LUNA_SOURCE_PACKAGE_SCHEMA_V001
      }
    })
  ));
  const nonCanonical = Buffer.from(JSON.stringify(JSON.parse(sourceBytes.toString('utf8'))), 'utf8');
  expectCode('SOURCE_PACKAGE_INVALID', () => (
    buildDistantConnectionLunaB5LocalArtifactsFromBytesV002(buildInput(nonCanonical))
  ));
});

test('file入力はsource bindingとrequest pathをread前に検査する', async () => {
  const sourceBytes = buildSourcePackageBytes();
  const input = buildInput(sourceBytes);
  await assert.rejects(
    () => buildDistantConnectionLunaB5LocalArtifactsFromFileV002({
      ...input,
      workspaceRoot: process.cwd(),
      sourcePackageBinding: {...input.sourcePackageBinding, path: '../zev2'}
    }),
    (error: unknown) => (
      error instanceof DistantConnectionLunaB5LocalErrorV002
      && error.code === 'SOURCE_PACKAGE_INVALID'
    )
  );
  await assert.rejects(
    () => buildDistantConnectionLunaB5LocalArtifactsFromFileV002({
      ...input,
      workspaceRoot: process.cwd(),
      requestPath: '../zev2'
    }),
    (error: unknown) => (
      error instanceof DistantConnectionLunaB5LocalErrorV002
      && error.code === 'REQUEST_INVALID'
    )
  );
});

test('承認済み設定・structured schema・余分なfieldの差し替えを拒否する', () => {
  const sourceBytes = buildSourcePackageBytes();
  const sourcePackage = decodeDistantConnectionLunaSourcePackageV002(sourceBytes);
  const artifacts = buildDistantConnectionLunaB5LocalArtifactsFromBytesV002(buildInput(sourceBytes));
  const changedSettings = {
    ...DISTANT_CONNECTION_LUNA_REQUEST_SETTINGS_V002,
    reasoningEffort: 'high'
  } as unknown as DistantConnectionLunaRequestSettingsV002;
  expectCode('REQUEST_SETTINGS_MISMATCH', () => (
    buildDistantConnectionLunaB5LocalArtifactsFromBytesV002(buildInput(sourceBytes, {
      requestSettings: changedSettings
    }))
  ));
  const schemaChanged = structuredClone(artifacts.request);
  schemaChanged.text.format.schema = {type: 'object'};
  expectCode('RESPONSE_SCHEMA_BINDING_MISMATCH', () => (
    serializeDistantConnectionLunaExactRequestV002(schemaChanged, sourcePackage)
  ));
  expectCode('REQUEST_INVALID', () => (
    assertDistantConnectionLunaExactRequestV002(
      {...artifacts.request, unexpected: true}, sourcePackage
    )
  ));
  expectCode('MANIFEST_INVALID', () => (
    assertDistantConnectionLunaB5LocalManifestV002({...artifacts.manifest, unexpected: true})
  ));
});

test('request・manifestのbyte差し替えとB6の別bindingを拒否する', () => {
  const sourceBytes = buildSourcePackageBytes();
  const input = buildInput(sourceBytes);
  const artifacts = buildDistantConnectionLunaB5LocalArtifactsFromBytesV002(input);
  expectCode('REQUEST_BINDING_MISMATCH', () => (
    validateDistantConnectionLunaB5LocalArtifactsV002({
      ...artifacts,
      requestBytes: Buffer.concat([artifacts.requestBytes, Buffer.from('changed')])
    }, input)
  ));
  expectCode('REQUEST_BINDING_MISMATCH', () => (
    validateDistantConnectionLunaB5LocalArtifactsV002({
      ...artifacts,
      manifestBytes: Buffer.concat([artifacts.manifestBytes, Buffer.from('changed')])
    }, input)
  ));
  assert.doesNotThrow(() => assertDistantConnectionLunaB6RequestBindingV002(
    artifacts.manifest.requestBinding,
    artifacts.manifestBytes,
    artifacts.requestBytes
  ));
  expectCode('B6_REQUEST_BINDING_MISMATCH', () => (
    assertDistantConnectionLunaB6RequestBindingV002(
      {...artifacts.manifest.requestBinding, fileSha256: '0'.repeat(64)},
      artifacts.manifestBytes,
      artifacts.requestBytes
    )
  ));
  expectCode('B6_REQUEST_BINDING_MISMATCH', () => (
    assertDistantConnectionLunaB6RequestBindingV002(
      artifacts.manifest.requestBinding,
      artifacts.manifestBytes,
      Buffer.concat([artifacts.requestBytes, Buffer.from('changed')])
    )
  ));
});
