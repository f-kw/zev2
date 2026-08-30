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
  DISTANT_CONNECTION_LUNA_SOURCE_PACKAGE_SCHEMA_V001,
  buildDistantConnectionLunaSourcePackageFromBytesV001,
  decodeDistantConnectionLunaSourcePackageV001,
  serializeDistantConnectionLunaSourcePackageV001
} from '../src/distant-connection-luna-source-package-v001.js';
import {
  DISTANT_CONNECTION_LUNA_SOURCE_PACKAGE_SCHEMA_V002,
  DistantConnectionLunaSourcePackageErrorV002,
  assertDistantConnectionLunaSourcePackageV002,
  buildDistantConnectionLunaSourcePackageFromBytesV002,
  buildDistantConnectionLunaSourcePackageFromFilesV002,
  decodeDistantConnectionLunaSourcePackageV002,
  decodeDistantConnectionLunaResponseV002,
  serializeDistantConnectionLunaSourcePackageV002,
  validateDistantConnectionLunaResponseV002,
  validateDistantConnectionLunaSourcePackageAgainstInputsV002,
  type BuildDistantConnectionLunaSourcePackageFromBytesInputV002,
  type DistantConnectionLunaResponseV002
} from '../src/distant-connection-luna-source-package-v002.js';
import {
  buildSemanticUtteranceArtifactFromTranscriptBytesV001,
  serializeSemanticUtteranceArtifactV001
} from '../src/semantic-utterance-artifact-v001.js';

const workspaceRoot = path.resolve(import.meta.dirname, '..', '..');
const historicalSourcePackagePath =
  'evals/clip_composition/outputs/'
  + 'work-distant-connection-luna-source-package-concrete-payoff-ymUsGrT6EaA-v001/'
  + 'source-package-v001.json';
const historicalSourcePackageSha256 =
  '23d555928762e5a98ccf13c291e0a80ae1935a5cd49010f36512498f5033f6df';
const semanticUtterancePath = 'fixtures/semantic-utterances.json';
const commentVelocityAnchorPath = 'fixtures/comment-velocity-anchors.json';
const sourcePackagePath = 'outputs/source-package-v002.json';
const rejectedCandidatePath = 'outputs/rejected-candidate.json';
const humanReviewPath = 'outputs/rejected-candidate-human-review.json';
const duplicateAuditPath = 'outputs/rejected-candidate-duplicate-audit.json';
const priorPaths = [
  'outputs/prior-candidates-a.json',
  'outputs/prior-candidates-b.json',
  'outputs/prior-candidates-cd.json',
  'outputs/prior-candidates-cd.json'
] as const;

const plannedExecution = {
  providerId: 'openai-api',
  modelId: 'gpt-5.6-luna',
  operationId: 'responses',
  jobExperimentValues: []
};

const HUMAN_REVIEW_RESPONSIBILITY =
  '本成果物はcandidate review artifactを見た人間の候補評価を保存する。正式selectionや正式区間を生成・承認せず、不採用候補をnot-selectedのまま保持する。';

