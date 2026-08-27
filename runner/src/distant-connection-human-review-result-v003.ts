import {createHash} from 'node:crypto';
import {mkdir, readFile, writeFile} from 'node:fs/promises';
import path from 'node:path';

export const DISTANT_CONNECTION_HUMAN_REVIEW_RESULT_SCHEMA_V003 =
  'distant-connection-human-review-result-v003';

export class DistantConnectionHumanReviewResultErrorV003 extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DistantConnectionHumanReviewResultErrorV003';
  }
}

type Binding = {path: string; schemaVersion: string; fileSha256: string};
type RecordValue = Record<string, unknown>;

export type DistantConnectionHumanReviewResultV003 = {
  schemaVersion: typeof DISTANT_CONNECTION_HUMAN_REVIEW_RESULT_SCHEMA_V003;
  sourceVideoId: 'ymUsGrT6EaA';
  reviewedAt: '2026-08-27';
  reviewer: 'kawafmm';
  sourceBindings: {
    candidateResponse: Binding;
    videoPrototypeResult: Binding;
    comparisonHumanReviewResultV002: Binding;
  };
  candidateCount: 3;
  candidateReviews: Array<{
    candidateId:
      | 'distant-connection-001'
      | 'distant-connection-002'
      | 'distant-connection-003';
    candidateSelection: 'fail';
    primaryCause: 'candidate-selection';
    reason: string;
  }>;
  selectionPrinciple: string;
  comparisonDistinction: string;
};

export type BuildDistantConnectionHumanReviewResultV003Input = {
  candidateResponsePath: string;
  candidateResponseBytes: Uint8Array;
  expectedCandidateResponseSha256: string;
  videoPrototypeResultPath: string;
  videoPrototypeResultBytes: Uint8Array;
  expectedVideoPrototypeResultSha256: string;
  comparisonHumanReviewResultV002Path: string;
  comparisonHumanReviewResultV002Bytes: Uint8Array;
  expectedComparisonHumanReviewResultV002Sha256: string;
};

export type BuildDistantConnectionHumanReviewResultV003FromFilesInput = {
  workspaceRoot: string;
  candidateResponsePath: string;
  expectedCandidateResponseSha256: string;
  videoPrototypeResultPath: string;
  expectedVideoPrototypeResultSha256: string;
  comparisonHumanReviewResultV002Path: string;
  expectedComparisonHumanReviewResultV002Sha256: string;
};

const SHA256 = /^[0-9a-f]{64}$/u;
const CANDIDATE_IDS = [
  'distant-connection-001',
  'distant-connection-002',
  'distant-connection-003'
] as const;
const SELECTION_PRINCIPLE =
  '単なる話題一致ではなく、前半に含まれる具体的な情報・出来事・予告・認識が、後半で具体的な回収・変化・結果として現れること。前半を置くことで、後半の理解・回収感・意外性・面白さが明確に増えること。';
const COMPARISON_DISTINCTION =
  'camera-fear-escalationは候補選択自体が正しく、必要な恐怖映像を区間化が落としていた。今回3件は区間化ではなく候補選択が主因で不合格である。';
const REASONS = Object.freeze({
  'distant-connection-001':
    '後半に怖い対象・出来事が具体的に現れず、話題に触れただけである。前後をつなぐことによる理解・回収感・面白さの増分がない。',
  'distant-connection-002':
    '前半の「子供が好きだった」だけでは人物・話題を特定できず、後半の悲劇を前半が補強する関係を短尺内で理解できない。',
  'distant-connection-003':
    '「ホラーゲーム」という一般的な振りに対し、後半が具体的な恐怖場面として回収しておらず、単なる同一テーマの接続に留まる。'
});

function fail(message: string): never {
  throw new DistantConnectionHumanReviewResultErrorV003(message);
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
    if (error instanceof DistantConnectionHumanReviewResultErrorV003) throw error;
    fail(`${label}がJSONとして読めません`);
  }
}

function assertExpectedSha(actual: string, expected: string, label: string): void {
  if (!SHA256.test(expected) || actual !== expected) {
    fail(`${label}のSHA-256が指定正本と一致しません`);
  }
}

function candidateIds(value: RecordValue, label: string): string[] {
  if (value.sourceVideoId !== 'ymUsGrT6EaA' || !Array.isArray(value.candidates)) {
    fail(`${label}の動画IDまたは候補列が不正です`);
  }
  const ids = value.candidates.map((candidate, index) => {
    if (!isRecord(candidate) || typeof candidate.candidateId !== 'string') {
      fail(`${label}の候補${index + 1}件目が不正です`);
    }
    return candidate.candidateId;
  });
  if (JSON.stringify(ids) !== JSON.stringify(CANDIDATE_IDS)) {
    fail(`${label}の候補IDまたは順序が今回3候補と一致しません`);
  }
  return ids;
}

