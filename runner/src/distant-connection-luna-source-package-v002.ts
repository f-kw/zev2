import {createHash} from 'node:crypto';
import {mkdir, readFile, writeFile} from 'node:fs/promises';
import path from 'node:path';

import {
  COMMENT_VELOCITY_ANCHOR_ARTIFACT_SCHEMA_V001
} from './comment-velocity-anchor-artifact-v001.js';
import {
  DISTANT_CONNECTION_CANDIDATE_HUMAN_REVIEW_RESULT_SCHEMA_V001,
  assertDistantConnectionCandidateHumanReviewResultV001,
  type DistantConnectionCandidateHumanReviewResultV001
} from './distant-connection-candidate-review-v001.js';
import {
  DISTANT_CONNECTION_LUNA_RESPONSE_SCHEMA_V001,
  buildDistantConnectionLunaSourcePackageFromBytesV001,
  type DistantConnectionCandidateV001,
  type DistantConnectionLunaExecutionPlanningV001,
  type DistantConnectionLunaSourcePackageV001
} from './distant-connection-luna-source-package-v001.js';
import {
  SEMANTIC_UTTERANCE_ARTIFACT_SCHEMA_V001
} from './semantic-utterance-artifact-v001.js';

export const DISTANT_CONNECTION_LUNA_SOURCE_PACKAGE_SCHEMA_V002 =
  'distant-connection-luna-source-package-v002';
export const DISTANT_CONNECTION_CANDIDATE_DUPLICATE_AUDIT_SCHEMA_V001 =
  'distant-connection-candidate-duplicate-audit-v001';
export const DISTANT_CONNECTION_REJECTED_FIRST_PART_PRIOR_USE_COUNT_V002 = 4 as const;

export const DISTANT_CONNECTION_LUNA_V002_ERROR_CODES = Object.freeze([
  'SOURCE_PACKAGE_INVALID',
  'SOURCE_INPUT_MISMATCH',
  'HUMAN_REVIEW_INVALID',
  'HUMAN_REVIEW_SHA_MISMATCH',
  'DUPLICATE_AUDIT_INVALID',
  'DUPLICATE_AUDIT_SHA_MISMATCH',
  'REJECTED_CANDIDATE_INVALID',
  'REJECTED_CANDIDATE_SHA_MISMATCH',
  'PRIOR_CANDIDATE_INVALID',
  'PRIOR_CANDIDATE_SHA_MISMATCH',
  'LEARNING_CONTEXT_MISMATCH',
  'SOURCE_PACKAGE_BINDING_MISMATCH',
  'SOURCE_PACKAGE_SHA_MISMATCH',
  'SOURCE_VIDEO_MISMATCH',
  'RESPONSE_INVALID',
  'UNKNOWN_ANCHOR_ID',
  'UNKNOWN_UTTERANCE_ID',
  'EMPTY_FIRST_PART',
  'EMPTY_SECOND_PART',
  'UTTERANCE_DUPLICATE',
  'UTTERANCE_ORDER_REVERSED',
  'ANCHOR_DIRECTION_MISMATCH'
] as const);

export type DistantConnectionLunaV002ErrorCode =
  typeof DISTANT_CONNECTION_LUNA_V002_ERROR_CODES[number];

export class DistantConnectionLunaSourcePackageErrorV002 extends Error {
  readonly code: DistantConnectionLunaV002ErrorCode;

  constructor(code: DistantConnectionLunaV002ErrorCode, message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'DistantConnectionLunaSourcePackageErrorV002';
    this.code = code;
  }
}

export type DistantConnectionLunaFormalFileBindingV002 = {
  path: string;
  schemaVersion: string;
  fileSha256: string;
};

export type DistantConnectionLunaPriorCandidateInputV002 = {
  path: string;
  bytes: Uint8Array;
  expectedFileSha256: string;
};

export type DistantConnectionLunaPriorCandidateFileInputV002 = Omit<
  DistantConnectionLunaPriorCandidateInputV002,
  'bytes'
>;

export type DistantConnectionLunaLearningContextV002 = {
  humanCandidateReviewResultBinding: DistantConnectionLunaFormalFileBindingV002;
  duplicateAuditBinding: DistantConnectionLunaFormalFileBindingV002;
  humanVerdict: 'rejected';
  rejectionPrimaryCause: 'candidate-selection';
  rejectionReason: string;
  selectionStatus: 'not-selected';
  rejectedCandidate: DistantConnectionCandidateV001;
  priorUseCount: typeof DISTANT_CONNECTION_REJECTED_FIRST_PART_PRIOR_USE_COUNT_V002;
  priorCandidateUses: Array<{
    candidateId: string;
    candidateResponseBinding: DistantConnectionLunaFormalFileBindingV002;
  }>;
};

export type DistantConnectionLunaSourcePackageV002 = {
  schemaVersion: typeof DISTANT_CONNECTION_LUNA_SOURCE_PACKAGE_SCHEMA_V002;
  sourceVideoId: string;
  semanticUtteranceBinding: DistantConnectionLunaFormalFileBindingV002;
  commentVelocityAnchorBinding: DistantConnectionLunaFormalFileBindingV002;
  plannedExecution: DistantConnectionLunaExecutionPlanningV001;
  explorationTask: {
    objective: string;
    anchorInstruction: string;
    returnInstruction: string;
    boundaryMeaning: string;
  };
  learningContext: DistantConnectionLunaLearningContextV002;
  utteranceCount: number;
  anchorCount: number;
  utterances: DistantConnectionLunaSourcePackageV001['utterances'];
  anchors: DistantConnectionLunaSourcePackageV001['anchors'];
  responseContract: {
    schemaVersion: typeof DISTANT_CONNECTION_LUNA_RESPONSE_SCHEMA_V001;
    sourcePackagePath: string;
    jsonSchema: Record<string, unknown>;
  };
};

export type DistantConnectionLunaResponseV002 = {
  schemaVersion: typeof DISTANT_CONNECTION_LUNA_RESPONSE_SCHEMA_V001;
  sourceVideoId: string;
  sourcePackageBinding: DistantConnectionLunaFormalFileBindingV002;
  candidates: DistantConnectionCandidateV001[];
};

export type ValidateDistantConnectionLunaResponseInputV002 = {
  sourcePackagePath: string;
  sourcePackageBytes: Uint8Array;
};

export type BuildDistantConnectionLunaSourcePackageFromBytesInputV002 = {
  semanticUtterancePath: string;
  semanticUtteranceBytes: Uint8Array;
  commentVelocityAnchorPath: string;
  commentVelocityAnchorBytes: Uint8Array;
  sourcePackagePath: string;
  plannedExecution: DistantConnectionLunaExecutionPlanningV001;
  rejectedCandidateResponsePath: string;
  rejectedCandidateResponseBytes: Uint8Array;
  expectedRejectedCandidateResponseSha256: string;
  humanCandidateReviewResultPath: string;
  humanCandidateReviewResultBytes: Uint8Array;
  expectedHumanCandidateReviewResultSha256: string;
  duplicateAuditPath: string;
  duplicateAuditBytes: Uint8Array;
  expectedDuplicateAuditSha256: string;
  priorCandidateResponses: DistantConnectionLunaPriorCandidateInputV002[];
};

