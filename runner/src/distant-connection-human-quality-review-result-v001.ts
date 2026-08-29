import {createHash} from 'node:crypto';
import {mkdir, readFile, writeFile} from 'node:fs/promises';
import path from 'node:path';

export const DISTANT_CONNECTION_HUMAN_QUALITY_REVIEW_RESULT_SCHEMA_V001 =
  'distant-connection-human-quality-review-result-v001';

export class DistantConnectionHumanQualityReviewResultErrorV001 extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DistantConnectionHumanQualityReviewResultErrorV001';
  }
}

type Binding = {path: string; schemaVersion: string; fileSha256: string};
type RecordValue = Record<string, unknown>;

export type CandidateHumanQualityReviewV001 = {
  candidateId: string;
  connectionValidity: 'pass' | 'fail';
  payoffStrength: 'pass' | 'story-level-pass' | 'fail';
  visualSuitability: 'pass' | 'fail' | 'not-primary-cause';
  intervalizationEvaluation: 'pass' | 'fail';
  finalDecision: 'pass' | 'fail';
  humanReason: string;
};

export type DistantConnectionHumanQualityReviewResultV001 = {
  schemaVersion: typeof DISTANT_CONNECTION_HUMAN_QUALITY_REVIEW_RESULT_SCHEMA_V001;
  sourceVideoId: string;
  reviewedAt: string;
  reviewer: string;
  sourceBindings: {
    candidateResponse: Binding;
    videoPrototypeResult: Binding;
  };
  candidateCount: number;
  candidateReviews: CandidateHumanQualityReviewV001[];
  responsibilityPrinciple: string;
};

export type BuildDistantConnectionHumanQualityReviewResultV001Input = {
  candidateResponsePath: string;
  candidateResponseBytes: Uint8Array;
  expectedCandidateResponseSha256: string;
  videoPrototypeResultPath: string;
  videoPrototypeResultBytes: Uint8Array;
  expectedVideoPrototypeResultSha256: string;
  reviewedAt: string;
  reviewer: string;
  candidateReviews: CandidateHumanQualityReviewV001[];
};

export type BuildDistantConnectionHumanQualityReviewResultV001FromFilesInput = Omit<
  BuildDistantConnectionHumanQualityReviewResultV001Input,
  'candidateResponseBytes' | 'videoPrototypeResultBytes'
> & {workspaceRoot: string};

const SHA256 = /^[0-9a-f]{64}$/u;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/u;
const RESPONSIBILITY_PRINCIPLE =
  'Lunaは意味上の接続と文章上の回収候補を提示する。区間化は候補を実動画区間へ変換し、動画QCは技術成立を検査する。実動画を確認した人間が接続成立・回収強度・映像適性・区間化評価・最終採否を独立して正式所有する。';
const CANDIDATE_RESPONSE_SCHEMA = 'distant-connection-luna-response-v001';
const VIDEO_PROTOTYPE_RESULT_SCHEMA =
  'distant-connection-video-intervalization-improvement-result-v001';