function jsonBytes(value: unknown): Buffer {
  return Buffer.from(`${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function sha256(bytes: Uint8Array): string {
  return createHash('sha256').update(bytes).digest('hex');
}

function semanticBytes(): Buffer {
  return serializeSemanticUtteranceArtifactV001(
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
}

function anchorBytes(semanticUtteranceBytes: Buffer): Buffer {
  return serializeCommentVelocityAnchorArtifactV001(
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
      semanticUtterancePath,
      semanticUtteranceBytes,
      selectedMinuteIndexes: [0]
    })
  );
}

function candidateResponse(candidates: Array<{
  candidateId: string;
  secondOrdinal: number;
}>): Buffer {
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

function fixtureInput(): BuildDistantConnectionLunaSourcePackageFromBytesInputV002 {
  const semanticUtteranceBytes = semanticBytes();
  const commentVelocityAnchorBytes = anchorBytes(semanticUtteranceBytes);
  const rejectedCandidateResponseBytes = candidateResponse([{
    candidateId: 'candidate-rejected', secondOrdinal: 6
  }]);
  const rejectedCandidateSha = sha256(rejectedCandidateResponseBytes);
  const humanCandidateReviewResultBytes = jsonBytes({
    schemaVersion: 'distant-connection-candidate-human-review-result-v001',
    reviewId: 'candidate-rejected-human-review-001',
    sourceVideoId: 'source',
    candidateId: 'candidate-rejected',
    reviewedAt: '2026-08-30T03:00:00.000Z',
    reviewer: {kind: 'human', id: 'kawafmm'},
    sourceBindings: {
      candidateResponse: {
        path: rejectedCandidatePath,
        schemaVersion: 'distant-connection-luna-response-v001',
        fileSha256: rejectedCandidateSha
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
    reason: '前後関係が短尺だけでは分からず、面白さも増えません。',
    selectionStatus: 'not-selected',
    responsibilityPrinciple: HUMAN_REVIEW_RESPONSIBILITY
  });
  const priorBytes = [
    candidateResponse([{candidateId: 'prior-a', secondOrdinal: 2}]),
    candidateResponse([{candidateId: 'prior-b', secondOrdinal: 3}]),
    candidateResponse([
      {candidateId: 'prior-c', secondOrdinal: 4},
      {candidateId: 'prior-d', secondOrdinal: 5}
    ])
  ];
  const priorMatches = [
    {path: priorPaths[0], fileSha256: sha256(priorBytes[0]!), candidateId: 'prior-a'},
    {path: priorPaths[1], fileSha256: sha256(priorBytes[1]!), candidateId: 'prior-b'},
    {path: priorPaths[2], fileSha256: sha256(priorBytes[2]!), candidateId: 'prior-c'},
    {path: priorPaths[3], fileSha256: sha256(priorBytes[2]!), candidateId: 'prior-d'}
  ];
  const duplicateAuditBytes = jsonBytes({
    recordVersion: 'distant-connection-candidate-duplicate-audit-v001',
    candidateResponseBinding: {
      path: rejectedCandidatePath,
      fileSha256: rejectedCandidateSha
    },
    candidateId: 'candidate-rejected',
    comparedPriorCandidateCount: 11,
    exactPairDuplicate: false,
    exactPairMatches: [],
    sameFirstPartMatches: priorMatches,
    sameSecondPartMatches: [],
    conclusion: 'not-exact-duplicate-but-first-part-reuses-prior-introduction'
  });
  return {
    semanticUtterancePath,
    semanticUtteranceBytes,
    commentVelocityAnchorPath,
    commentVelocityAnchorBytes,
    sourcePackagePath,
    plannedExecution,
    rejectedCandidateResponsePath: rejectedCandidatePath,
    rejectedCandidateResponseBytes,
    expectedRejectedCandidateResponseSha256: rejectedCandidateSha,
    humanCandidateReviewResultPath: humanReviewPath,
    humanCandidateReviewResultBytes,
    expectedHumanCandidateReviewResultSha256: sha256(humanCandidateReviewResultBytes),
    duplicateAuditPath,
    duplicateAuditBytes,
    expectedDuplicateAuditSha256: sha256(duplicateAuditBytes),
    priorCandidateResponses: [
      {path: priorPaths[0], bytes: priorBytes[0]!, expectedFileSha256: sha256(priorBytes[0]!)},
      {path: priorPaths[1], bytes: priorBytes[1]!, expectedFileSha256: sha256(priorBytes[1]!)},
      {path: priorPaths[2], bytes: priorBytes[2]!, expectedFileSha256: sha256(priorBytes[2]!)},
      {path: priorPaths[3], bytes: priorBytes[2]!, expectedFileSha256: sha256(priorBytes[2]!)}
    ]
  };
}

function built() {
  const input = fixtureInput();
  const sourcePackage = buildDistantConnectionLunaSourcePackageFromBytesV002(input);
  const bytes = serializeDistantConnectionLunaSourcePackageV002(sourcePackage);
  return {input, sourcePackage, bytes};
}

function expectCode(code: string, action: () => unknown): void {
  assert.throws(action, (error: unknown) => (
    error instanceof DistantConnectionLunaSourcePackageErrorV002 && error.code === code
  ));
}

function validResponse(bytes: Uint8Array): DistantConnectionLunaResponseV002 {
  return {
    schemaVersion: 'distant-connection-luna-response-v001',
    sourceVideoId: 'source',
    sourcePackageBinding: {
      path: sourcePackagePath,
      schemaVersion: DISTANT_CONNECTION_LUNA_SOURCE_PACKAGE_SCHEMA_V002,
      fileSha256: sha256(bytes)
    },
    candidates: [{
      candidateId: 'candidate-next',
      anchorId: 'comment-anchor-000001',
      firstPartSemanticUtteranceIds: ['semantic-utterance-000001'],
      secondPartSemanticUtteranceIds: ['semantic-utterance-000006'],
      addedUnderstanding: '前半によって後半の意味が具体的に増えます。',
      direction: 'future'
    }]
  };
}

test('v002は既存全文・アンカー・provider・返答基本構造を保ち、人間学習条件を追加する', () => {
  const {input, sourcePackage} = built();
  const base = buildDistantConnectionLunaSourcePackageFromBytesV001({
    semanticUtterancePath: input.semanticUtterancePath,
    semanticUtteranceBytes: input.semanticUtteranceBytes,
    commentVelocityAnchorPath: input.commentVelocityAnchorPath,
    commentVelocityAnchorBytes: input.commentVelocityAnchorBytes,
    sourcePackagePath: input.sourcePackagePath,
    plannedExecution: input.plannedExecution
  });
  assert.equal(sourcePackage.schemaVersion, DISTANT_CONNECTION_LUNA_SOURCE_PACKAGE_SCHEMA_V002);
  assert.equal(sourcePackage.utteranceCount, base.utteranceCount);
  assert.equal(sourcePackage.anchorCount, base.anchorCount);
  assert.deepEqual(sourcePackage.utterances, base.utterances);
  assert.deepEqual(sourcePackage.anchors, base.anchors);
  assert.deepEqual(sourcePackage.plannedExecution, plannedExecution);
  assert.deepEqual(
    (sourcePackage.responseContract.jsonSchema as any).properties.candidates,
    (base.responseContract.jsonSchema as any).properties.candidates
  );
  assert.equal(
    (sourcePackage.responseContract.jsonSchema as any)
      .properties.sourcePackageBinding.properties.schemaVersion.const,
    DISTANT_CONNECTION_LUNA_SOURCE_PACKAGE_SCHEMA_V002
  );
  const instruction = sourcePackage.explorationTask.returnInstruction;
  assert.match(instruction, /単なるOPからEDへの対応だけでは採用しません/u);
  assert.match(instruction, /一般説明と終了時の総括を並べた時系列上の対称性だけ/u);
  assert.match(instruction, /具体的な内容が、後半の具体的な出来事・反応・結果/u);
  assert.match(instruction, /短尺動画そのものから普通の視聴者が理解/u);
  assert.match(instruction, /少なくとも一つに明確な増分/u);
  assert.match(instruction, /外部説明を加えなければ接続理由が分からない/u);
  assert.match(instruction, /rejectionReason.*失敗候補の後半とaddedUnderstanding/u);
  assert.match(instruction, /既出前半.*機械的に禁止しません/u);
  assert.match(instruction, /未使用前半の場合より強い具体的な回収/u);
});

test('learningContextは人間不採用・重複照合・同一前半4件を正式bindingで保持する', () => {
  const {input, sourcePackage} = built();
  assert.deepEqual(sourcePackage.learningContext, {
    humanCandidateReviewResultBinding: {
      path: humanReviewPath,
      schemaVersion: 'distant-connection-candidate-human-review-result-v001',
      fileSha256: sha256(input.humanCandidateReviewResultBytes)
    },
    duplicateAuditBinding: {
      path: duplicateAuditPath,
      schemaVersion: 'distant-connection-candidate-duplicate-audit-v001',
      fileSha256: sha256(input.duplicateAuditBytes)
    },
    humanVerdict: 'rejected',
    rejectionPrimaryCause: 'candidate-selection',
    rejectionReason: '前後関係が短尺だけでは分からず、面白さも増えません。',
    selectionStatus: 'not-selected',
    rejectedCandidate: {
      candidateId: 'candidate-rejected',
      anchorId: 'comment-anchor-000001',
      firstPartSemanticUtteranceIds: ['semantic-utterance-000001'],
      secondPartSemanticUtteranceIds: ['semantic-utterance-000006'],
      addedUnderstanding: 'candidate-rejectedの接続理由です。',
      direction: 'future'
    },
    priorUseCount: 4,
    priorCandidateUses: input.priorCandidateResponses.map((prior, index) => ({
      candidateId: ['prior-a', 'prior-b', 'prior-c', 'prior-d'][index],
      candidateResponseBinding: {
        path: prior.path,
        schemaVersion: 'distant-connection-luna-response-v001',
        fileSha256: sha256(prior.bytes)
      }
    }))
  });
});

test('人間評価・重複照合・不採用候補・過去候補のpathとSHA不一致を個別に拒否する', () => {
  const base = fixtureInput();
  expectCode('HUMAN_REVIEW_SHA_MISMATCH', () => (
    buildDistantConnectionLunaSourcePackageFromBytesV002({
      ...base,
      expectedHumanCandidateReviewResultSha256: '0'.repeat(64)
    })
  ));
  expectCode('DUPLICATE_AUDIT_SHA_MISMATCH', () => (
    buildDistantConnectionLunaSourcePackageFromBytesV002({
      ...base,
      expectedDuplicateAuditSha256: '0'.repeat(64)
    })
  ));
  expectCode('REJECTED_CANDIDATE_SHA_MISMATCH', () => (
    buildDistantConnectionLunaSourcePackageFromBytesV002({
      ...base,
      expectedRejectedCandidateResponseSha256: '0'.repeat(64)
    })
  ));
  expectCode('PRIOR_CANDIDATE_SHA_MISMATCH', () => (
    buildDistantConnectionLunaSourcePackageFromBytesV002({
      ...base,
      priorCandidateResponses: base.priorCandidateResponses.map((prior, index) => (
        index === 1 ? {...prior, expectedFileSha256: '0'.repeat(64)} : prior
      ))
    })
  ));
  expectCode('LEARNING_CONTEXT_MISMATCH', () => (
    buildDistantConnectionLunaSourcePackageFromBytesV002({
      ...base,
      priorCandidateResponses: [
        base.priorCandidateResponses[1]!,
        base.priorCandidateResponses[0]!,
        ...base.priorCandidateResponses.slice(2)
      ]
    })
  ));
});

test('人間採用扱い・4件でない履歴・異なる前半を学習履歴へ混入できない', () => {
  const approved = fixtureInput();
  const review = JSON.parse(approved.humanCandidateReviewResultBytes.toString('utf8'));
  review.verdict = 'approved-for-interval-review';
  const approvedReviewBytes = jsonBytes(review);
  expectCode('HUMAN_REVIEW_INVALID', () => (
    buildDistantConnectionLunaSourcePackageFromBytesV002({
      ...approved,
      humanCandidateReviewResultBytes: approvedReviewBytes,
      expectedHumanCandidateReviewResultSha256: sha256(approvedReviewBytes)
    })
  ));

  const threeUses = fixtureInput();
  const audit = JSON.parse(threeUses.duplicateAuditBytes.toString('utf8'));
  audit.sameFirstPartMatches.pop();
  const threeUseAuditBytes = jsonBytes(audit);
  expectCode('DUPLICATE_AUDIT_INVALID', () => (
    buildDistantConnectionLunaSourcePackageFromBytesV002({
      ...threeUses,
      duplicateAuditBytes: threeUseAuditBytes,
      expectedDuplicateAuditSha256: sha256(threeUseAuditBytes),
      priorCandidateResponses: threeUses.priorCandidateResponses.slice(0, 3)
    })
  ));

  const changedFirst = fixtureInput();
  const prior = JSON.parse(changedFirst.priorCandidateResponses[1]!.bytes.toString('utf8'));
  prior.candidates[0].firstPartSemanticUtteranceIds = ['semantic-utterance-000002'];
  prior.candidates[0].anchorId = 'comment-anchor-000002';
  const changedPriorBytes = jsonBytes(prior);
  const changedAudit = JSON.parse(changedFirst.duplicateAuditBytes.toString('utf8'));
  changedAudit.sameFirstPartMatches[1].fileSha256 = sha256(changedPriorBytes);
  const changedAuditBytes = jsonBytes(changedAudit);
  expectCode('LEARNING_CONTEXT_MISMATCH', () => (
    buildDistantConnectionLunaSourcePackageFromBytesV002({
      ...changedFirst,
      duplicateAuditBytes: changedAuditBytes,
      expectedDuplicateAuditSha256: sha256(changedAuditBytes),
      priorCandidateResponses: changedFirst.priorCandidateResponses.map((item, index) => (
        index === 1
          ? {...item, bytes: changedPriorBytes, expectedFileSha256: sha256(changedPriorBytes)}
          : item
      ))
    })
  ));
});

test('同一入力はbyte単位で同じv002になり、入力改変と余分なfieldを拒否する', () => {
  const input = fixtureInput();
  const first = buildDistantConnectionLunaSourcePackageFromBytesV002(input);
  const second = buildDistantConnectionLunaSourcePackageFromBytesV002(input);
  const firstBytes = serializeDistantConnectionLunaSourcePackageV002(first);
  assert.deepEqual(firstBytes, serializeDistantConnectionLunaSourcePackageV002(second));
  assert.doesNotThrow(() => validateDistantConnectionLunaSourcePackageAgainstInputsV002(first, input));
  const extra = {...first, unexpected: true};
  expectCode('SOURCE_PACKAGE_INVALID', () => assertDistantConnectionLunaSourcePackageV002(extra));
  const contextExtra = structuredClone(first) as any;
  contextExtra.learningContext.unexpected = true;
  expectCode('SOURCE_PACKAGE_INVALID', () => (
    assertDistantConnectionLunaSourcePackageV002(contextExtra)
  ));
  const changed = structuredClone(first);
  changed.learningContext.priorUseCount = 3 as 4;
  expectCode('SOURCE_PACKAGE_INVALID', () => assertDistantConnectionLunaSourcePackageV002(changed));
  const changedCandidate = structuredClone(first);
  changedCandidate.learningContext.rejectedCandidate.secondPartSemanticUtteranceIds = [
    'semantic-utterance-999999'
  ];
  expectCode('SOURCE_PACKAGE_INVALID', () => (
    assertDistantConnectionLunaSourcePackageV002(changedCandidate)
  ));
  const changedReason = structuredClone(first);
  changedReason.learningContext.rejectionReason = '改変した理由です。';
  expectCode('SOURCE_INPUT_MISMATCH', () => (
    validateDistantConnectionLunaSourcePackageAgainstInputsV002(changedReason, input)
  ));
  const wrongSemanticSchema = structuredClone(first);
  wrongSemanticSchema.semanticUtteranceBinding.schemaVersion = 'unexpected-semantic-schema';
  expectCode('SOURCE_PACKAGE_INVALID', () => (
    assertDistantConnectionLunaSourcePackageV002(wrongSemanticSchema)
  ));
  const wrongAnchorSchema = structuredClone(first);
  wrongAnchorSchema.commentVelocityAnchorBinding.schemaVersion = 'unexpected-anchor-schema';
  expectCode('SOURCE_PACKAGE_INVALID', () => (
    assertDistantConnectionLunaSourcePackageV002(wrongAnchorSchema)
  ));
  assert.deepEqual(decodeDistantConnectionLunaSourcePackageV002(firstBytes), first);
});

test('file入力は全workspace相対pathをread前に検査する', async () => {
  const input = fixtureInput();
  const fileInput = {
    workspaceRoot,
    semanticUtterancePath: input.semanticUtterancePath,
    commentVelocityAnchorPath: input.commentVelocityAnchorPath,
    sourcePackagePath: input.sourcePackagePath,
    plannedExecution: input.plannedExecution,
    rejectedCandidateResponsePath: input.rejectedCandidateResponsePath,
    expectedRejectedCandidateResponseSha256: input.expectedRejectedCandidateResponseSha256,
    humanCandidateReviewResultPath: input.humanCandidateReviewResultPath,
    expectedHumanCandidateReviewResultSha256: input.expectedHumanCandidateReviewResultSha256,
    duplicateAuditPath: input.duplicateAuditPath,
    expectedDuplicateAuditSha256: input.expectedDuplicateAuditSha256,
    priorCandidateResponses: input.priorCandidateResponses.map((prior) => ({
      path: prior.path,
      expectedFileSha256: prior.expectedFileSha256
    }))
  };
  const traversalPath = '../zev2';
  const cases = [
    {...fileInput, semanticUtterancePath: traversalPath},
    {...fileInput, commentVelocityAnchorPath: traversalPath},
    {...fileInput, sourcePackagePath: traversalPath},
    {...fileInput, rejectedCandidateResponsePath: traversalPath},
    {...fileInput, humanCandidateReviewResultPath: traversalPath},
    {...fileInput, duplicateAuditPath: traversalPath},
    {
      ...fileInput,
      priorCandidateResponses: fileInput.priorCandidateResponses.map((prior, index) => (
        index === 0 ? {...prior, path: traversalPath} : prior
      ))
    }
  ];
  for (const invalid of cases) {
    await assert.rejects(
      () => buildDistantConnectionLunaSourcePackageFromFilesV002(invalid),
      (error: unknown) => (
        error instanceof DistantConnectionLunaSourcePackageErrorV002
        && error.code === 'SOURCE_PACKAGE_INVALID'
      )
    );
  }
});

test('v002返答はsource path・SHAと正式IDを束縛して受理する', () => {
  const {bytes} = built();
  const response = validResponse(bytes);
  const validationInput = {sourcePackagePath, sourcePackageBytes: bytes};
  assert.doesNotThrow(() => validateDistantConnectionLunaResponseV002(response, validationInput));
  assert.deepEqual(
    decodeDistantConnectionLunaResponseV002(jsonBytes(response), validationInput),
    response
  );
});

test('v002返答は余分なfield・binding差・未知ID・空・重複・逆順・方向不一致を拒否する', () => {
  const {bytes} = built();
  const input = {sourcePackagePath, sourcePackageBytes: bytes};
  expectCode('RESPONSE_INVALID', () => validateDistantConnectionLunaResponseV002(
    {...validResponse(bytes), unexpected: true}, input
  ));
  const wrongSha = validResponse(bytes);
  wrongSha.sourcePackageBinding.fileSha256 = '0'.repeat(64);
  expectCode('SOURCE_PACKAGE_SHA_MISMATCH', () => (
    validateDistantConnectionLunaResponseV002(wrongSha, input)
  ));
  const wrongVersion = validResponse(bytes);
  wrongVersion.sourcePackageBinding.schemaVersion = DISTANT_CONNECTION_LUNA_SOURCE_PACKAGE_SCHEMA_V001;
  expectCode('SOURCE_PACKAGE_BINDING_MISMATCH', () => (
    validateDistantConnectionLunaResponseV002(wrongVersion, input)
  ));
  const unknownAnchor = validResponse(bytes);
  unknownAnchor.candidates[0]!.anchorId = 'comment-anchor-999999';
  expectCode('UNKNOWN_ANCHOR_ID', () => (
    validateDistantConnectionLunaResponseV002(unknownAnchor, input)
  ));
  const unknownUtterance = validResponse(bytes);
  unknownUtterance.candidates[0]!.secondPartSemanticUtteranceIds = [
    'semantic-utterance-999999'
  ];
  expectCode('UNKNOWN_UTTERANCE_ID', () => (
    validateDistantConnectionLunaResponseV002(unknownUtterance, input)
  ));
  const emptyFirst = validResponse(bytes);
  emptyFirst.candidates[0]!.firstPartSemanticUtteranceIds = [];
  expectCode('EMPTY_FIRST_PART', () => (
    validateDistantConnectionLunaResponseV002(emptyFirst, input)
  ));
  const emptySecond = validResponse(bytes);
  emptySecond.candidates[0]!.secondPartSemanticUtteranceIds = [];
  expectCode('EMPTY_SECOND_PART', () => (
    validateDistantConnectionLunaResponseV002(emptySecond, input)
  ));
  const duplicate = validResponse(bytes);
  duplicate.candidates[0]!.firstPartSemanticUtteranceIds = [
    'semantic-utterance-000001', 'semantic-utterance-000001'
  ];
  expectCode('UTTERANCE_DUPLICATE', () => (
    validateDistantConnectionLunaResponseV002(duplicate, input)
  ));
  const reversed = validResponse(bytes);
  reversed.candidates[0]!.secondPartSemanticUtteranceIds = [
    'semantic-utterance-000006', 'semantic-utterance-000005'
  ];
  expectCode('UTTERANCE_ORDER_REVERSED', () => (
    validateDistantConnectionLunaResponseV002(reversed, input)
  ));
  const samePosition = validResponse(bytes);
  samePosition.candidates[0]!.secondPartSemanticUtteranceIds = ['semantic-utterance-000001'];
  expectCode('UTTERANCE_DUPLICATE', () => (
    validateDistantConnectionLunaResponseV002(samePosition, input)
  ));
  const wrongDirection = validResponse(bytes);
  wrongDirection.candidates[0]!.anchorId = 'comment-anchor-000006';
  expectCode('ANCHOR_DIRECTION_MISMATCH', () => (
    validateDistantConnectionLunaResponseV002(wrongDirection, input)
  ));
});

test('保存済みv001 source packageはdecode・serialize後もbyteとSHAが不変である', async () => {
  const before = await readFile(path.join(workspaceRoot, historicalSourcePackagePath));
  assert.equal(sha256(before), historicalSourcePackageSha256);
  const decoded = decodeDistantConnectionLunaSourcePackageV001(before);
  assert.deepEqual(serializeDistantConnectionLunaSourcePackageV001(decoded), before);
  assert.equal('learningContext' in decoded, false);
  expectCode('SOURCE_PACKAGE_INVALID', () => decodeDistantConnectionLunaSourcePackageV002(before));
  const after = await readFile(path.join(workspaceRoot, historicalSourcePackagePath));
  assert.deepEqual(after, before);
});