export type BuildDistantConnectionLunaSourcePackageFromFilesInputV002 = Omit<
  BuildDistantConnectionLunaSourcePackageFromBytesInputV002,
  | 'semanticUtteranceBytes'
  | 'commentVelocityAnchorBytes'
  | 'rejectedCandidateResponseBytes'
  | 'humanCandidateReviewResultBytes'
  | 'duplicateAuditBytes'
  | 'priorCandidateResponses'
> & {
  workspaceRoot: string;
  priorCandidateResponses: DistantConnectionLunaPriorCandidateFileInputV002[];
};

type WriteDistantConnectionLunaSourcePackageFromFilesInputV002 =
  BuildDistantConnectionLunaSourcePackageFromFilesInputV002 & {outputPath: string};

type RecordValue = Record<string, unknown>;
type CandidateResponse = {
  schemaVersion: typeof DISTANT_CONNECTION_LUNA_RESPONSE_SCHEMA_V001;
  sourceVideoId: string;
  sourcePackageBinding: DistantConnectionLunaFormalFileBindingV002;
  candidates: DistantConnectionCandidateV001[];
};
type DuplicateAudit = {
  recordVersion: typeof DISTANT_CONNECTION_CANDIDATE_DUPLICATE_AUDIT_SCHEMA_V001;
  candidateResponseBinding: {path: string; fileSha256: string};
  candidateId: string;
  comparedPriorCandidateCount: number;
  exactPairDuplicate: false;
  exactPairMatches: unknown[];
  sameFirstPartMatches: Array<{path: string; fileSha256: string; candidateId: string}>;
  sameSecondPartMatches: unknown[];
  conclusion: 'not-exact-duplicate-but-first-part-reuses-prior-introduction';
};

const SHA256 = /^[0-9a-f]{64}$/u;
const FORMAL_ID = /^[A-Za-z0-9][A-Za-z0-9._-]*$/u;
const SEMANTIC_UTTERANCE_ID = /^semantic-utterance-[0-9]{6}$/u;
const SOURCE_VIDEO_ID = /^[A-Za-z0-9_-]+$/u;
const WORKSPACE_RELATIVE_PATH =
  /^(?!\/)(?!\.\/)(?!.*(?:^|\/)\.\.(?:\/|$))(?!.*\\)(?!.*\/\/)[^\0]+$/u;

const APPROVED_PLANNED_EXECUTION = Object.freeze({
  providerId: 'openai-api',
  modelId: 'gpt-5.6-luna',
  operationId: 'responses',
  jobExperimentValues: []
});

const EXPLORATION_TASK_V002 = Object.freeze({
  objective:
    '各コメント流量アンカーについて、配信全文の正式意味発話から時間的に離れた過去または未来の相方を探してください。2つの場面を前から後の順に組み合わせることで、後半単独では得られない理解、回収感、意外性、面白さのいずれかが明確に生まれる接続だけを候補にしてください。前振りと回収、予告と実現、原因と後の結果、過去の発言と後の反応、認識・予想と後の出来事、約束・宣言と後の実行、疑問と後の答え、以前の出来事によって後の発言の意味が変わる関係は例であり、閉じた分類ではありません。',
  anchorInstruction:
    'directionはanchorから見た相方の位置を表します。futureの場合はanchor発話をfirstPartに含め、相方を未来側のsecondPartに置いてください。pastの場合はanchor発話をsecondPartに含め、相方を過去側のfirstPartに置いてください。',
  returnInstruction:
    '候補ごとに、前半として必要な正式意味発話ID群、後半として必要な正式意味発話ID群、前半を付けることで後半の何が新しく分かるかを返してください。同じゲーム・人物・テーマ・設定に属するだけ、一般的な背景説明が後半にも当てはまるだけ、または前半を外しても後半の理解や面白さがほぼ変わらない接続は返さないでください。単なるOPからEDへの対応だけでは採用しません。配信冒頭の一般説明と終了時の総括を並べた時系列上の対称性だけでも採用しません。前半に含まれる具体的な内容が、後半の具体的な出来事・反応・結果によって回収されることを要求します。その接続関係は、前半から後半へ続く短尺動画そのものから普通の視聴者が理解できなければなりません。接続によって理解、回収感、意外性、面白さの少なくとも一つに明確な増分が必要です。外部説明を加えなければ接続理由が分からない候補は返さないでください。learningContextのhumanVerdict、rejectionPrimaryCause、rejectionReason、selectionStatus、rejectedCandidateは、人間が実際に棄却した候補と理由です。失敗候補の後半とaddedUnderstandingまで読んで、同じ弱い接続根拠を繰り返さないでください。learningContextのrejectedCandidateに含まれる既出前半も機械的に禁止しません。ただし再利用時は、後半との間に未使用前半の場合より強い具体的な回収があり、普通の視聴者にとって明確な視聴価値がある場合だけ返してください。後半が同じ対象や出来事に触れるだけでは具体的な回収ではありません。意味関係の理解に必要な前提情報が短尺動画として自然な長さに収まり、追加説明なしで接続を理解できる候補だけを返してください。',
  boundaryMeaning:
    '返す正式意味発話IDは探索根拠であり、完成動画の最終切り出し位置ではありません。導入文脈や自然な終端は後続工程が決めます。'
});

