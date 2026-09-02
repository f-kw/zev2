import {createHash} from 'node:crypto';
import {createReadStream} from 'node:fs';
import {mkdir, readFile, writeFile} from 'node:fs/promises';
import path from 'node:path';

import {
  DISTANT_CONNECTION_CANDIDATE_REVIEW_RESULT_SCHEMA_V002,
  assertDistantConnectionCandidateReviewResultV002,
  serializeDistantConnectionCandidateReviewResultV002,
  type DistantConnectionCandidateReviewResultV002
} from './distant-connection-candidate-review-v002.js';
import {
  DISTANT_CONNECTION_COMPARISON_CANDIDATE_RESPONSE_SCHEMA_V001,
  type DistantConnectionComparisonCandidateResponseV001
} from './distant-connection-comparison-luna-b6-result-v001.js';

export const DISTANT_CONNECTION_PLEASANT_VIDEO_OBSERVATION_PLAN_SCHEMA_V001 =
  'distant-connection-pleasant-video-observation-plan-v001';
export const DISTANT_CONNECTION_PLEASANT_VIDEO_OBSERVATION_RESULT_SCHEMA_V001 =
  'distant-connection-pleasant-video-observation-result-v001';

export const DISTANT_CONNECTION_PLEASANT_VIDEO_OBSERVATION_VERDICTS_V001 = Object.freeze([
  'good',
  'not-good',
  'unsure'
] as const);

export const DISTANT_CONNECTION_PLEASANT_VIDEO_OBSERVATION_RESPONSIBILITY_V001 =
  '本成果物は旧方式で生成された正式候補を新設計前の観測材料として人間が実動画で一周し、良い・良くない・分からないの三値だけを保存する。理由、意味的接続、回収強度、映像適性、接続型、区間化、点数、順位、正式selection、永久禁止、強い正例への昇格を所有しない。';

type RecordValue = Record<string, unknown>;

export type PleasantVideoObservationVerdictV001 =
  typeof DISTANT_CONNECTION_PLEASANT_VIDEO_OBSERVATION_VERDICTS_V001[number];

export type PleasantVideoObservationFormalBindingV001 = {
  path: string;
  schemaVersion: string;
  fileSha256: string;
};

export type PleasantVideoObservationMediaBindingV001 = {
  path: string;
  fileSha256: string;
};

export type PleasantVideoObservationReviewerV001 = {
  kind: 'human';
  reviewerId: 'kawafmm';
};

export type PleasantVideoObservationCandidateV001 = {
  candidateId: string;
  candidateOrdinal: number;
  reviewMedia: {
    secondOnly: PleasantVideoObservationMediaBindingV001;
    firstThenSecond: PleasantVideoObservationMediaBindingV001;
  };
};

export type DistantConnectionPleasantVideoObservationPlanV001 = {
  schemaVersion: typeof DISTANT_CONNECTION_PLEASANT_VIDEO_OBSERVATION_PLAN_SCHEMA_V001;
  planId: string;
  sourceVideoId: string;
  sourceBindings: {
    candidateResponse: PleasantVideoObservationFormalBindingV001;
    candidateReviewResult: PleasantVideoObservationFormalBindingV001;
  };
  reviewer: PleasantVideoObservationReviewerV001;
  candidateCount: number;
  candidates: PleasantVideoObservationCandidateV001[];
  allowedVerdicts: ['good', 'not-good', 'unsure'];
  evaluationOrder: ['second-only', 'first-then-second', 'verdict'];
  responsibilityPrinciple: string;
};

export type PleasantVideoObservationCandidateResultV001 =
  PleasantVideoObservationCandidateV001 & {
    verdict: PleasantVideoObservationVerdictV001;
  };

export type DistantConnectionPleasantVideoObservationResultV001 = {
  schemaVersion: typeof DISTANT_CONNECTION_PLEASANT_VIDEO_OBSERVATION_RESULT_SCHEMA_V001;
  resultId: string;
  sourceVideoId: string;
  sourceBindings: {
    candidateResponse: PleasantVideoObservationFormalBindingV001;
    candidateReviewResult: PleasantVideoObservationFormalBindingV001;
    reviewPlan: PleasantVideoObservationFormalBindingV001;
  };
  reviewer: PleasantVideoObservationReviewerV001;
  candidateCount: number;
  candidateObservations: PleasantVideoObservationCandidateResultV001[];
  completionStatus: 'complete';
  responsibilityPrinciple: string;
};

export type PleasantVideoObservationObservedMediaV001 = {
  candidateId: string;
  secondOnlySha256: string;
  firstThenSecondSha256: string;
};

export type BuildDistantConnectionPleasantVideoObservationPlanInputV001 = {
  planId: string;
  candidateResponsePath: string;
  candidateResponseBytes: Uint8Array;
  expectedCandidateResponseSha256: string;
  candidateReviewResultPath: string;
  candidateReviewResultBytes: Uint8Array;
  expectedCandidateReviewResultSha256: string;
  reviewer: PleasantVideoObservationReviewerV001;
  observedMedia: PleasantVideoObservationObservedMediaV001[];
};

export type BuildDistantConnectionPleasantVideoObservationPlanFromFilesInputV001 = Omit<
  BuildDistantConnectionPleasantVideoObservationPlanInputV001,
  'candidateResponseBytes' | 'candidateReviewResultBytes' | 'observedMedia'
> & {
  workspaceRoot: string;
};

export type BuildDistantConnectionPleasantVideoObservationResultInputV001 = {
  resultId: string;
  reviewPlanPath: string;
  reviewPlanBytes: Uint8Array;
  expectedReviewPlanSha256: string;
  candidateVerdicts: Array<{
    candidateId: string;
    verdict: PleasantVideoObservationVerdictV001;
  }>;
};

