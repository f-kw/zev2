import {createHash} from 'node:crypto';

export const DISTANT_CONNECTION_HUMAN_REVIEW_RESULT_SCHEMA_V001 =
  'distant-connection-human-review-result-v001';

export const DISTANT_CONNECTION_HUMAN_REVIEW_JUDGMENT_V001 =
  'connection-valid-increment-weak';

export const DISTANT_CONNECTION_HUMAN_REVIEW_REASON_V001 =
  '接続自体は成立しているが、汎用的な冒頭説明との関連に留まり、後半による強い回収・意味・面白さの増分が不足';

export const DISTANT_CONNECTION_HUMAN_REVIEW_EXCEPTION_V001 =
  'ゲーム紹介・一般説明そのものは除外しない。後半がその説明を強く回収し、前から後へ見ることで意味や面白さが明確に増える場合は成立し得る。';

export class DistantConnectionHumanReviewResultErrorV001 extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DistantConnectionHumanReviewResultErrorV001';
  }
}

export type DistantConnectionHumanReviewResultV001 = {
  schemaVersion: typeof DISTANT_CONNECTION_HUMAN_REVIEW_RESULT_SCHEMA_V001;
  sourceVideoId: string;
  reviewedAt: '2026-08-25';
  reviewer: 'kawafmm';
  sourceBindings: {
    candidateResponse: {path: string; schemaVersion: string; fileSha256: string};
    videoPrototypeResult: {path: string; schemaVersion: string; fileSha256: string};
  };
  candidateCount: number;
  candidateReviews: Array<{
    candidateId: string;
    judgment: typeof DISTANT_CONNECTION_HUMAN_REVIEW_JUDGMENT_V001;
    reason: typeof DISTANT_CONNECTION_HUMAN_REVIEW_REASON_V001;
  }>;
  exceptionPrinciple: typeof DISTANT_CONNECTION_HUMAN_REVIEW_EXCEPTION_V001;
};

type BuildInput = {
  candidateResponsePath: string;
  candidateResponseBytes: Uint8Array;
  expectedCandidateResponseSha256: string;
  sourcePackagePath: string;
  sourcePackageBytes: Uint8Array;
  videoPrototypeResultPath: string;
  videoPrototypeResultBytes: Uint8Array;
  expectedVideoPrototypeResultSha256: string;
};

type RecordValue = Record<string, unknown>;

const SHA256 = /^[0-9a-f]{64}$/u;