function fail(
  code: DistantConnectionLunaV002ErrorCode,
  message: string,
  cause?: unknown
): never {
  throw new DistantConnectionLunaSourcePackageErrorV002(
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

function hasExactKeys(value: RecordValue, keys: string[]): boolean {
  const actual = Object.keys(value);
  return actual.length === keys.length && actual.every((key, index) => key === keys[index]);
}

function assertPath(value: unknown, label: string): asserts value is string {
  if (typeof value !== 'string' || !WORKSPACE_RELATIVE_PATH.test(value)) {
    fail('SOURCE_PACKAGE_INVALID', `${label}はworkspace相対pathである必要があります`);
  }
}

function assertFormalBinding(
  value: unknown,
  label: string,
  code: DistantConnectionLunaV002ErrorCode = 'SOURCE_PACKAGE_INVALID'
): asserts value is DistantConnectionLunaFormalFileBindingV002 {
  if (!isRecord(value)
    || !hasExactKeys(value, ['path', 'schemaVersion', 'fileSha256'])
    || typeof value.schemaVersion !== 'string'
    || !FORMAL_ID.test(value.schemaVersion)
    || typeof value.fileSha256 !== 'string'
    || !SHA256.test(value.fileSha256)) {
    fail(code, `${label}が不正です`);
  }
  assertPath(value.path, `${label}のpath`);
}

function checkedInputSha(
  pathValue: string,
  bytes: Uint8Array,
  expectedSha256: string,
  code: DistantConnectionLunaV002ErrorCode,
  label: string
): string {
  assertPath(pathValue, `${label}のpath`);
  const actual = sha256(bytes);
  if (!SHA256.test(expectedSha256) || actual !== expectedSha256) {
    fail(code, `${label}のSHA-256が指定値と一致しません`);
  }
  return actual;
}

function parseRecord(
  bytes: Uint8Array,
  code: DistantConnectionLunaV002ErrorCode,
  label: string
): RecordValue {
  try {
    const parsed: unknown = JSON.parse(Buffer.from(bytes).toString('utf8'));
    if (!isRecord(parsed)) fail(code, `${label}のrootがobjectではありません`);
    return parsed;
  } catch (error) {
    if (error instanceof DistantConnectionLunaSourcePackageErrorV002) throw error;
    fail(code, `${label}がJSONとして読めません`, error);
  }
}

function assertApprovedExecution(value: unknown): asserts value is DistantConnectionLunaExecutionPlanningV001 {
  if (!isRecord(value)
    || !hasExactKeys(value, ['providerId', 'modelId', 'operationId', 'jobExperimentValues'])
    || JSON.stringify(value) !== JSON.stringify(APPROVED_PLANNED_EXECUTION)) {
    fail('SOURCE_PACKAGE_INVALID', 'provider/model/operation予定値が承認済み値と一致しません');
  }
}

function assertCandidateShape(
  value: unknown,
  label: string,
  code: DistantConnectionLunaV002ErrorCode
): asserts value is DistantConnectionCandidateV001 {
  if (!isRecord(value)
    || !hasExactKeys(value, [
      'candidateId',
      'anchorId',
      'firstPartSemanticUtteranceIds',
      'secondPartSemanticUtteranceIds',
      'addedUnderstanding',
      'direction'
    ])
    || typeof value.candidateId !== 'string'
    || !FORMAL_ID.test(value.candidateId)
    || typeof value.anchorId !== 'string'
    || !FORMAL_ID.test(value.anchorId)
    || !Array.isArray(value.firstPartSemanticUtteranceIds)
    || value.firstPartSemanticUtteranceIds.length === 0
    || value.firstPartSemanticUtteranceIds.some(
      (id) => typeof id !== 'string' || !SEMANTIC_UTTERANCE_ID.test(id)
    )
    || !Array.isArray(value.secondPartSemanticUtteranceIds)
    || value.secondPartSemanticUtteranceIds.length === 0
    || value.secondPartSemanticUtteranceIds.some(
      (id) => typeof id !== 'string' || !SEMANTIC_UTTERANCE_ID.test(id)
    )
    || typeof value.addedUnderstanding !== 'string'
    || value.addedUnderstanding.length === 0
    || (value.direction !== 'past' && value.direction !== 'future')) {
    fail(code, `${label}が不正です`);
  }
}

function assertCandidateResponse(value: unknown, label: string): asserts value is CandidateResponse {
  if (!isRecord(value)
    || !hasExactKeys(value, ['schemaVersion', 'sourceVideoId', 'sourcePackageBinding', 'candidates'])
    || value.schemaVersion !== DISTANT_CONNECTION_LUNA_RESPONSE_SCHEMA_V001
    || typeof value.sourceVideoId !== 'string'
    || !SOURCE_VIDEO_ID.test(value.sourceVideoId)
    || !Array.isArray(value.candidates)) {
    fail('REJECTED_CANDIDATE_INVALID', `${label}のroot構造が不正です`);
  }
  assertFormalBinding(value.sourcePackageBinding, `${label}のsource package binding`);
  const seen = new Set<string>();
  for (const [index, candidate] of value.candidates.entries()) {
    assertCandidateShape(
      candidate,
      `${label}の候補${index + 1}件目`,
      'REJECTED_CANDIDATE_INVALID'
    );
    if (seen.has(candidate.candidateId)) {
      fail('REJECTED_CANDIDATE_INVALID', `${label}のcandidate IDが重複しています`);
    }
    seen.add(candidate.candidateId);
  }
}

function assertDuplicateAudit(value: unknown): asserts value is DuplicateAudit {
  if (!isRecord(value)
    || !hasExactKeys(value, [
      'recordVersion',
      'candidateResponseBinding',
      'candidateId',
      'comparedPriorCandidateCount',
      'exactPairDuplicate',
      'exactPairMatches',
      'sameFirstPartMatches',
      'sameSecondPartMatches',
      'conclusion'
    ])
    || value.recordVersion !== DISTANT_CONNECTION_CANDIDATE_DUPLICATE_AUDIT_SCHEMA_V001
    || typeof value.candidateId !== 'string'
    || !FORMAL_ID.test(value.candidateId)
    || !Number.isSafeInteger(value.comparedPriorCandidateCount)
    || (value.comparedPriorCandidateCount as number)
      < DISTANT_CONNECTION_REJECTED_FIRST_PART_PRIOR_USE_COUNT_V002
    || value.exactPairDuplicate !== false
    || !Array.isArray(value.exactPairMatches)
    || value.exactPairMatches.length !== 0
    || !Array.isArray(value.sameFirstPartMatches)
    || value.sameFirstPartMatches.length
      !== DISTANT_CONNECTION_REJECTED_FIRST_PART_PRIOR_USE_COUNT_V002
    || !Array.isArray(value.sameSecondPartMatches)
    || value.sameSecondPartMatches.length !== 0
    || value.conclusion !== 'not-exact-duplicate-but-first-part-reuses-prior-introduction'
    || !isRecord(value.candidateResponseBinding)
    || !hasExactKeys(value.candidateResponseBinding, ['path', 'fileSha256'])
    || typeof value.candidateResponseBinding.fileSha256 !== 'string'
    || !SHA256.test(value.candidateResponseBinding.fileSha256)) {
    fail('DUPLICATE_AUDIT_INVALID', '重複照合記録の構造または観測値が不正です');
  }
  assertPath(value.candidateResponseBinding.path, '重複照合対象候補path');
  const seen = new Set<string>();
  for (const [index, match] of value.sameFirstPartMatches.entries()) {
    if (!isRecord(match)
      || !hasExactKeys(match, ['path', 'fileSha256', 'candidateId'])
      || typeof match.fileSha256 !== 'string'
      || !SHA256.test(match.fileSha256)
      || typeof match.candidateId !== 'string'
      || !FORMAL_ID.test(match.candidateId)) {
      fail('DUPLICATE_AUDIT_INVALID', `同一前半一致${index + 1}件目が不正です`);
    }
    assertPath(match.path, `同一前半一致${index + 1}件目のpath`);
    const identity = JSON.stringify([match.path, match.candidateId]);
    if (seen.has(identity)) fail('DUPLICATE_AUDIT_INVALID', '同一前半一致が重複しています');
    seen.add(identity);
  }
}

function candidateById(
  response: CandidateResponse,
  candidateId: string,
  code: DistantConnectionLunaV002ErrorCode,
  label: string
): DistantConnectionCandidateV001 {
  const matches = response.candidates.filter((candidate) => candidate.candidateId === candidateId);
  if (matches.length !== 1) fail(code, `${label}に対象候補がexact 1件ありません`);
  return matches[0]!;
}

function assertCandidateAgainstSource(
  candidate: DistantConnectionCandidateV001,
  label: string,
  ordinalById: Map<string, number>,
  anchorSemanticUtteranceIdById: Map<string, string>,
  code: DistantConnectionLunaV002ErrorCode
): void {
  assertCandidateShape(candidate, label, code);
  const orderedOrdinals = (ids: string[], partLabel: string): number[] => {
    const seen = new Set<string>();
    let previousOrdinal = 0;
    return ids.map((id) => {
      const ordinal = ordinalById.get(id);
      if (ordinal === undefined || seen.has(id) || ordinal <= previousOrdinal) {
        fail(code, `${label}の${partLabel}が正式意味発話の時系列順と一致しません`);
      }
      seen.add(id);
      previousOrdinal = ordinal;
      return ordinal;
    });
  };
  const firstOrdinals = orderedOrdinals(candidate.firstPartSemanticUtteranceIds, '前半');
  const secondOrdinals = orderedOrdinals(candidate.secondPartSemanticUtteranceIds, '後半');
  const firstIds = new Set(candidate.firstPartSemanticUtteranceIds);
  if (candidate.secondPartSemanticUtteranceIds.some((id) => firstIds.has(id))
    || firstOrdinals[firstOrdinals.length - 1]! >= secondOrdinals[0]!) {
    fail(code, `${label}の前半と後半が別の時系列位置を示していません`);
  }
  const anchorSemanticUtteranceId = anchorSemanticUtteranceIdById.get(candidate.anchorId);
  if (anchorSemanticUtteranceId === undefined) {
    fail(code, `${label}が未知のコメント流量アンカーを参照しています`);
  }
  const anchorInExpectedPart = candidate.direction === 'past'
    ? candidate.secondPartSemanticUtteranceIds.includes(anchorSemanticUtteranceId)
    : candidate.firstPartSemanticUtteranceIds.includes(anchorSemanticUtteranceId);
  if (!anchorInExpectedPart) {
    fail(code, `${label}の方向とアンカーを含む側が一致しません`);
  }
}

function inspectLearningInputs(
  input: BuildDistantConnectionLunaSourcePackageFromBytesInputV002,
  sourceVideoId: string,
  knownUtteranceOrdinals: Map<string, number>,
  knownAnchorSemanticUtteranceIds: Map<string, string>
): DistantConnectionLunaLearningContextV002 {
  const rejectedCandidateSha = checkedInputSha(
    input.rejectedCandidateResponsePath,
    input.rejectedCandidateResponseBytes,
    input.expectedRejectedCandidateResponseSha256,
    'REJECTED_CANDIDATE_SHA_MISMATCH',
    '人間不採用候補成果物'
  );
  const rejectedResponse = parseRecord(
    input.rejectedCandidateResponseBytes,
    'REJECTED_CANDIDATE_INVALID',
    '人間不採用候補成果物'
  );
  assertCandidateResponse(rejectedResponse, '人間不採用候補成果物');

  const reviewSha = checkedInputSha(
    input.humanCandidateReviewResultPath,
    input.humanCandidateReviewResultBytes,
    input.expectedHumanCandidateReviewResultSha256,
    'HUMAN_REVIEW_SHA_MISMATCH',
    '人間candidate review結果'
  );
  const reviewValue = parseRecord(
    input.humanCandidateReviewResultBytes,
    'HUMAN_REVIEW_INVALID',
    '人間candidate review結果'
  );
  try {
    assertDistantConnectionCandidateHumanReviewResultV001(reviewValue);
  } catch (error) {
    fail('HUMAN_REVIEW_INVALID', '人間candidate review結果が正式契約に適合しません', error);
  }
  const review = reviewValue as DistantConnectionCandidateHumanReviewResultV001;
  if (review.verdict !== 'rejected'
    || review.primaryCause !== 'candidate-selection'
    || review.selectionStatus !== 'not-selected'
    || review.sourceVideoId !== sourceVideoId
    || review.sourceBindings.candidateResponse.path !== input.rejectedCandidateResponsePath
    || review.sourceBindings.candidateResponse.fileSha256 !== rejectedCandidateSha
    || rejectedResponse.sourceVideoId !== sourceVideoId) {
    fail('HUMAN_REVIEW_INVALID', '人間不採用評価が対象候補・動画・candidate-selection failを束縛していません');
  }
  const rejectedCandidate = candidateById(
    rejectedResponse,
    review.candidateId,
    'REJECTED_CANDIDATE_INVALID',
    '人間不採用候補成果物'
  );
  assertCandidateAgainstSource(
    rejectedCandidate,
    '人間不採用候補',
    knownUtteranceOrdinals,
    knownAnchorSemanticUtteranceIds,
    'REJECTED_CANDIDATE_INVALID'
  );

  const auditSha = checkedInputSha(
    input.duplicateAuditPath,
    input.duplicateAuditBytes,
    input.expectedDuplicateAuditSha256,
    'DUPLICATE_AUDIT_SHA_MISMATCH',
    '重複照合記録'
  );
  const auditValue = parseRecord(
    input.duplicateAuditBytes,
    'DUPLICATE_AUDIT_INVALID',
    '重複照合記録'
  );
  assertDuplicateAudit(auditValue);
  const audit = auditValue as DuplicateAudit;
  if (audit.candidateId !== review.candidateId
    || audit.candidateResponseBinding.path !== input.rejectedCandidateResponsePath
    || audit.candidateResponseBinding.fileSha256 !== rejectedCandidateSha
    || input.priorCandidateResponses.length
      !== DISTANT_CONNECTION_REJECTED_FIRST_PART_PRIOR_USE_COUNT_V002) {
    fail('LEARNING_CONTEXT_MISMATCH', '重複照合と人間不採用候補または既出件数が一致しません');
  }

  const priorCandidateUses = audit.sameFirstPartMatches.map((match, index) => {
    const priorInput = input.priorCandidateResponses[index];
    if (!priorInput || priorInput.path !== match.path) {
      fail('LEARNING_CONTEXT_MISMATCH', `既出候補${index + 1}件目のpathまたは順序が重複照合と一致しません`);
    }
    const priorSha = checkedInputSha(
      priorInput.path,
      priorInput.bytes,
      priorInput.expectedFileSha256,
      'PRIOR_CANDIDATE_SHA_MISMATCH',
      `既出候補${index + 1}件目`
    );
    if (priorSha !== match.fileSha256) {
      fail('PRIOR_CANDIDATE_SHA_MISMATCH', `既出候補${index + 1}件目のSHA-256が重複照合と一致しません`);
    }
    const priorValue = parseRecord(
      priorInput.bytes,
      'PRIOR_CANDIDATE_INVALID',
      `既出候補${index + 1}件目`
    );
    try {
      assertCandidateResponse(priorValue, `既出候補${index + 1}件目`);
    } catch (error) {
      if (error instanceof DistantConnectionLunaSourcePackageErrorV002) {
        fail('PRIOR_CANDIDATE_INVALID', error.message, error);
      }
      throw error;
    }
    const priorResponse = priorValue as CandidateResponse;
    if (priorResponse.sourceVideoId !== sourceVideoId) {
      fail('PRIOR_CANDIDATE_INVALID', `既出候補${index + 1}件目の元動画が一致しません`);
    }
    const priorCandidate = candidateById(
      priorResponse,
      match.candidateId,
      'PRIOR_CANDIDATE_INVALID',
      `既出候補${index + 1}件目`
    );
    assertCandidateAgainstSource(
      priorCandidate,
      `既出候補${index + 1}件目`,
      knownUtteranceOrdinals,
      knownAnchorSemanticUtteranceIds,
      'PRIOR_CANDIDATE_INVALID'
    );
    if (JSON.stringify(priorCandidate.firstPartSemanticUtteranceIds)
      !== JSON.stringify(rejectedCandidate.firstPartSemanticUtteranceIds)) {
      fail('LEARNING_CONTEXT_MISMATCH', `既出候補${index + 1}件目が同一前半を使用していません`);
    }
    return {
      candidateId: match.candidateId,
      candidateResponseBinding: {
        path: priorInput.path,
        schemaVersion: priorResponse.schemaVersion,
        fileSha256: priorSha
      }
    };
  });

  return {
    humanCandidateReviewResultBinding: {
      path: input.humanCandidateReviewResultPath,
      schemaVersion: DISTANT_CONNECTION_CANDIDATE_HUMAN_REVIEW_RESULT_SCHEMA_V001,
      fileSha256: reviewSha
    },
    duplicateAuditBinding: {
      path: input.duplicateAuditPath,
      schemaVersion: audit.recordVersion,
      fileSha256: auditSha
    },
    humanVerdict: review.verdict,
    rejectionPrimaryCause: review.primaryCause,
    rejectionReason: review.reason,
    selectionStatus: review.selectionStatus,
    rejectedCandidate: structuredClone(rejectedCandidate),
    priorUseCount: DISTANT_CONNECTION_REJECTED_FIRST_PART_PRIOR_USE_COUNT_V002,
    priorCandidateUses
  };
}

function buildResponseJsonSchema(
  sourceVideoId: string,
  sourcePackagePath: string
): Record<string, unknown> {
  return {
    type: 'object',
    additionalProperties: false,
    required: ['schemaVersion', 'sourceVideoId', 'sourcePackageBinding', 'candidates'],
    properties: {
      schemaVersion: {type: 'string', const: DISTANT_CONNECTION_LUNA_RESPONSE_SCHEMA_V001},
      sourceVideoId: {type: 'string', const: sourceVideoId},
      sourcePackageBinding: {
        type: 'object',
        additionalProperties: false,
        required: ['path', 'schemaVersion', 'fileSha256'],
        properties: {
          path: {type: 'string', const: sourcePackagePath},
          schemaVersion: {
            type: 'string',
            const: DISTANT_CONNECTION_LUNA_SOURCE_PACKAGE_SCHEMA_V002
          },
          fileSha256: {type: 'string', pattern: '^[0-9a-f]{64}$'}
        }
      },
      candidates: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: false,
          required: [
            'candidateId',
            'anchorId',
            'firstPartSemanticUtteranceIds',
            'secondPartSemanticUtteranceIds',
            'addedUnderstanding',
            'direction'
          ],
          properties: {
            candidateId: {type: 'string', pattern: '^[A-Za-z0-9][A-Za-z0-9._-]*$'},
            anchorId: {type: 'string', pattern: '^[A-Za-z0-9][A-Za-z0-9._-]*$'},
            firstPartSemanticUtteranceIds: {
              type: 'array',
              minItems: 1,
              items: {type: 'string', pattern: '^semantic-utterance-[0-9]{6}$'}
            },
            secondPartSemanticUtteranceIds: {
              type: 'array',
              minItems: 1,
              items: {type: 'string', pattern: '^semantic-utterance-[0-9]{6}$'}
            },
            addedUnderstanding: {type: 'string', minLength: 1},
            direction: {type: 'string', enum: ['past', 'future']}
          }
        }
      }
    }
  };
}