function inspectSources(input: BuildDistantConnectionHumanReviewResultV003Input): {
  candidateResponseSha256: string;
  videoPrototypeResultSha256: string;
  comparisonHumanReviewResultV002Sha256: string;
  candidateResponseSchema: string;
  videoPrototypeResultSchema: string;
  comparisonHumanReviewResultV002Schema: string;
} {
  const candidateResponseSha256 = sha256(input.candidateResponseBytes);
  const videoPrototypeResultSha256 = sha256(input.videoPrototypeResultBytes);
  const comparisonHumanReviewResultV002Sha256 =
    sha256(input.comparisonHumanReviewResultV002Bytes);
  assertExpectedSha(
    candidateResponseSha256,
    input.expectedCandidateResponseSha256,
    '対象正式候補'
  );
  assertExpectedSha(
    videoPrototypeResultSha256,
    input.expectedVideoPrototypeResultSha256,
    '対象試作動画結果'
  );
  assertExpectedSha(
    comparisonHumanReviewResultV002Sha256,
    input.expectedComparisonHumanReviewResultV002Sha256,
    '比較用人間評価v002'
  );

  const candidateResponse = parseJson(input.candidateResponseBytes, '対象正式候補');
  if (candidateResponse.schemaVersion !== 'distant-connection-luna-response-v001') {
    fail('対象正式候補のschemaが不正です');
  }
  candidateIds(candidateResponse, '対象正式候補');

  const videoPrototypeResult = parseJson(input.videoPrototypeResultBytes, '対象試作動画結果');
  if (videoPrototypeResult.schemaVersion !==
      'distant-connection-video-intervalization-improvement-result-v001'
    || videoPrototypeResult.sourceVideoId !== 'ymUsGrT6EaA'
    || !isRecord(videoPrototypeResult.sourceBindings)
    || !isRecord(videoPrototypeResult.sourceBindings.candidateResponse)
    || videoPrototypeResult.sourceBindings.candidateResponse.path !== input.candidateResponsePath
    || videoPrototypeResult.sourceBindings.candidateResponse.fileSha256 !== candidateResponseSha256
    || !isRecord(videoPrototypeResult.qc)
    || videoPrototypeResult.qc.status !== 'passed') {
    fail('対象試作動画結果のschema・正式候補binding・QCが不正です');
  }
  candidateIds(videoPrototypeResult, '対象試作動画結果');

  const comparison = parseJson(
    input.comparisonHumanReviewResultV002Bytes,
    '比較用人間評価v002'
  );
  if (comparison.schemaVersion !== 'distant-connection-human-review-result-v002'
    || comparison.sourceVideoId !== 'ymUsGrT6EaA'
    || comparison.reviewer !== 'kawafmm'
    || comparison.candidateCount !== 2
    || !Array.isArray(comparison.candidateReviews)
    || !comparison.candidateReviews.some((review) => isRecord(review)
      && review.candidateId === 'camera-fear-escalation'
      && review.candidateSelection === 'pass'
      && review.originalIntervalization === 'fail'
      && review.improvedIntervalization === 'pass')) {
    fail('比較用人間評価v002が合格例camera-fear-escalationを保持していません');
  }

  return {
    candidateResponseSha256,
    videoPrototypeResultSha256,
    comparisonHumanReviewResultV002Sha256,
    candidateResponseSchema: candidateResponse.schemaVersion as string,
    videoPrototypeResultSchema: videoPrototypeResult.schemaVersion as string,
    comparisonHumanReviewResultV002Schema: comparison.schemaVersion as string
  };
}

function expectedReviews(): DistantConnectionHumanReviewResultV003['candidateReviews'] {
  return CANDIDATE_IDS.map((candidateId) => ({
    candidateId,
    candidateSelection: 'fail' as const,
    primaryCause: 'candidate-selection' as const,
    reason: REASONS[candidateId]
  }));
}

export function buildDistantConnectionHumanReviewResultV003(
  input: BuildDistantConnectionHumanReviewResultV003Input
): DistantConnectionHumanReviewResultV003 {
  const sources = inspectSources(input);
  return {
    schemaVersion: DISTANT_CONNECTION_HUMAN_REVIEW_RESULT_SCHEMA_V003,
    sourceVideoId: 'ymUsGrT6EaA',
    reviewedAt: '2026-08-27',
    reviewer: 'kawafmm',
    sourceBindings: {
      candidateResponse: {
        path: input.candidateResponsePath,
        schemaVersion: sources.candidateResponseSchema,
        fileSha256: sources.candidateResponseSha256
      },
      videoPrototypeResult: {
        path: input.videoPrototypeResultPath,
        schemaVersion: sources.videoPrototypeResultSchema,
        fileSha256: sources.videoPrototypeResultSha256
      },
      comparisonHumanReviewResultV002: {
        path: input.comparisonHumanReviewResultV002Path,
        schemaVersion: sources.comparisonHumanReviewResultV002Schema,
        fileSha256: sources.comparisonHumanReviewResultV002Sha256
      }
    },
    candidateCount: 3,
    candidateReviews: expectedReviews(),
    selectionPrinciple: SELECTION_PRINCIPLE,
    comparisonDistinction: COMPARISON_DISTINCTION
  };
}