export type WriteDistantConnectionPleasantVideoObservationPackageInputV001 =
  BuildDistantConnectionPleasantVideoObservationPlanFromFilesInputV001 & {
    outputRoot: string;
    resultId: string;
  };

export class DistantConnectionPleasantVideoObservationErrorV001 extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DistantConnectionPleasantVideoObservationErrorV001';
  }
}

const SHA256 = /^[0-9a-f]{64}$/u;
const FORMAL_ID = /^[A-Za-z0-9][A-Za-z0-9._-]*$/u;
const CANDIDATE_ID = /^candidate-[0-9a-f]{64}$/u;
const WORKSPACE_PATH =
  /^(?!\/)(?!\.\/)(?!.*(?:^|\/)\.\.(?:\/|$))(?!.*\\)(?!.*\/\/)[^\0]+$/u;

function fail(message: string): never {
  throw new DistantConnectionPleasantVideoObservationErrorV001(message);
}

function isRecord(value: unknown): value is RecordValue {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function exactKeys(value: RecordValue, keys: readonly string[]): boolean {
  const actual = Object.keys(value);
  return actual.length === keys.length && actual.every((key, index) => key === keys[index]);
}

function sha256(bytes: Uint8Array): string {
  return createHash('sha256').update(bytes).digest('hex');
}

async function sha256File(filePath: string): Promise<string> {
  const hash = createHash('sha256');
  for await (const chunk of createReadStream(filePath)) hash.update(chunk as Buffer);
  return hash.digest('hex');
}

function formalBytes(value: unknown): Buffer {
  return Buffer.from(`${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function parseJson(bytes: Uint8Array, label: string): unknown {
  try {
    return JSON.parse(Buffer.from(bytes).toString('utf8')) as unknown;
  } catch {
    fail(`${label}がJSONとして読めません`);
  }
}

function assertId(value: unknown, label: string): asserts value is string {
  if (typeof value !== 'string' || !FORMAL_ID.test(value)) fail(`${label}が不正です`);
}

function assertCandidateId(value: unknown, label: string): asserts value is string {
  if (typeof value !== 'string' || !CANDIDATE_ID.test(value)) fail(`${label}が不正です`);
}

function assertWorkspacePath(value: unknown, label: string): asserts value is string {
  if (typeof value !== 'string' || !WORKSPACE_PATH.test(value)) {
    fail(`${label}は安全なworkspace相対pathではありません`);
  }
}

function assertSha(value: unknown, label: string): asserts value is string {
  if (typeof value !== 'string' || !SHA256.test(value)) fail(`${label}が不正です`);
}

function checkedSha(bytes: Uint8Array, expected: string, label: string): string {
  assertSha(expected, `${label}の指定SHA-256`);
  const actual = sha256(bytes);
  if (actual !== expected) fail(`${label}のSHA-256が指定正本と一致しません`);
  return actual;
}

function assertReviewer(value: unknown): asserts value is PleasantVideoObservationReviewerV001 {
  if (!isRecord(value)
    || !exactKeys(value, ['kind', 'reviewerId'])
    || value.kind !== 'human'
    || value.reviewerId !== 'kawafmm') {
    fail('評価者はhuman/kawafmmである必要があります');
  }
}

function assertFormalBinding(
  value: unknown,
  expectedSchemaVersion: string,
  label: string
): asserts value is PleasantVideoObservationFormalBindingV001 {
  if (!isRecord(value)
    || !exactKeys(value, ['path', 'schemaVersion', 'fileSha256'])
    || value.schemaVersion !== expectedSchemaVersion) {
    fail(`${label}の構造またはschemaが不正です`);
  }
  assertWorkspacePath(value.path, `${label} path`);
  assertSha(value.fileSha256, `${label} SHA-256`);
}

function assertMediaBinding(
  value: unknown,
  label: string
): asserts value is PleasantVideoObservationMediaBindingV001 {
  if (!isRecord(value) || !exactKeys(value, ['path', 'fileSha256'])) {
    fail(`${label}の構造が不正です`);
  }
  assertWorkspacePath(value.path, `${label} path`);
  assertSha(value.fileSha256, `${label} SHA-256`);
}

function assertCandidate(
  value: unknown,
  index: number
): asserts value is PleasantVideoObservationCandidateV001 {
  if (!isRecord(value)
    || !exactKeys(value, ['candidateId', 'candidateOrdinal', 'reviewMedia'])
    || value.candidateOrdinal !== index + 1
    || !isRecord(value.reviewMedia)
    || !exactKeys(value.reviewMedia, ['secondOnly', 'firstThenSecond'])) {
    fail(`候補${index + 1}件目の構造または順序が不正です`);
  }
  assertCandidateId(value.candidateId, `候補${index + 1}件目のID`);
  assertMediaBinding(value.reviewMedia.secondOnly, `候補${index + 1}件目の後半だけ動画`);
  assertMediaBinding(
    value.reviewMedia.firstThenSecond,
    `候補${index + 1}件目の前半から後半動画`
  );
  if (!value.reviewMedia.secondOnly.path.endsWith('.mp4')
    || !value.reviewMedia.firstThenSecond.path.endsWith('.mp4')) {
    fail(`候補${index + 1}件目の確認媒体はMP4である必要があります`);
  }
}

function decodeCandidateReviewResult(
  bytes: Uint8Array
): DistantConnectionCandidateReviewResultV002 {
  const value = parseJson(bytes, '候補確認動画結果');
  try {
    assertDistantConnectionCandidateReviewResultV002(value);
  } catch (error) {
    fail(`候補確認動画結果が正式契約へ不適合です: ${
      error instanceof Error ? error.message : String(error)
    }`);
  }
  if (!serializeDistantConnectionCandidateReviewResultV002(value)
    .equals(Buffer.from(bytes))) {
    fail('候補確認動画結果がcanonical formal byteではありません');
  }
  return value;
}

function decodeCandidateResponseForObservation(
  bytes: Uint8Array
): DistantConnectionComparisonCandidateResponseV001 {
  const value = parseJson(bytes, '正式候補');
  if (!isRecord(value)
    || !exactKeys(value, [
      'schemaVersion', 'sourceVideoId', 'sourcePackageBinding', 'indexedModelInputBinding',
      'rawResponseBinding', 'candidates'
    ])
    || value.schemaVersion !== DISTANT_CONNECTION_COMPARISON_CANDIDATE_RESPONSE_SCHEMA_V001
    || !Array.isArray(value.candidates)) {
    fail('正式候補のroot構造またはschemaが不正です');
  }
  assertId(value.sourceVideoId, '正式候補の元動画ID');
  assertFormalBinding(value.sourcePackageBinding, 'distant-connection-comparison-source-package-v001', 'source package binding');
  assertFormalBinding(value.indexedModelInputBinding, 'distant-connection-comparison-indexed-model-input-v001', 'index入力binding');
  assertFormalBinding(value.rawResponseBinding, 'openai-responses-distant-connection-comparison-raw-v001', 'raw応答binding');
  const ids = new Set<string>();
  for (const [index, candidate] of value.candidates.entries()) {
    if (!isRecord(candidate)
      || !exactKeys(candidate, [
        'candidateId', 'anchorId', 'firstPartUtteranceIds', 'secondPartUtteranceIds',
        'addedUnderstanding', 'direction'
      ])
      || typeof candidate.anchorId !== 'string'
      || candidate.anchorId.length === 0
      || !Array.isArray(candidate.firstPartUtteranceIds)
      || !Array.isArray(candidate.secondPartUtteranceIds)
      || candidate.firstPartUtteranceIds.length === 0
      || candidate.secondPartUtteranceIds.length === 0
      || [...candidate.firstPartUtteranceIds, ...candidate.secondPartUtteranceIds]
        .some((utteranceId) => typeof utteranceId !== 'string' || utteranceId.length === 0)
      || typeof candidate.addedUnderstanding !== 'string'
      || candidate.addedUnderstanding.trim().length === 0
      || (candidate.direction !== 'past' && candidate.direction !== 'future')) {
      fail(`正式候補${index + 1}件目の構造が不正です`);
    }
    assertCandidateId(candidate.candidateId, `正式候補${index + 1}件目のID`);
    if (ids.has(candidate.candidateId)) fail('正式候補のcandidate IDが重複しています');
    ids.add(candidate.candidateId);
  }
  if (!formalBytes(value).equals(Buffer.from(bytes))) {
    fail('正式候補がcanonical formal byteではありません');
  }
  return value as DistantConnectionComparisonCandidateResponseV001;
}

function inspectPlanSources(
  input: BuildDistantConnectionPleasantVideoObservationPlanInputV001
): {
  sourceVideoId: string;
  candidateResponseSha256: string;
  candidateReviewResultSha256: string;
  candidates: PleasantVideoObservationCandidateV001[];
} {
  assertId(input.planId, '観測plan ID');
  assertWorkspacePath(input.candidateResponsePath, '正式候補path');
  assertWorkspacePath(input.candidateReviewResultPath, '候補確認動画結果path');
  assertReviewer(input.reviewer);

  const candidateResponseSha256 = checkedSha(
    input.candidateResponseBytes,
    input.expectedCandidateResponseSha256,
    '正式候補'
  );
  const candidateReviewResultSha256 = checkedSha(
    input.candidateReviewResultBytes,
    input.expectedCandidateReviewResultSha256,
    '候補確認動画結果'
  );
  const candidateResponse = decodeCandidateResponseForObservation(input.candidateResponseBytes);
  const candidateReviewResult = decodeCandidateReviewResult(input.candidateReviewResultBytes);

  if (candidateReviewResult.sourceVideoId !== candidateResponse.sourceVideoId) {
    fail('正式候補と候補確認動画結果のsourceVideoIdが一致しません');
  }
  if (candidateReviewResult.candidateResponseBinding.path !== input.candidateResponsePath
    || candidateReviewResult.candidateResponseBinding.fileSha256 !== candidateResponseSha256
    || candidateReviewResult.candidateResponseBinding.schemaVersion
      !== DISTANT_CONNECTION_COMPARISON_CANDIDATE_RESPONSE_SCHEMA_V001) {
    fail('候補確認動画結果が指定正式候補をpath/SHA/schemaで束縛していません');
  }
  if (candidateResponse.candidates.length !== 7) {
    fail('今回の観測対象は正式候補7件である必要があります');
  }
  if (candidateReviewResult.candidates.length !== candidateResponse.candidates.length
    || input.observedMedia.length !== candidateResponse.candidates.length) {
    fail('候補確認動画または実動画SHA観測が正式候補7件を完全被覆していません');
  }

  const observedIds = new Set<string>();
  const observedVideoPaths = new Set<string>();
  const candidates = candidateResponse.candidates.map((candidate, index) => {
    const review = candidateReviewResult.candidates[index];
    const observed = input.observedMedia[index];
    if (review === undefined
      || observed === undefined
      || review.candidateId !== candidate.candidateId
      || review.candidateOrdinal !== index + 1
      || observed.candidateId !== candidate.candidateId) {
      fail(`候補${index + 1}件目のIDまたは順序が正本間で一致しません`);
    }
    if (observedIds.has(observed.candidateId)) fail('実動画SHA観測のcandidate IDが重複しています');
    observedIds.add(observed.candidateId);
    assertSha(observed.secondOnlySha256, `候補${index + 1}件目の後半だけ実測SHA-256`);
    assertSha(
      observed.firstThenSecondSha256,
      `候補${index + 1}件目の前半から後半実測SHA-256`
    );
    const secondOnly = review.reviewArtifacts.secondOnly.videoBinding;
    const firstThenSecond = review.reviewArtifacts.firstThenSecond.videoBinding;
    const secondOnlyParts = review.reviewArtifacts.secondOnly.evaluatedParts;
    const firstThenSecondParts = review.reviewArtifacts.firstThenSecond.evaluatedParts;
    if (secondOnlyParts.length !== 1
      || secondOnlyParts[0]?.part !== 'second'
      || JSON.stringify(secondOnlyParts[0].selectedUtteranceIds)
        !== JSON.stringify(candidate.secondPartUtteranceIds)
      || firstThenSecondParts.length !== 2
      || firstThenSecondParts[0]?.part !== 'first'
      || firstThenSecondParts[1]?.part !== 'second'
      || JSON.stringify(firstThenSecondParts[0].selectedUtteranceIds)
        !== JSON.stringify(candidate.firstPartUtteranceIds)
      || JSON.stringify(firstThenSecondParts[1].selectedUtteranceIds)
        !== JSON.stringify(candidate.secondPartUtteranceIds)) {
      fail(`候補${index + 1}件目の確認動画が正式候補の前半・後半発話を同じ順序で保持していません`);
    }
    if (!secondOnly.path.endsWith('.mp4') || !firstThenSecond.path.endsWith('.mp4')) {
      fail(`候補${index + 1}件目の確認媒体がMP4ではありません`);
    }
    if (observedVideoPaths.has(secondOnly.path)
      || observedVideoPaths.has(firstThenSecond.path)
      || secondOnly.path === firstThenSecond.path) {
      fail('候補確認動画pathが重複しています');
    }
    observedVideoPaths.add(secondOnly.path);
    observedVideoPaths.add(firstThenSecond.path);
    if (secondOnly.fileSha256 !== observed.secondOnlySha256
      || firstThenSecond.fileSha256 !== observed.firstThenSecondSha256) {
      fail(`候補${index + 1}件目の既存確認動画SHAが実byteと一致しません`);
    }
    return {
      candidateId: candidate.candidateId,
      candidateOrdinal: index + 1,
      reviewMedia: {
        secondOnly: {...secondOnly},
        firstThenSecond: {...firstThenSecond}
      }
    };
  });

  return {
    sourceVideoId: candidateResponse.sourceVideoId,
    candidateResponseSha256,
    candidateReviewResultSha256,
    candidates
  };
}

export function buildDistantConnectionPleasantVideoObservationPlanV001(
  input: BuildDistantConnectionPleasantVideoObservationPlanInputV001
): DistantConnectionPleasantVideoObservationPlanV001 {
  const sources = inspectPlanSources(input);
  return {
    schemaVersion: DISTANT_CONNECTION_PLEASANT_VIDEO_OBSERVATION_PLAN_SCHEMA_V001,
    planId: input.planId,
    sourceVideoId: sources.sourceVideoId,
    sourceBindings: {
      candidateResponse: {
        path: input.candidateResponsePath,
        schemaVersion: DISTANT_CONNECTION_COMPARISON_CANDIDATE_RESPONSE_SCHEMA_V001,
        fileSha256: sources.candidateResponseSha256
      },
      candidateReviewResult: {
        path: input.candidateReviewResultPath,
        schemaVersion: DISTANT_CONNECTION_CANDIDATE_REVIEW_RESULT_SCHEMA_V002,
        fileSha256: sources.candidateReviewResultSha256
      }
    },
    reviewer: {...input.reviewer},
    candidateCount: sources.candidates.length,
    candidates: sources.candidates,
    allowedVerdicts: ['good', 'not-good', 'unsure'],
    evaluationOrder: ['second-only', 'first-then-second', 'verdict'],
    responsibilityPrinciple: DISTANT_CONNECTION_PLEASANT_VIDEO_OBSERVATION_RESPONSIBILITY_V001
  };
}

export function assertDistantConnectionPleasantVideoObservationPlanV001(
  value: unknown
): asserts value is DistantConnectionPleasantVideoObservationPlanV001 {
  if (!isRecord(value)
    || !exactKeys(value, [
      'schemaVersion', 'planId', 'sourceVideoId', 'sourceBindings', 'reviewer',
      'candidateCount', 'candidates', 'allowedVerdicts', 'evaluationOrder',
      'responsibilityPrinciple'
    ])
    || value.schemaVersion !== DISTANT_CONNECTION_PLEASANT_VIDEO_OBSERVATION_PLAN_SCHEMA_V001
    || !isRecord(value.sourceBindings)
    || !exactKeys(value.sourceBindings, ['candidateResponse', 'candidateReviewResult'])
    || !Number.isSafeInteger(value.candidateCount)
    || value.candidateCount !== 7
    || !Array.isArray(value.candidates)
    || value.candidates.length !== value.candidateCount
    || !Array.isArray(value.allowedVerdicts)
    || JSON.stringify(value.allowedVerdicts) !== JSON.stringify(['good', 'not-good', 'unsure'])
    || !Array.isArray(value.evaluationOrder)
    || JSON.stringify(value.evaluationOrder)
      !== JSON.stringify(['second-only', 'first-then-second', 'verdict'])
    || value.responsibilityPrinciple
      !== DISTANT_CONNECTION_PLEASANT_VIDEO_OBSERVATION_RESPONSIBILITY_V001) {
    fail('三値観測planのroot構造・固定条件・責務が不正です');
  }
  assertId(value.planId, '観測plan ID');
  assertId(value.sourceVideoId, '観測元動画ID');
  assertFormalBinding(
    value.sourceBindings.candidateResponse,
    DISTANT_CONNECTION_COMPARISON_CANDIDATE_RESPONSE_SCHEMA_V001,
    '正式候補binding'
  );
  assertFormalBinding(
    value.sourceBindings.candidateReviewResult,
    DISTANT_CONNECTION_CANDIDATE_REVIEW_RESULT_SCHEMA_V002,
    '候補確認動画結果binding'
  );
  assertReviewer(value.reviewer);
  const ids = new Set<string>();
  const mediaPaths = new Set<string>();
  for (const [index, candidate] of value.candidates.entries()) {
    assertCandidate(candidate, index);
    if (ids.has(candidate.candidateId)) fail('観測planのcandidate IDが重複しています');
    ids.add(candidate.candidateId);
    for (const media of [
      candidate.reviewMedia.secondOnly,
      candidate.reviewMedia.firstThenSecond
    ]) {
      if (mediaPaths.has(media.path)) fail('観測planの確認動画pathが重複しています');
      mediaPaths.add(media.path);
    }
  }
}

export function serializeDistantConnectionPleasantVideoObservationPlanV001(
  value: DistantConnectionPleasantVideoObservationPlanV001
): Buffer {
  assertDistantConnectionPleasantVideoObservationPlanV001(value);
  return formalBytes(value);
}

export function decodeDistantConnectionPleasantVideoObservationPlanV001(
  bytes: Uint8Array
): DistantConnectionPleasantVideoObservationPlanV001 {
  const value = parseJson(bytes, '三値観測plan');
  assertDistantConnectionPleasantVideoObservationPlanV001(value);
  if (!serializeDistantConnectionPleasantVideoObservationPlanV001(value)
    .equals(Buffer.from(bytes))) {
    fail('三値観測planがcanonical formal byteではありません');
  }
  return value;
}

export function validateDistantConnectionPleasantVideoObservationPlanAgainstSourcesV001(
  value: unknown,
  input: BuildDistantConnectionPleasantVideoObservationPlanInputV001
): void {
  assertDistantConnectionPleasantVideoObservationPlanV001(value);
  const rebuilt = buildDistantConnectionPleasantVideoObservationPlanV001(input);
  if (!serializeDistantConnectionPleasantVideoObservationPlanV001(value)
    .equals(serializeDistantConnectionPleasantVideoObservationPlanV001(rebuilt))) {
    fail('三値観測planが指定正本と14本の実動画からの決定的再生成結果に一致しません');
  }
}

export function buildDistantConnectionPleasantVideoObservationResultV001(
  input: BuildDistantConnectionPleasantVideoObservationResultInputV001
): DistantConnectionPleasantVideoObservationResultV001 {
  assertId(input.resultId, '三値観測result ID');
  assertWorkspacePath(input.reviewPlanPath, '三値観測plan path');
  const reviewPlanSha256 = checkedSha(
    input.reviewPlanBytes,
    input.expectedReviewPlanSha256,
    '三値観測plan'
  );
  const plan = decodeDistantConnectionPleasantVideoObservationPlanV001(input.reviewPlanBytes);
  if (input.candidateVerdicts.length !== plan.candidates.length) {
    fail('7候補すべてへ三値回答するまで正式resultは生成できません');
  }
  const seen = new Set<string>();
  const candidateObservations = plan.candidates.map((candidate, index) => {
    const answer = input.candidateVerdicts[index];
    if (!isRecord(answer) || !exactKeys(answer, ['candidateId', 'verdict'])) {
      fail(`候補${index + 1}件目の回答はcandidate IDと三値だけである必要があります`);
    }
    if (answer.candidateId !== candidate.candidateId) {
      fail(`候補${index + 1}件目の回答IDまたは順序が正式planと一致しません`);
    }
    if (seen.has(answer.candidateId)) fail('三値回答のcandidate IDが重複しています');
    seen.add(answer.candidateId);
    if (!DISTANT_CONNECTION_PLEASANT_VIDEO_OBSERVATION_VERDICTS_V001.includes(
      answer.verdict
    )) {
      fail(`候補${index + 1}件目の三値回答が不正です`);
    }
    return {
      ...candidate,
      verdict: answer.verdict
    };
  });

  return {
    schemaVersion: DISTANT_CONNECTION_PLEASANT_VIDEO_OBSERVATION_RESULT_SCHEMA_V001,
    resultId: input.resultId,
    sourceVideoId: plan.sourceVideoId,
    sourceBindings: {
      candidateResponse: {...plan.sourceBindings.candidateResponse},
      candidateReviewResult: {...plan.sourceBindings.candidateReviewResult},
      reviewPlan: {
        path: input.reviewPlanPath,
        schemaVersion: DISTANT_CONNECTION_PLEASANT_VIDEO_OBSERVATION_PLAN_SCHEMA_V001,
        fileSha256: reviewPlanSha256
      }
    },
    reviewer: {...plan.reviewer},
    candidateCount: plan.candidateCount,
    candidateObservations,
    completionStatus: 'complete',
    responsibilityPrinciple: DISTANT_CONNECTION_PLEASANT_VIDEO_OBSERVATION_RESPONSIBILITY_V001
  };
}

export function assertDistantConnectionPleasantVideoObservationResultV001(
  value: unknown
): asserts value is DistantConnectionPleasantVideoObservationResultV001 {
  if (!isRecord(value)
    || !exactKeys(value, [
      'schemaVersion', 'resultId', 'sourceVideoId', 'sourceBindings', 'reviewer',
      'candidateCount', 'candidateObservations', 'completionStatus',
      'responsibilityPrinciple'
    ])
    || value.schemaVersion !== DISTANT_CONNECTION_PLEASANT_VIDEO_OBSERVATION_RESULT_SCHEMA_V001
    || !isRecord(value.sourceBindings)
    || !exactKeys(value.sourceBindings, [
      'candidateResponse', 'candidateReviewResult', 'reviewPlan'
    ])
    || !Number.isSafeInteger(value.candidateCount)
    || value.candidateCount !== 7
    || !Array.isArray(value.candidateObservations)
    || value.candidateObservations.length !== value.candidateCount
    || value.completionStatus !== 'complete'
    || value.responsibilityPrinciple
      !== DISTANT_CONNECTION_PLEASANT_VIDEO_OBSERVATION_RESPONSIBILITY_V001) {
    fail('三値観測resultのroot構造・完全回答状態・責務が不正です');
  }
  assertId(value.resultId, '三値観測result ID');
  assertId(value.sourceVideoId, '観測元動画ID');
  assertFormalBinding(
    value.sourceBindings.candidateResponse,
    DISTANT_CONNECTION_COMPARISON_CANDIDATE_RESPONSE_SCHEMA_V001,
    '正式候補binding'
  );
  assertFormalBinding(
    value.sourceBindings.candidateReviewResult,
    DISTANT_CONNECTION_CANDIDATE_REVIEW_RESULT_SCHEMA_V002,
    '候補確認動画結果binding'
  );
  assertFormalBinding(
    value.sourceBindings.reviewPlan,
    DISTANT_CONNECTION_PLEASANT_VIDEO_OBSERVATION_PLAN_SCHEMA_V001,
    '三値観測plan binding'
  );
  assertReviewer(value.reviewer);
  const ids = new Set<string>();
  const mediaPaths = new Set<string>();
  for (const [index, observation] of value.candidateObservations.entries()) {
    if (!isRecord(observation)
      || !exactKeys(observation, [
        'candidateId', 'candidateOrdinal', 'reviewMedia', 'verdict'
      ])) {
      fail(`候補${index + 1}件目の三値観測構造が不正です`);
    }
    assertCandidate({
      candidateId: observation.candidateId,
      candidateOrdinal: observation.candidateOrdinal,
      reviewMedia: observation.reviewMedia
    }, index);
    if (ids.has(observation.candidateId as string)) fail('三値観測resultのcandidate IDが重複しています');
    ids.add(observation.candidateId as string);
    const reviewMedia = observation.reviewMedia as PleasantVideoObservationCandidateV001['reviewMedia'];
    for (const media of [reviewMedia.secondOnly, reviewMedia.firstThenSecond]) {
      if (mediaPaths.has(media.path)) fail('三値観測resultの確認動画pathが重複しています');
      mediaPaths.add(media.path);
    }
    if (!DISTANT_CONNECTION_PLEASANT_VIDEO_OBSERVATION_VERDICTS_V001.includes(
      observation.verdict as PleasantVideoObservationVerdictV001
    )) {
      fail(`候補${index + 1}件目の三値回答が不正です`);
    }
  }
}

export function serializeDistantConnectionPleasantVideoObservationResultV001(
  value: DistantConnectionPleasantVideoObservationResultV001
): Buffer {
  assertDistantConnectionPleasantVideoObservationResultV001(value);
  return formalBytes(value);
}

export function validateDistantConnectionPleasantVideoObservationResultAgainstPlanV001(
  value: unknown,
  input: BuildDistantConnectionPleasantVideoObservationResultInputV001
): void {
  assertDistantConnectionPleasantVideoObservationResultV001(value);
  const rebuilt = buildDistantConnectionPleasantVideoObservationResultV001(input);
  if (!serializeDistantConnectionPleasantVideoObservationResultV001(value)
    .equals(serializeDistantConnectionPleasantVideoObservationResultV001(rebuilt))) {
    fail('三値観測resultが正式planと人間の三値回答からの決定的再生成結果に一致しません');
  }
}

function resolveWorkspaceFile(workspaceRoot: string, relativePath: string, label: string): string {
  assertWorkspacePath(relativePath, label);
  if (!path.isAbsolute(workspaceRoot)) fail('workspace rootは絶対pathである必要があります');
  const root = path.resolve(workspaceRoot);
  const absolute = path.resolve(root, relativePath);
  const fromRoot = path.relative(root, absolute);
  if (fromRoot === '' || fromRoot.startsWith(`..${path.sep}`) || path.isAbsolute(fromRoot)) {
    fail(`${label}がworkspace内のfileを指していません`);
  }
  return absolute;
}

export async function buildDistantConnectionPleasantVideoObservationPlanFromFilesV001(
  input: BuildDistantConnectionPleasantVideoObservationPlanFromFilesInputV001
): Promise<DistantConnectionPleasantVideoObservationPlanV001> {
  const [candidateResponseBytes, candidateReviewResultBytes] = await Promise.all([
    readFile(resolveWorkspaceFile(input.workspaceRoot, input.candidateResponsePath, '正式候補path')),
    readFile(resolveWorkspaceFile(
      input.workspaceRoot,
      input.candidateReviewResultPath,
      '候補確認動画結果path'
    ))
  ]);
  const reviewResult = decodeCandidateReviewResult(candidateReviewResultBytes);
  const observedMedia = await Promise.all(reviewResult.candidates.map(async (candidate) => ({
    candidateId: candidate.candidateId,
    secondOnlySha256: await sha256File(resolveWorkspaceFile(
      input.workspaceRoot,
      candidate.reviewArtifacts.secondOnly.videoBinding.path,
      '後半だけ動画path'
    )),
    firstThenSecondSha256: await sha256File(resolveWorkspaceFile(
      input.workspaceRoot,
      candidate.reviewArtifacts.firstThenSecond.videoBinding.path,
      '前半から後半動画path'
    ))
  })));
  return buildDistantConnectionPleasantVideoObservationPlanV001({
    ...input,
    candidateResponseBytes,
    candidateReviewResultBytes,
    observedMedia
  });
}

function htmlEscapedJson(value: unknown): string {
  return JSON.stringify(value)
    .replaceAll('<', '\\u003c')
    .replaceAll('>', '\\u003e')
    .replaceAll('&', '\\u0026');
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

export function buildDistantConnectionPleasantVideoObservationPageV001(input: {
  reviewPlanPath: string;
  reviewPlanBytes: Uint8Array;
  expectedReviewPlanSha256: string;
  pageOutputPath: string;
  resultId: string;
}): Buffer {
  assertWorkspacePath(input.reviewPlanPath, '三値観測plan path');
  assertWorkspacePath(input.pageOutputPath, '三択確認ページpath');
  assertId(input.resultId, '三値観測result ID');
  const reviewPlanSha256 = checkedSha(
    input.reviewPlanBytes,
    input.expectedReviewPlanSha256,
    '三値観測plan'
  );
  const plan = decodeDistantConnectionPleasantVideoObservationPlanV001(input.reviewPlanBytes);
  const pageDirectory = path.posix.dirname(input.pageOutputPath);
  const cards = plan.candidates.map((candidate) => {
    const secondOnly = path.posix.relative(
      pageDirectory,
      candidate.reviewMedia.secondOnly.path
    );
    const firstThenSecond = path.posix.relative(
      pageDirectory,
      candidate.reviewMedia.firstThenSecond.path
    );
    return `
      <article class="candidate" data-candidate-id="${escapeHtml(candidate.candidateId)}" data-candidate-ordinal="${candidate.candidateOrdinal}">
        <header><h2>候補 ${candidate.candidateOrdinal}</h2><span class="answer-state">未回答</span></header>
        <section class="stage">
          <h3>1. まず後半だけを見る</h3>
          <p>前半やLunaの説明は表示していません。</p>
          <video controls preload="metadata" src="${escapeHtml(secondOnly)}"></video>
          <button type="button" class="show-first" data-show-first>前半付きも見る</button>
        </section>
        <section class="stage first-then-second" data-first-then-second hidden>
          <h3>2. 前半→後半を見る</h3>
          <video controls preload="metadata" src="${escapeHtml(firstThenSecond)}"></video>
          <p class="question">最終的に、この動画を良いと思いますか。</p>
          <div class="verdicts" role="group" aria-label="候補 ${candidate.candidateOrdinal} の三択">
            <button type="button" data-verdict="good">良い</button>
            <button type="button" data-verdict="not-good">良くない</button>
            <button type="button" data-verdict="unsure">分からない</button>
          </div>
        </section>
      </article>`;
  }).join('\n');

  const resultBase = {
    schemaVersion: DISTANT_CONNECTION_PLEASANT_VIDEO_OBSERVATION_RESULT_SCHEMA_V001,
    resultId: input.resultId,
    sourceVideoId: plan.sourceVideoId,
    sourceBindings: {
      candidateResponse: plan.sourceBindings.candidateResponse,
      candidateReviewResult: plan.sourceBindings.candidateReviewResult,
      reviewPlan: {
        path: input.reviewPlanPath,
        schemaVersion: DISTANT_CONNECTION_PLEASANT_VIDEO_OBSERVATION_PLAN_SCHEMA_V001,
        fileSha256: reviewPlanSha256
      }
    },
    reviewer: plan.reviewer,
    candidateCount: plan.candidateCount,
    completionStatus: 'complete',
    responsibilityPrinciple: plan.responsibilityPrinciple
  };
  const pageContext = {
    resultBase,
    candidates: plan.candidates
  };

  return Buffer.from(`<!doctype html>
<html lang="ja">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>遠方接続 3択観測</title>
  <style>
    :root{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#172033;background:#f4f6fa}
    body{max-width:1000px;margin:0 auto;padding:28px 18px 80px}h1{margin-bottom:8px}.lead{line-height:1.8}
    .notice{background:#fff4ce;border:1px solid #d8aa00;border-radius:12px;padding:16px;line-height:1.8}
    .progress{position:sticky;top:0;z-index:2;background:#172033;color:white;border-radius:12px;padding:14px 18px;margin:20px 0}
    .candidate{background:white;border:1px solid #d8deea;border-radius:16px;margin:22px 0;padding:20px;box-shadow:0 3px 14px #17203312}
    header{display:flex;justify-content:space-between;align-items:center;gap:16px}.answer-state{background:#edf2ff;border-radius:999px;padding:5px 10px}
    .stage{border-top:1px solid #e4e8f0;margin-top:14px;padding-top:14px}.stage[hidden]{display:none!important}
    video{display:block;width:100%;max-height:560px;background:#111;border-radius:10px;margin:12px 0}
    button{border:1px solid #2457d6;border-radius:9px;background:#2457d6;color:white;padding:11px 18px;font-weight:700;cursor:pointer}
    button[disabled]{opacity:.45;cursor:not-allowed}.verdicts{display:flex;flex-wrap:wrap;gap:10px}.verdicts button{min-width:130px;background:white;color:#2457d6}
    .verdicts button.selected{background:#2457d6;color:white}.download{margin-top:22px}.complete{background:#e7f8ee;color:#155b33}
  </style>
</head>
<body>
  <h1>遠方接続候補を3択だけで見る</h1>
  <p class="lead">理由を考えなくてよい。後半だけと前半付きの映像を見て、最終的にこの動画が良いと思うかを「良い／良くない／分からない」のどれかで押すだけです。</p>
  <p class="notice">これは最終採否ではありません。「良い」は正式selectionへ自動昇格せず、「良くない」は永久禁止にならず、「分からない」は失敗扱いになりません。Lunaの接続理由は回答前に表示しません。</p>
  <div class="progress" id="progress">0 / ${plan.candidateCount} 件回答済み — まだ回答漏れがあります</div>
${cards}
  <section class="download">
    <button type="button" id="download-result" disabled>7件の正式観測結果JSONを保存</button>
    <p id="download-help">7件すべてに答えると保存できます。</p>
  </section>
  <script>
    const pageContext = ${htmlEscapedJson(pageContext)};
    const answers = new Map();
    const progress = document.getElementById('progress');
    const downloadButton = document.getElementById('download-result');
    const downloadHelp = document.getElementById('download-help');

    for (const card of document.querySelectorAll('.candidate')) {
      card.querySelector('[data-show-first]').addEventListener('click', (event) => {
        card.querySelector('[data-first-then-second]').hidden = false;
        event.currentTarget.disabled = true;
        card.querySelector('[data-first-then-second]').scrollIntoView({behavior:'smooth',block:'start'});
      });
      for (const button of card.querySelectorAll('[data-verdict]')) {
        button.addEventListener('click', () => {
          const candidateId = card.dataset.candidateId;
          answers.set(candidateId, button.dataset.verdict);
          for (const peer of card.querySelectorAll('[data-verdict]')) {
            peer.classList.toggle('selected', peer === button);
            peer.setAttribute('aria-pressed', peer === button ? 'true' : 'false');
          }
          card.querySelector('.answer-state').textContent = '回答済み';
          updateCompletion();
        });
      }
    }

    function updateCompletion() {
      const answered = answers.size;
      const complete = answered === pageContext.candidates.length;
      progress.textContent = complete
        ? answered + ' / ' + pageContext.candidates.length + ' 件回答済み — 全件回答済みです'
        : answered + ' / ' + pageContext.candidates.length + ' 件回答済み — まだ回答漏れがあります';
      progress.classList.toggle('complete', complete);
      downloadButton.disabled = !complete;
      downloadHelp.textContent = complete
        ? '正式観測結果JSONを保存できます。これはselectionではありません。'
        : '7件すべてに答えると保存できます。';
    }

    downloadButton.addEventListener('click', () => {
      if (answers.size !== pageContext.candidates.length) return;
      const result = {
        schemaVersion: pageContext.resultBase.schemaVersion,
        resultId: pageContext.resultBase.resultId,
        sourceVideoId: pageContext.resultBase.sourceVideoId,
        sourceBindings: pageContext.resultBase.sourceBindings,
        reviewer: pageContext.resultBase.reviewer,
        candidateCount: pageContext.resultBase.candidateCount,
        candidateObservations: pageContext.candidates.map((candidate) => ({
          candidateId: candidate.candidateId,
          candidateOrdinal: candidate.candidateOrdinal,
          reviewMedia: candidate.reviewMedia,
          verdict: answers.get(candidate.candidateId)
        })),
        completionStatus: pageContext.resultBase.completionStatus,
        responsibilityPrinciple: pageContext.resultBase.responsibilityPrinciple
      };
      const blob = new Blob([JSON.stringify(result, null, 2) + '\\n'], {type:'application/json'});
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = 'pleasant-video-observation-result-v001.json';
      link.click();
      URL.revokeObjectURL(link.href);
    });
  </script>
</body>
</html>
`, 'utf8');
}

export async function writeDistantConnectionPleasantVideoObservationPackageV001(
  input: WriteDistantConnectionPleasantVideoObservationPackageInputV001
): Promise<{
  planPath: string;
  planBytes: Buffer;
  pagePath: string;
  pageBytes: Buffer;
}> {
  assertWorkspacePath(input.outputRoot, '三値観測出力root');
  const plan = await buildDistantConnectionPleasantVideoObservationPlanFromFilesV001(input);
  const planBytes = serializeDistantConnectionPleasantVideoObservationPlanV001(plan);
  const planPath = `${input.outputRoot}/observation-plan-v001.json`;
  const pagePath = `${input.outputRoot}/human-review.html`;
  const pageBytes = buildDistantConnectionPleasantVideoObservationPageV001({
    reviewPlanPath: planPath,
    reviewPlanBytes: planBytes,
    expectedReviewPlanSha256: sha256(planBytes),
    pageOutputPath: pagePath,
    resultId: input.resultId
  });
  const absoluteOutputRoot = resolveWorkspaceFile(
    input.workspaceRoot,
    `${input.outputRoot}/.output-root-sentinel`,
    '三値観測出力root'
  );
  await mkdir(path.dirname(absoluteOutputRoot), {recursive: true});
  await writeFile(path.join(input.workspaceRoot, planPath), planBytes, {flag: 'wx'});
  await writeFile(path.join(input.workspaceRoot, pagePath), pageBytes, {flag: 'wx'});
  return {planPath, planBytes, pagePath, pageBytes};
}