export function buildDistantConnectionLunaSourcePackageFromBytesV002(
  input: BuildDistantConnectionLunaSourcePackageFromBytesInputV002
): DistantConnectionLunaSourcePackageV002 {
  assertApprovedExecution(input.plannedExecution);
  const base = buildDistantConnectionLunaSourcePackageFromBytesV001({
    semanticUtterancePath: input.semanticUtterancePath,
    semanticUtteranceBytes: input.semanticUtteranceBytes,
    commentVelocityAnchorPath: input.commentVelocityAnchorPath,
    commentVelocityAnchorBytes: input.commentVelocityAnchorBytes,
    sourcePackagePath: input.sourcePackagePath,
    plannedExecution: input.plannedExecution
  });
  const learningContext = inspectLearningInputs(
    input,
    base.sourceVideoId,
    new Map(base.utterances.map((utterance) => [utterance.utteranceId, utterance.ordinal])),
    new Map(base.anchors.map((anchor) => [anchor.anchorId, anchor.semanticUtteranceId]))
  );
  const value: DistantConnectionLunaSourcePackageV002 = {
    schemaVersion: DISTANT_CONNECTION_LUNA_SOURCE_PACKAGE_SCHEMA_V002,
    sourceVideoId: base.sourceVideoId,
    semanticUtteranceBinding: structuredClone(base.semanticUtteranceBinding),
    commentVelocityAnchorBinding: structuredClone(base.commentVelocityAnchorBinding),
    plannedExecution: structuredClone(input.plannedExecution),
    explorationTask: structuredClone(EXPLORATION_TASK_V002),
    learningContext,
    utteranceCount: base.utteranceCount,
    anchorCount: base.anchorCount,
    utterances: structuredClone(base.utterances),
    anchors: structuredClone(base.anchors),
    responseContract: {
      schemaVersion: DISTANT_CONNECTION_LUNA_RESPONSE_SCHEMA_V001,
      sourcePackagePath: input.sourcePackagePath,
      jsonSchema: buildResponseJsonSchema(base.sourceVideoId, input.sourcePackagePath)
    }
  };
  assertDistantConnectionLunaSourcePackageV002(value);
  return value;
}