export function assertDistantConnectionHumanReviewResultV003(
  value: unknown
): asserts value is DistantConnectionHumanReviewResultV003 {
  if (!isRecord(value) || !hasExactKeys(value, [
    'schemaVersion', 'sourceVideoId', 'reviewedAt', 'reviewer', 'sourceBindings',
    'candidateCount', 'candidateReviews', 'selectionPrinciple', 'comparisonDistinction'
  ])
    || value.schemaVersion !== DISTANT_CONNECTION_HUMAN_REVIEW_RESULT_SCHEMA_V003
    || value.sourceVideoId !== 'ymUsGrT6EaA'
    || value.reviewedAt !== '2026-08-27'
    || value.reviewer !== 'kawafmm'
    || value.candidateCount !== 3
    || value.selectionPrinciple !== SELECTION_PRINCIPLE
    || value.comparisonDistinction !== COMPARISON_DISTINCTION
    || !isRecord(value.sourceBindings)
    || !hasExactKeys(value.sourceBindings, [
      'candidateResponse', 'videoPrototypeResult', 'comparisonHumanReviewResultV002'
    ])
    || !Array.isArray(value.candidateReviews)
    || JSON.stringify(value.candidateReviews) !== JSON.stringify(expectedReviews())) {
    fail('人間評価v003の構造・固定値・評価内容が不正です');
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
}

export function serializeDistantConnectionHumanReviewResultV003(
  result: DistantConnectionHumanReviewResultV003
): Buffer {
  assertDistantConnectionHumanReviewResultV003(result);
  return Buffer.from(`${JSON.stringify(result, null, 2)}\n`, 'utf8');
}

export function validateDistantConnectionHumanReviewResultAgainstSourcesV003(
  result: DistantConnectionHumanReviewResultV003,
  input: BuildDistantConnectionHumanReviewResultV003Input
): void {
  assertDistantConnectionHumanReviewResultV003(result);
  const rebuilt = buildDistantConnectionHumanReviewResultV003(input);
  if (JSON.stringify(result) !== JSON.stringify(rebuilt)) {
    fail('人間評価v003が指定された3正本からの決定的再生成結果と一致しません');
  }
}

export async function buildDistantConnectionHumanReviewResultV003FromFiles(
  input: BuildDistantConnectionHumanReviewResultV003FromFilesInput
): Promise<DistantConnectionHumanReviewResultV003> {
  const [candidateResponseBytes, videoPrototypeResultBytes,
    comparisonHumanReviewResultV002Bytes] = await Promise.all([
    readFile(path.join(input.workspaceRoot, input.candidateResponsePath)),
    readFile(path.join(input.workspaceRoot, input.videoPrototypeResultPath)),
    readFile(path.join(input.workspaceRoot, input.comparisonHumanReviewResultV002Path))
  ]);
  return buildDistantConnectionHumanReviewResultV003({
    candidateResponsePath: input.candidateResponsePath,
    candidateResponseBytes,
    expectedCandidateResponseSha256: input.expectedCandidateResponseSha256,
    videoPrototypeResultPath: input.videoPrototypeResultPath,
    videoPrototypeResultBytes,
    expectedVideoPrototypeResultSha256: input.expectedVideoPrototypeResultSha256,
    comparisonHumanReviewResultV002Path: input.comparisonHumanReviewResultV002Path,
    comparisonHumanReviewResultV002Bytes,
    expectedComparisonHumanReviewResultV002Sha256:
      input.expectedComparisonHumanReviewResultV002Sha256
  });
}

export async function writeDistantConnectionHumanReviewResultV003FromFiles(
  input: BuildDistantConnectionHumanReviewResultV003FromFilesInput & {outputPath: string}
): Promise<DistantConnectionHumanReviewResultV003> {
  const result = await buildDistantConnectionHumanReviewResultV003FromFiles(input);
  const outputAbsolute = path.join(input.workspaceRoot, input.outputPath);
  await mkdir(path.dirname(outputAbsolute), {recursive: true});
  await writeFile(outputAbsolute, serializeDistantConnectionHumanReviewResultV003(result), {
    flag: 'wx'
  });
  return result;
}