function fail(message: string): never {
  throw new DistantConnectionHumanReviewResultErrorV001(message);
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

function parseJson(bytes: Uint8Array, label: string): unknown {
  try {
    return JSON.parse(Buffer.from(bytes).toString('utf8'));
  } catch {
    fail(`${label}がJSONとして読めません`);
  }
}

function assertBinding(
  value: unknown,
  expectedPath: string,
  expectedSha256: string,
  label: string
): void {
  if (!isRecord(value)
    || !hasExactKeys(value, ['path', 'fileSha256'])
    || value.path !== expectedPath
    || value.fileSha256 !== expectedSha256) {
    fail(`${label}が指定された正本と一致しません`);
  }
}

function candidateIdsFromVideoResult(
  bytes: Uint8Array,
  candidateResponsePath: string,
  candidateResponseSha256: string
): {sourceVideoId: string; schemaVersion: string; candidateIds: string[]} {
  const value = parseJson(bytes, '動画試作結果');
  if (!isRecord(value)
    || value.schemaVersion !== 'distant-connection-video-prototype-result-v001'
    || typeof value.sourceVideoId !== 'string'
    || !isRecord(value.sourceBindings)
    || !Array.isArray(value.candidates)
    || value.candidateCount !== value.candidates.length
    || !isRecord(value.qc)
    || value.qc.status !== 'passed') {
    fail('動画試作結果が正式な合格成果物ではありません');
  }
  assertBinding(
    value.sourceBindings.candidateResponse,
    candidateResponsePath,
    candidateResponseSha256,
    '動画試作結果の正式候補binding'
  );
  const candidateIds = value.candidates.map((candidate, index) => {
    if (!isRecord(candidate) || typeof candidate.candidateId !== 'string') {
      fail(`動画試作結果の候補${index + 1}件目が不正です`);
    }
    return candidate.candidateId;
  });
  if (new Set(candidateIds).size !== candidateIds.length) {
    fail('動画試作結果に候補IDの重複があります');
  }
  return {
    sourceVideoId: value.sourceVideoId,
    schemaVersion: value.schemaVersion,
    candidateIds
  };
}

function candidateResponseSummary(
  bytes: Uint8Array,
  sourcePackagePath: string,
  sourcePackageBytes: Uint8Array
): {sourceVideoId: string; schemaVersion: string; candidateIds: string[]} {
  const value = parseJson(bytes, '正式候補成果物');
  if (!isRecord(value)
    || !hasExactKeys(value, [
      'schemaVersion', 'sourceVideoId', 'sourcePackageBinding', 'candidates'
    ])
    || value.schemaVersion !== 'distant-connection-luna-response-v001'
    || typeof value.sourceVideoId !== 'string'
    || !isRecord(value.sourcePackageBinding)
    || !hasExactKeys(value.sourcePackageBinding, ['path', 'schemaVersion', 'fileSha256'])
    || value.sourcePackageBinding.path !== sourcePackagePath
    || value.sourcePackageBinding.schemaVersion !== 'distant-connection-luna-source-package-v001'
    || value.sourcePackageBinding.fileSha256 !== sha256(sourcePackageBytes)
    || !Array.isArray(value.candidates)) {
    fail('正式候補成果物が指定source packageを束縛していません');
  }
  const candidateIds = value.candidates.map((candidate, index) => {
    if (!isRecord(candidate)
      || !hasExactKeys(candidate, [
        'candidateId',
        'anchorId',
        'firstPartSemanticUtteranceIds',
        'secondPartSemanticUtteranceIds',
        'addedUnderstanding',
        'direction'
      ])
      || typeof candidate.candidateId !== 'string') {
      fail(`正式候補${index + 1}件目の構造が不正です`);
    }
    return candidate.candidateId;
  });
  if (new Set(candidateIds).size !== candidateIds.length) {
    fail('正式候補成果物に候補IDの重複があります');
  }
  return {
    sourceVideoId: value.sourceVideoId,
    schemaVersion: value.schemaVersion,
    candidateIds
  };
}

export function buildDistantConnectionHumanReviewResultV001(
  input: BuildInput
): DistantConnectionHumanReviewResultV001 {
  const candidateResponseSha256 = sha256(input.candidateResponseBytes);
  const videoPrototypeResultSha256 = sha256(input.videoPrototypeResultBytes);
  if (!SHA256.test(input.expectedCandidateResponseSha256)
    || candidateResponseSha256 !== input.expectedCandidateResponseSha256) {
    fail('正式候補成果物のSHA-256が指定正本と一致しません');
  }
  if (!SHA256.test(input.expectedVideoPrototypeResultSha256)
    || videoPrototypeResultSha256 !== input.expectedVideoPrototypeResultSha256) {
    fail('動画試作結果のSHA-256が指定正本と一致しません');
  }

  const response = candidateResponseSummary(
    input.candidateResponseBytes,
    input.sourcePackagePath,
    input.sourcePackageBytes
  );
  const videoResult = candidateIdsFromVideoResult(
    input.videoPrototypeResultBytes,
    input.candidateResponsePath,
    candidateResponseSha256
  );
  const candidateIds = response.candidateIds;
  if (response.sourceVideoId !== videoResult.sourceVideoId
    || candidateIds.length !== 2
    || JSON.stringify(candidateIds) !== JSON.stringify(videoResult.candidateIds)) {
    fail('正式候補2件と動画試作結果の候補が一致しません');
  }

  return {
    schemaVersion: DISTANT_CONNECTION_HUMAN_REVIEW_RESULT_SCHEMA_V001,
    sourceVideoId: response.sourceVideoId,
    reviewedAt: '2026-08-25',
    reviewer: 'kawafmm',
    sourceBindings: {
      candidateResponse: {
        path: input.candidateResponsePath,
        schemaVersion: response.schemaVersion,
        fileSha256: candidateResponseSha256
      },
      videoPrototypeResult: {
        path: input.videoPrototypeResultPath,
        schemaVersion: videoResult.schemaVersion,
        fileSha256: videoPrototypeResultSha256
      }
    },
    candidateCount: candidateIds.length,
    candidateReviews: candidateIds.map((candidateId) => ({
      candidateId,
      judgment: DISTANT_CONNECTION_HUMAN_REVIEW_JUDGMENT_V001,
      reason: DISTANT_CONNECTION_HUMAN_REVIEW_REASON_V001
    })),
    exceptionPrinciple: DISTANT_CONNECTION_HUMAN_REVIEW_EXCEPTION_V001
  };
}

export function assertDistantConnectionHumanReviewResultV001(
  value: unknown
): asserts value is DistantConnectionHumanReviewResultV001 {
  if (!isRecord(value) || !hasExactKeys(value, [
    'schemaVersion',
    'sourceVideoId',
    'reviewedAt',
    'reviewer',
    'sourceBindings',
    'candidateCount',
    'candidateReviews',
    'exceptionPrinciple'
  ])) fail('人間評価成果物のroot構造が不正です');
  if (value.schemaVersion !== DISTANT_CONNECTION_HUMAN_REVIEW_RESULT_SCHEMA_V001
    || value.sourceVideoId !== 'ymUsGrT6EaA'
    || value.reviewedAt !== '2026-08-25'
    || value.reviewer !== 'kawafmm'
    || value.exceptionPrinciple !== DISTANT_CONNECTION_HUMAN_REVIEW_EXCEPTION_V001
    || value.candidateCount !== 2
    || !isRecord(value.sourceBindings)
    || !hasExactKeys(value.sourceBindings, ['candidateResponse', 'videoPrototypeResult'])
    || !Array.isArray(value.candidateReviews)
    || value.candidateReviews.length !== value.candidateCount) {
    fail('人間評価成果物の固定値または件数が不正です');
  }
  for (const [name, binding] of Object.entries(value.sourceBindings)) {
    if (!isRecord(binding)
      || !hasExactKeys(binding, ['path', 'schemaVersion', 'fileSha256'])
      || typeof binding.path !== 'string'
      || typeof binding.schemaVersion !== 'string'
      || typeof binding.fileSha256 !== 'string'
      || !SHA256.test(binding.fileSha256)) {
      fail(`${name} bindingが不正です`);
    }
  }
  const expectedIds = ['candidate-000001', 'candidate-000002'];
  for (const [index, review] of value.candidateReviews.entries()) {
    if (!isRecord(review)
      || !hasExactKeys(review, ['candidateId', 'judgment', 'reason'])
      || review.candidateId !== expectedIds[index]
      || review.judgment !== DISTANT_CONNECTION_HUMAN_REVIEW_JUDGMENT_V001
      || review.reason !== DISTANT_CONNECTION_HUMAN_REVIEW_REASON_V001) {
      fail(`候補${index + 1}件目の人間評価が不正です`);
    }
  }
}

export function serializeDistantConnectionHumanReviewResultV001(
  result: DistantConnectionHumanReviewResultV001
): Buffer {
  assertDistantConnectionHumanReviewResultV001(result);
  return Buffer.from(`${JSON.stringify(result, null, 2)}\n`, 'utf8');
}

export function validateDistantConnectionHumanReviewResultAgainstSourcesV001(
  result: DistantConnectionHumanReviewResultV001,
  input: BuildInput
): void {
  assertDistantConnectionHumanReviewResultV001(result);
  const rebuilt = buildDistantConnectionHumanReviewResultV001(input);
  if (JSON.stringify(result) !== JSON.stringify(rebuilt)) {
    fail('人間評価成果物が指定された正式候補・動画試作結果と一致しません');
  }
}