export async function buildDistantConnectionLunaSourcePackageFromFilesV002(
  input: BuildDistantConnectionLunaSourcePackageFromFilesInputV002
): Promise<DistantConnectionLunaSourcePackageV002> {
  assertPath(input.semanticUtterancePath, '正式意味発話成果物のpath');
  assertPath(input.commentVelocityAnchorPath, 'コメント流量アンカー成果物のpath');
  assertPath(input.sourcePackagePath, 'Luna source packageのpath');
  assertPath(input.rejectedCandidateResponsePath, '人間不採用候補成果物のpath');
  assertPath(input.humanCandidateReviewResultPath, '人間candidate review結果のpath');
  assertPath(input.duplicateAuditPath, '重複照合記録のpath');
  for (const [index, prior] of input.priorCandidateResponses.entries()) {
    assertPath(prior.path, `既出候補${index + 1}件目のpath`);
  }
  const [
    semanticUtteranceBytes,
    commentVelocityAnchorBytes,
    rejectedCandidateResponseBytes,
    humanCandidateReviewResultBytes,
    duplicateAuditBytes,
    priorCandidateResponses
  ] = await Promise.all([
    readFile(path.join(input.workspaceRoot, input.semanticUtterancePath)),
    readFile(path.join(input.workspaceRoot, input.commentVelocityAnchorPath)),
    readFile(path.join(input.workspaceRoot, input.rejectedCandidateResponsePath)),
    readFile(path.join(input.workspaceRoot, input.humanCandidateReviewResultPath)),
    readFile(path.join(input.workspaceRoot, input.duplicateAuditPath)),
    Promise.all(input.priorCandidateResponses.map(async (prior) => ({
      ...prior,
      bytes: await readFile(path.join(input.workspaceRoot, prior.path))
    })))
  ]);
  return buildDistantConnectionLunaSourcePackageFromBytesV002({
    semanticUtterancePath: input.semanticUtterancePath,
    semanticUtteranceBytes,
    commentVelocityAnchorPath: input.commentVelocityAnchorPath,
    commentVelocityAnchorBytes,
    sourcePackagePath: input.sourcePackagePath,
    plannedExecution: input.plannedExecution,
    rejectedCandidateResponsePath: input.rejectedCandidateResponsePath,
    rejectedCandidateResponseBytes,
    expectedRejectedCandidateResponseSha256: input.expectedRejectedCandidateResponseSha256,
    humanCandidateReviewResultPath: input.humanCandidateReviewResultPath,
    humanCandidateReviewResultBytes,
    expectedHumanCandidateReviewResultSha256: input.expectedHumanCandidateReviewResultSha256,
    duplicateAuditPath: input.duplicateAuditPath,
    duplicateAuditBytes,
    expectedDuplicateAuditSha256: input.expectedDuplicateAuditSha256,
    priorCandidateResponses
  });
}