function fail(message: string): never {
  throw new DistantConnectionHumanQualityReviewResultErrorV001(message);
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

function parseJson(bytes: Uint8Array, label: string): RecordValue {
  try {
    const value: unknown = JSON.parse(Buffer.from(bytes).toString('utf8'));
    if (!isRecord(value)) fail(`${label}のrootがobjectではありません`);
    return value;
  } catch (error) {
    if (error instanceof DistantConnectionHumanQualityReviewResultErrorV001) throw error;
    fail(`${label}がJSONとして読めません`);
  }
}

function assertExpectedSha(actual: string, expected: string, label: string): void {
  if (!SHA256.test(expected) || actual !== expected) {
    fail(`${label}のSHA-256が指定正本と一致しません`);
  }
}

function readCandidateIds(value: RecordValue, label: string): string[] {
  if (typeof value.sourceVideoId !== 'string'
    || value.sourceVideoId.length === 0
    || !Array.isArray(value.candidates)
    || value.candidates.length === 0) {
    fail(`${label}の動画IDまたは候補列が不正です`);
  }
  const ids = value.candidates.map((candidate, index) => {
    if (!isRecord(candidate)
      || typeof candidate.candidateId !== 'string'
      || candidate.candidateId.length === 0) {
      fail(`${label}の候補${index + 1}件目が不正です`);
    }
    return candidate.candidateId;
  });
  if (new Set(ids).size !== ids.length) fail(`${label}の候補IDが重複しています`);
  return ids;
}

function assertCandidateReview(
  value: unknown,
  expectedCandidateId: string,
  index: number
): asserts value is CandidateHumanQualityReviewV001 {
  if (!isRecord(value)
    || !hasExactKeys(value, [
      'candidateId', 'connectionValidity', 'payoffStrength', 'visualSuitability',
      'intervalizationEvaluation', 'finalDecision', 'humanReason'
    ])
    || value.candidateId !== expectedCandidateId
    || !['pass', 'fail'].includes(value.connectionValidity as string)
    || !['pass', 'story-level-pass', 'fail'].includes(value.payoffStrength as string)
    || !['pass', 'fail', 'not-primary-cause'].includes(value.visualSuitability as string)
    || !['pass', 'fail'].includes(value.intervalizationEvaluation as string)
    || !['pass', 'fail'].includes(value.finalDecision as string)
    || typeof value.humanReason !== 'string'
    || value.humanReason.trim().length === 0) {
    fail(`候補${index + 1}件目の人間品質評価が不正です`);
  }
}

function inspectSources(input: BuildDistantConnectionHumanQualityReviewResultV001Input): {
  sourceVideoId: string;
  candidateIds: string[];
  candidateResponseSha256: string;
  videoPrototypeResultSha256: string;
} {
  const candidateResponseSha256 = sha256(input.candidateResponseBytes);
  const videoPrototypeResultSha256 = sha256(input.videoPrototypeResultBytes);
  assertExpectedSha(
    candidateResponseSha256,
    input.expectedCandidateResponseSha256,
    '対象正式候補'
  );
  assertExpectedSha(
    videoPrototypeResultSha256,
    input.expectedVideoPrototypeResultSha256,
    '対象区間化・試作動画結果'
  );

  const candidateResponse = parseJson(input.candidateResponseBytes, '対象正式候補');
  if (candidateResponse.schemaVersion !== CANDIDATE_RESPONSE_SCHEMA) {
    fail('対象正式候補のschemaが不正です');
  }
  const candidateIds = readCandidateIds(candidateResponse, '対象正式候補');
  const sourceVideoId = candidateResponse.sourceVideoId as string;

  const videoPrototypeResult = parseJson(
    input.videoPrototypeResultBytes,
    '対象区間化・試作動画結果'
  );
  if (videoPrototypeResult.schemaVersion !== VIDEO_PROTOTYPE_RESULT_SCHEMA
    || videoPrototypeResult.sourceVideoId !== sourceVideoId
    || !isRecord(videoPrototypeResult.sourceBindings)
    || !isRecord(videoPrototypeResult.sourceBindings.candidateResponse)
    || videoPrototypeResult.sourceBindings.candidateResponse.path !== input.candidateResponsePath
    || videoPrototypeResult.sourceBindings.candidateResponse.fileSha256 !== candidateResponseSha256
    || !isRecord(videoPrototypeResult.qc)
    || videoPrototypeResult.qc.status !== 'passed') {
    fail('対象区間化・試作動画結果のschema・動画ID・正式候補binding・QCが不正です');
  }
  const videoCandidateIds = readCandidateIds(
    videoPrototypeResult,
    '対象区間化・試作動画結果'
  );
  if (JSON.stringify(videoCandidateIds) !== JSON.stringify(candidateIds)) {
    fail('対象区間化・試作動画結果の候補IDまたは順序が正式候補と一致しません');
  }
  const videoCandidates = videoPrototypeResult.candidates;
  if (!Array.isArray(videoCandidates)) fail('対象区間化・試作動画結果の候補列が不正です');
  for (const [index, candidate] of videoCandidates.entries()) {
    if (!isRecord(candidate)
      || !isRecord(candidate.video)
      || typeof candidate.video.fileSha256 !== 'string'
      || !SHA256.test(candidate.video.fileSha256)
      || !isRecord(candidate.qc)
      || candidate.qc.status !== 'passed') {
      fail(`対象区間化・試作動画結果の候補${index + 1}件目の動画bindingまたはQCが不正です`);
    }
  }

  return {
    sourceVideoId,
    candidateIds,
    candidateResponseSha256,
    videoPrototypeResultSha256
  };
}

function assertMetadata(reviewedAt: string, reviewer: string): void {
  if (!ISO_DATE.test(reviewedAt)) fail('reviewedAtがYYYY-MM-DDではありません');
  if (reviewer.trim().length === 0) fail('reviewerが空です');
}

export function buildDistantConnectionHumanQualityReviewResultV001(
  input: BuildDistantConnectionHumanQualityReviewResultV001Input
): DistantConnectionHumanQualityReviewResultV001 {
  const sources = inspectSources(input);
  assertMetadata(input.reviewedAt, input.reviewer);
  if (input.candidateReviews.length !== sources.candidateIds.length) {
    fail('人間品質評価が正式候補を完全被覆していません');
  }
  input.candidateReviews.forEach((review, index) => {
    assertCandidateReview(review, sources.candidateIds[index], index);
  });

  return {
    schemaVersion: DISTANT_CONNECTION_HUMAN_QUALITY_REVIEW_RESULT_SCHEMA_V001,
    sourceVideoId: sources.sourceVideoId,
    reviewedAt: input.reviewedAt,
    reviewer: input.reviewer,
    sourceBindings: {
      candidateResponse: {
        path: input.candidateResponsePath,
        schemaVersion: CANDIDATE_RESPONSE_SCHEMA,
        fileSha256: sources.candidateResponseSha256
      },
      videoPrototypeResult: {
        path: input.videoPrototypeResultPath,
        schemaVersion: VIDEO_PROTOTYPE_RESULT_SCHEMA,
        fileSha256: sources.videoPrototypeResultSha256
      }
    },
    candidateCount: sources.candidateIds.length,
    candidateReviews: input.candidateReviews.map((review) => ({...review})),
    responsibilityPrinciple: RESPONSIBILITY_PRINCIPLE
  };
}

export function assertDistantConnectionHumanQualityReviewResultV001(
  value: unknown
): asserts value is DistantConnectionHumanQualityReviewResultV001 {
  if (!isRecord(value)
    || !hasExactKeys(value, [
      'schemaVersion', 'sourceVideoId', 'reviewedAt', 'reviewer', 'sourceBindings',
      'candidateCount', 'candidateReviews', 'responsibilityPrinciple'
    ])
    || value.schemaVersion !== DISTANT_CONNECTION_HUMAN_QUALITY_REVIEW_RESULT_SCHEMA_V001
    || typeof value.sourceVideoId !== 'string'
    || value.sourceVideoId.length === 0
    || typeof value.reviewedAt !== 'string'
    || typeof value.reviewer !== 'string'
    || value.responsibilityPrinciple !== RESPONSIBILITY_PRINCIPLE
    || !Number.isInteger(value.candidateCount)
    || (value.candidateCount as number) <= 0
    || !Array.isArray(value.candidateReviews)
    || value.candidateReviews.length !== value.candidateCount
    || !isRecord(value.sourceBindings)
    || !hasExactKeys(value.sourceBindings, ['candidateResponse', 'videoPrototypeResult'])) {
    fail('一般人間品質評価のroot構造・固定責務が不正です');
  }
  assertMetadata(value.reviewedAt, value.reviewer);
  for (const [name, binding] of Object.entries(value.sourceBindings)) {
    if (!isRecord(binding)
      || !hasExactKeys(binding, ['path', 'schemaVersion', 'fileSha256'])
      || typeof binding.path !== 'string'
      || binding.path.length === 0
      || typeof binding.schemaVersion !== 'string'
      || binding.schemaVersion.length === 0
      || typeof binding.fileSha256 !== 'string'
      || !SHA256.test(binding.fileSha256)) {
      fail(`${name} bindingが不正です`);
    }
  }
  const ids = value.candidateReviews.map((review, index) => {
    if (!isRecord(review) || typeof review.candidateId !== 'string') {
      fail(`候補${index + 1}件目の人間品質評価が不正です`);
    }
    assertCandidateReview(review, review.candidateId, index);
    return review.candidateId;
  });
  if (new Set(ids).size !== ids.length) fail('人間品質評価のcandidate IDが重複しています');
}

export function serializeDistantConnectionHumanQualityReviewResultV001(
  result: DistantConnectionHumanQualityReviewResultV001
): Buffer {
  assertDistantConnectionHumanQualityReviewResultV001(result);
  return Buffer.from(`${JSON.stringify(result, null, 2)}\n`, 'utf8');
}

export function validateDistantConnectionHumanQualityReviewResultAgainstSourcesV001(
  result: DistantConnectionHumanQualityReviewResultV001,
  input: BuildDistantConnectionHumanQualityReviewResultV001Input
): void {
  assertDistantConnectionHumanQualityReviewResultV001(result);
  const rebuilt = buildDistantConnectionHumanQualityReviewResultV001(input);
  if (JSON.stringify(result) !== JSON.stringify(rebuilt)) {
    fail('一般人間品質評価が指定正本と人間入力からの決定的再生成結果に一致しません');
  }
}

export async function buildDistantConnectionHumanQualityReviewResultV001FromFiles(
  input: BuildDistantConnectionHumanQualityReviewResultV001FromFilesInput
): Promise<DistantConnectionHumanQualityReviewResultV001> {
  const [candidateResponseBytes, videoPrototypeResultBytes] = await Promise.all([
    readFile(path.join(input.workspaceRoot, input.candidateResponsePath)),
    readFile(path.join(input.workspaceRoot, input.videoPrototypeResultPath))
  ]);
  return buildDistantConnectionHumanQualityReviewResultV001({
    ...input,
    candidateResponseBytes,
    videoPrototypeResultBytes
  });
}

export async function writeDistantConnectionHumanQualityReviewResultV001FromFiles(
  input: BuildDistantConnectionHumanQualityReviewResultV001FromFilesInput & {outputPath: string}
): Promise<DistantConnectionHumanQualityReviewResultV001> {
  const result = await buildDistantConnectionHumanQualityReviewResultV001FromFiles(input);
  const outputAbsolute = path.join(input.workspaceRoot, input.outputPath);
  await mkdir(path.dirname(outputAbsolute), {recursive: true});
  await writeFile(
    outputAbsolute,
    serializeDistantConnectionHumanQualityReviewResultV001(result),
    {flag: 'wx'}
  );
  return result;
}