export function assertDistantConnectionLunaSourcePackageV002(
  value: unknown
): asserts value is DistantConnectionLunaSourcePackageV002 {
  if (!isRecord(value)
    || !hasExactKeys(value, [
      'schemaVersion',
      'sourceVideoId',
      'semanticUtteranceBinding',
      'commentVelocityAnchorBinding',
      'plannedExecution',
      'explorationTask',
      'learningContext',
      'utteranceCount',
      'anchorCount',
      'utterances',
      'anchors',
      'responseContract'
    ])
    || value.schemaVersion !== DISTANT_CONNECTION_LUNA_SOURCE_PACKAGE_SCHEMA_V002
    || typeof value.sourceVideoId !== 'string'
    || !SOURCE_VIDEO_ID.test(value.sourceVideoId)) {
    fail('SOURCE_PACKAGE_INVALID', 'Luna source package v002のroot構造が不正です');
  }
  assertFormalBinding(value.semanticUtteranceBinding, '正式意味発話binding');
  assertFormalBinding(value.commentVelocityAnchorBinding, 'コメント流量アンカーbinding');
  if (value.semanticUtteranceBinding.schemaVersion
      !== SEMANTIC_UTTERANCE_ARTIFACT_SCHEMA_V001
    || value.commentVelocityAnchorBinding.schemaVersion
      !== COMMENT_VELOCITY_ANCHOR_ARTIFACT_SCHEMA_V001) {
    fail('SOURCE_PACKAGE_INVALID', '入力bindingのschema版が不正です');
  }
  assertApprovedExecution(value.plannedExecution);
  if (!isRecord(value.explorationTask)
    || !hasExactKeys(value.explorationTask, [
      'objective', 'anchorInstruction', 'returnInstruction', 'boundaryMeaning'
    ])
    || JSON.stringify(value.explorationTask) !== JSON.stringify(EXPLORATION_TASK_V002)) {
    fail('SOURCE_PACKAGE_INVALID', '遠方接続の探索条件がv002正式定義と一致しません');
  }
  if (!Number.isSafeInteger(value.utteranceCount) || (value.utteranceCount as number) < 1
    || !Number.isSafeInteger(value.anchorCount) || (value.anchorCount as number) < 1
    || !Array.isArray(value.utterances) || value.utterances.length !== value.utteranceCount
    || !Array.isArray(value.anchors) || value.anchors.length !== value.anchorCount) {
    fail('SOURCE_PACKAGE_INVALID', '正式意味発話またはアンカー件数が不正です');
  }
  const ordinalById = new Map<string, number>();
  for (const [index, utterance] of value.utterances.entries()) {
    if (!isRecord(utterance)
      || !hasExactKeys(utterance, [
        'utteranceId', 'ordinal', 'text', 'sourceStartMs', 'sourceEndMs', 'sourceSegmentIds'
      ])
      || utterance.utteranceId !== `semantic-utterance-${String(index + 1).padStart(6, '0')}`
      || utterance.ordinal !== index + 1
      || typeof utterance.text !== 'string'
      || utterance.text.length === 0
      || !Number.isSafeInteger(utterance.sourceStartMs)
      || (utterance.sourceStartMs as number) < 0
      || !Number.isSafeInteger(utterance.sourceEndMs)
      || (utterance.sourceEndMs as number) < (utterance.sourceStartMs as number)
      || !Array.isArray(utterance.sourceSegmentIds)
      || utterance.sourceSegmentIds.length === 0
      || utterance.sourceSegmentIds.some(
        (id) => !Number.isSafeInteger(id) || (id as number) <= 0
      )) {
      fail('SOURCE_PACKAGE_INVALID', `正式意味発話${index + 1}件目が不正です`);
    }
    ordinalById.set(utterance.utteranceId as string, utterance.ordinal as number);
  }
  const anchorIds = new Set<string>();
  const anchorSemanticUtteranceIdById = new Map<string, string>();
  for (const [index, anchor] of value.anchors.entries()) {
    if (!isRecord(anchor)
      || !hasExactKeys(anchor, ['anchorId', 'semanticUtteranceId'])
      || typeof anchor.anchorId !== 'string'
      || !FORMAL_ID.test(anchor.anchorId)
      || anchorIds.has(anchor.anchorId)
      || typeof anchor.semanticUtteranceId !== 'string'
      || !ordinalById.has(anchor.semanticUtteranceId)) {
      fail('SOURCE_PACKAGE_INVALID', `コメント流量アンカー${index + 1}件目が不正です`);
    }
    anchorIds.add(anchor.anchorId);
    anchorSemanticUtteranceIdById.set(
      anchor.anchorId as string,
      anchor.semanticUtteranceId as string
    );
  }
  assertLearningContext(value.learningContext, ordinalById, anchorSemanticUtteranceIdById);
  if (!isRecord(value.responseContract)
    || !hasExactKeys(value.responseContract, ['schemaVersion', 'sourcePackagePath', 'jsonSchema'])
    || value.responseContract.schemaVersion !== DISTANT_CONNECTION_LUNA_RESPONSE_SCHEMA_V001) {
    fail('SOURCE_PACKAGE_INVALID', '返答契約が不正です');
  }
  assertPath(value.responseContract.sourcePackagePath, 'source package path');
  if (JSON.stringify(value.responseContract.jsonSchema)
    !== JSON.stringify(buildResponseJsonSchema(
      value.sourceVideoId,
      value.responseContract.sourcePackagePath
    ))) {
    fail('SOURCE_PACKAGE_INVALID', '返答JSON Schemaがv002 source packageからの導出値と一致しません');
  }
}

function assertLearningContext(
  value: unknown,
  ordinalById: Map<string, number>,
  anchorSemanticUtteranceIdById: Map<string, string>
): asserts value is DistantConnectionLunaLearningContextV002 {
  if (!isRecord(value)
    || !hasExactKeys(value, [
      'humanCandidateReviewResultBinding',
      'duplicateAuditBinding',
      'humanVerdict',
      'rejectionPrimaryCause',
      'rejectionReason',
      'selectionStatus',
      'rejectedCandidate',
      'priorUseCount',
      'priorCandidateUses'
    ])) {
    fail('SOURCE_PACKAGE_INVALID', 'learning contextのroot構造が不正です');
  }
  assertFormalBinding(value.humanCandidateReviewResultBinding, '人間candidate review結果binding');
  assertFormalBinding(value.duplicateAuditBinding, '重複照合binding');
  if (value.humanCandidateReviewResultBinding.schemaVersion
      !== DISTANT_CONNECTION_CANDIDATE_HUMAN_REVIEW_RESULT_SCHEMA_V001
    || value.duplicateAuditBinding.schemaVersion
      !== DISTANT_CONNECTION_CANDIDATE_DUPLICATE_AUDIT_SCHEMA_V001
    || value.humanVerdict !== 'rejected'
    || value.rejectionPrimaryCause !== 'candidate-selection'
    || typeof value.rejectionReason !== 'string'
    || value.rejectionReason.trim().length === 0
    || value.selectionStatus !== 'not-selected'
    || value.priorUseCount !== DISTANT_CONNECTION_REJECTED_FIRST_PART_PRIOR_USE_COUNT_V002
    || !Array.isArray(value.priorCandidateUses)
    || value.priorCandidateUses.length
      !== DISTANT_CONNECTION_REJECTED_FIRST_PART_PRIOR_USE_COUNT_V002) {
    fail('SOURCE_PACKAGE_INVALID', 'learning contextの正式値または件数が不正です');
  }
  assertCandidateShape(value.rejectedCandidate, '人間不採用候補', 'SOURCE_PACKAGE_INVALID');
  assertCandidateAgainstSource(
    value.rejectedCandidate,
    '人間不採用候補',
    ordinalById,
    anchorSemanticUtteranceIdById,
    'SOURCE_PACKAGE_INVALID'
  );
  const seenUses = new Set<string>();
  for (const [index, use] of value.priorCandidateUses.entries()) {
    if (!isRecord(use)
      || !hasExactKeys(use, ['candidateId', 'candidateResponseBinding'])
      || typeof use.candidateId !== 'string'
      || !FORMAL_ID.test(use.candidateId)) {
      fail('SOURCE_PACKAGE_INVALID', `既出候補利用${index + 1}件目が不正です`);
    }
    assertFormalBinding(use.candidateResponseBinding, `既出候補利用${index + 1}件目のbinding`);
    if (use.candidateResponseBinding.schemaVersion !== DISTANT_CONNECTION_LUNA_RESPONSE_SCHEMA_V001) {
      fail('SOURCE_PACKAGE_INVALID', `既出候補利用${index + 1}件目のschema版が不正です`);
    }
    const identity = JSON.stringify([use.candidateResponseBinding.path, use.candidateId]);
    if (seenUses.has(identity)) fail('SOURCE_PACKAGE_INVALID', '既出候補利用が重複しています');
    seenUses.add(identity);
  }
}

export function serializeDistantConnectionLunaSourcePackageV002(
  value: DistantConnectionLunaSourcePackageV002
): Buffer {
  assertDistantConnectionLunaSourcePackageV002(value);
  return Buffer.from(`${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

export function decodeDistantConnectionLunaSourcePackageV002(
  bytes: Uint8Array
): DistantConnectionLunaSourcePackageV002 {
  let value: unknown;
  try {
    value = JSON.parse(Buffer.from(bytes).toString('utf8'));
  } catch (error) {
    fail('SOURCE_PACKAGE_INVALID', 'Luna source package v002がJSONとして読めません', error);
  }
  assertDistantConnectionLunaSourcePackageV002(value);
  return value;
}

export function validateDistantConnectionLunaSourcePackageAgainstInputsV002(
  value: DistantConnectionLunaSourcePackageV002,
  input: BuildDistantConnectionLunaSourcePackageFromBytesInputV002
): void {
  assertDistantConnectionLunaSourcePackageV002(value);
  const rebuilt = buildDistantConnectionLunaSourcePackageFromBytesV002(input);
  if (!serializeDistantConnectionLunaSourcePackageV002(value)
    .equals(serializeDistantConnectionLunaSourcePackageV002(rebuilt))) {
    fail('SOURCE_INPUT_MISMATCH', 'source package v002が全入力からの決定的再構築結果と一致しません');
  }
}

function assertOrderedResponseUtteranceIds(
  ids: unknown,
  label: '前半' | '後半',
  ordinalById: Map<string, number>
): asserts ids is string[] {
  const emptyCode = label === '前半' ? 'EMPTY_FIRST_PART' : 'EMPTY_SECOND_PART';
  if (!Array.isArray(ids)) {
    fail('RESPONSE_INVALID', `${label}の正式意味発話ID群が配列ではありません`);
  }
  if (ids.length === 0) fail(emptyCode, `${label}の正式意味発話ID群が空です`);
  const seen = new Set<string>();
  let previousOrdinal = 0;
  for (const id of ids) {
    if (typeof id !== 'string' || !ordinalById.has(id)) {
      fail('UNKNOWN_UTTERANCE_ID', `${label}が未知の正式意味発話IDを参照しています`);
    }
    if (seen.has(id)) fail('UTTERANCE_DUPLICATE', `${label}に同じ正式意味発話IDがあります`);
    const ordinal = ordinalById.get(id)!;
    if (ordinal <= previousOrdinal) {
      fail('UTTERANCE_ORDER_REVERSED', `${label}の正式意味発話IDが時系列順ではありません`);
    }
    seen.add(id);
    previousOrdinal = ordinal;
  }
}

export function validateDistantConnectionLunaResponseV002(
  response: unknown,
  input: ValidateDistantConnectionLunaResponseInputV002
): asserts response is DistantConnectionLunaResponseV002 {
  assertPath(input.sourcePackagePath, '検査対象source package path');
  const sourcePackage = decodeDistantConnectionLunaSourcePackageV002(input.sourcePackageBytes);
  if (sourcePackage.responseContract.sourcePackagePath !== input.sourcePackagePath) {
    fail('SOURCE_PACKAGE_BINDING_MISMATCH', '検査対象source package pathが返答契約と一致しません');
  }
  if (!isRecord(response)
    || !hasExactKeys(response, [
      'schemaVersion', 'sourceVideoId', 'sourcePackageBinding', 'candidates'
    ])
    || response.schemaVersion !== DISTANT_CONNECTION_LUNA_RESPONSE_SCHEMA_V001
    || typeof response.sourceVideoId !== 'string'
    || !SOURCE_VIDEO_ID.test(response.sourceVideoId)
    || !Array.isArray(response.candidates)) {
    fail('RESPONSE_INVALID', 'Luna返答のroot構造またはschema版が不正です');
  }
  if (response.sourceVideoId !== sourcePackage.sourceVideoId) {
    fail('SOURCE_VIDEO_MISMATCH', 'Luna返答の元動画がsource packageと一致しません');
  }
  assertFormalBinding(response.sourcePackageBinding, 'Luna source package binding', 'RESPONSE_INVALID');
  if (response.sourcePackageBinding.path !== input.sourcePackagePath
    || response.sourcePackageBinding.schemaVersion
      !== DISTANT_CONNECTION_LUNA_SOURCE_PACKAGE_SCHEMA_V002) {
    fail('SOURCE_PACKAGE_BINDING_MISMATCH', 'Luna返答が束縛するsource package pathまたは版が一致しません');
  }
  if (response.sourcePackageBinding.fileSha256 !== sha256(input.sourcePackageBytes)) {
    fail('SOURCE_PACKAGE_SHA_MISMATCH', 'Luna返答が束縛するsource package SHA-256が一致しません');
  }

  const ordinalById = new Map(
    sourcePackage.utterances.map((utterance) => [utterance.utteranceId, utterance.ordinal])
  );
  const anchorById = new Map(sourcePackage.anchors.map((anchor) => [anchor.anchorId, anchor]));
  const seenCandidateIds = new Set<string>();
  for (const [index, candidate] of response.candidates.entries()) {
    if (!isRecord(candidate)
      || !hasExactKeys(candidate, [
        'candidateId',
        'anchorId',
        'firstPartSemanticUtteranceIds',
        'secondPartSemanticUtteranceIds',
        'addedUnderstanding',
        'direction'
      ])
      || typeof candidate.candidateId !== 'string'
      || !FORMAL_ID.test(candidate.candidateId)
      || seenCandidateIds.has(candidate.candidateId)
      || typeof candidate.anchorId !== 'string'
      || typeof candidate.addedUnderstanding !== 'string'
      || candidate.addedUnderstanding.length === 0
      || (candidate.direction !== 'past' && candidate.direction !== 'future')) {
      fail('RESPONSE_INVALID', `候補${index + 1}件目の構造または値が不正です`);
    }
    const anchor = anchorById.get(candidate.anchorId);
    if (!anchor) {
      fail('UNKNOWN_ANCHOR_ID', `候補${candidate.candidateId}が未知のアンカーを参照しています`);
    }
    assertOrderedResponseUtteranceIds(
      candidate.firstPartSemanticUtteranceIds,
      '前半',
      ordinalById
    );
    assertOrderedResponseUtteranceIds(
      candidate.secondPartSemanticUtteranceIds,
      '後半',
      ordinalById
    );
    const firstIds = candidate.firstPartSemanticUtteranceIds;
    const secondIds = candidate.secondPartSemanticUtteranceIds;
    const firstSet = new Set(firstIds);
    if (secondIds.some((id) => firstSet.has(id))) {
      fail('UTTERANCE_DUPLICATE', `候補${candidate.candidateId}の前半と後半に同じ発話があります`);
    }
    const finalFirstOrdinal = ordinalById.get(firstIds[firstIds.length - 1]!)!;
    const initialSecondOrdinal = ordinalById.get(secondIds[0]!)!;
    if (finalFirstOrdinal >= initialSecondOrdinal) {
      fail('UTTERANCE_ORDER_REVERSED', `候補${candidate.candidateId}の前半と後半が時系列順ではありません`);
    }
    const anchorInExpectedPart = candidate.direction === 'past'
      ? secondIds.includes(anchor.semanticUtteranceId)
      : firstIds.includes(anchor.semanticUtteranceId);
    if (!anchorInExpectedPart) {
      fail('ANCHOR_DIRECTION_MISMATCH', `候補${candidate.candidateId}の方向とアンカー側が一致しません`);
    }
    seenCandidateIds.add(candidate.candidateId);
  }
}

export function decodeDistantConnectionLunaResponseV002(
  bytes: Uint8Array,
  input: ValidateDistantConnectionLunaResponseInputV002
): DistantConnectionLunaResponseV002 {
  let value: unknown;
  try {
    value = JSON.parse(Buffer.from(bytes).toString('utf8'));
  } catch (error) {
    fail('RESPONSE_INVALID', 'Luna返答がJSONとして読めません', error);
  }
  validateDistantConnectionLunaResponseV002(value, input);
  return value;
}

export async function writeDistantConnectionLunaSourcePackageFromFilesV002(
  input: WriteDistantConnectionLunaSourcePackageFromFilesInputV002
): Promise<{sourcePackage: DistantConnectionLunaSourcePackageV002; bytes: Buffer}> {
  assertPath(input.outputPath, '出力path');
  if (input.outputPath !== input.sourcePackagePath) {
    fail('SOURCE_PACKAGE_INVALID', '出力pathと返答契約のsource package pathが一致しません');
  }
  const sourcePackage = await buildDistantConnectionLunaSourcePackageFromFilesV002(input);
  const bytes = serializeDistantConnectionLunaSourcePackageV002(sourcePackage);
  const absoluteOutputPath = path.join(input.workspaceRoot, input.outputPath);
  await mkdir(path.dirname(absoluteOutputPath), {recursive: true});
  await writeFile(absoluteOutputPath, bytes, {flag: 'wx'});
  return {sourcePackage, bytes};
}
