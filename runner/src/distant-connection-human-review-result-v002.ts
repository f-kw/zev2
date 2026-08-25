import {createHash} from 'node:crypto';
import {mkdir, readFile, writeFile} from 'node:fs/promises';
import path from 'node:path';

export const DISTANT_CONNECTION_HUMAN_REVIEW_RESULT_SCHEMA_V002 =
  'distant-connection-human-review-result-v002';

export class DistantConnectionHumanReviewResultErrorV002 extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DistantConnectionHumanReviewResultErrorV002';
  }
}

type PassFail = 'pass' | 'fail';
type Binding = {path: string; schemaVersion: string; fileSha256: string};
type RecordValue = Record<string, unknown>;

export type DistantConnectionHumanReviewResultV002 = {
  schemaVersion: typeof DISTANT_CONNECTION_HUMAN_REVIEW_RESULT_SCHEMA_V002;
  sourceVideoId: 'ymUsGrT6EaA';
  reviewedAt: '2026-08-25';
  reviewer: 'kawafmm';
  sourceBindings: {
    candidateResponse: Binding;
    originalVideoPrototypeResult: Binding;
    intervalizationImprovementResult: Binding;
  };
  candidateCount: 2;
  candidateReviews: Array<{
    candidateId: 'camera-fear-escalation' | 'medicine-effect-payoff';
    candidateSelection: PassFail;
    originalIntervalization: PassFail;
    improvedIntervalization: PassFail;
    shortFormViability: PassFail;
    classification: 'accepted-distant-connection-example' | 'rejected-short-form-candidate';
    reason: string;
    shortFormAssessment: string;
  }>;
  selectionPrinciple: string;
};

export type BuildDistantConnectionHumanReviewResultV002Input = {
  candidateResponsePath: string;
  candidateResponseBytes: Uint8Array;
  expectedCandidateResponseSha256: string;
  originalVideoPrototypeResultPath: string;
  originalVideoPrototypeResultBytes: Uint8Array;
  expectedOriginalVideoPrototypeResultSha256: string;
  intervalizationImprovementResultPath: string;
  intervalizationImprovementResultBytes: Uint8Array;
  expectedIntervalizationImprovementResultSha256: string;
};

export type BuildDistantConnectionHumanReviewResultV002FromFilesInput = {
  workspaceRoot: string;
  candidateResponsePath: string;
  expectedCandidateResponseSha256: string;
  originalVideoPrototypeResultPath: string;
  expectedOriginalVideoPrototypeResultSha256: string;
  intervalizationImprovementResultPath: string;
  expectedIntervalizationImprovementResultSha256: string;
};

const SHA256 = /^[0-9a-f]{64}$/u;
const CANDIDATE_IDS = ['camera-fear-escalation', 'medicine-effect-payoff'] as const;
const SELECTION_PRINCIPLE =
  '前半と後半の意味関係を理解するために必要な前提情報が、短尺動画として自然な長さに収まること。前提情報が複雑で長い説明区間を必要とする候補は、意味的接続が存在していても除外する。';
const CAMERA_REASON =
  '旧版では発話の原因となる重要な恐怖映像を落としていた。区間化改善によって必要な映像を含めた結果、前半との接続が理解でき、遠方接続として成立した。';
const CAMERA_SHORT_FORM =
  '必要な恐怖映像と反応を短尺として自然な長さに含められる。';
const MEDICINE_REASON =
  '区間化不良の診断と改善は正しかった。しかし改善後でも接続理解に必要な前提情報が多すぎ、説明と文脈をさらに長くすると動画のテンポを損なうため、遠方接続候補として不採用とする。';
const MEDICINE_SHORT_FORM =
  '接続を理解するための前提情報が短尺として自然な長さに収まらない。これ以上の区間拡張は行わない。';

function fail(message: string): never {
  throw new DistantConnectionHumanReviewResultErrorV002(message);
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
    if (error instanceof DistantConnectionHumanReviewResultErrorV002) throw error;
    fail(`${label}がJSONとして読めません`);
  }
}

function assertExpectedSha(actual: string, expected: string, label: string): void {
  if (!SHA256.test(expected) || actual !== expected) {
    fail(`${label}のSHA-256が指定正本と一致しません`);
  }
}

function assertCandidateBinding(
  sourceBindings: unknown,
  candidateResponsePath: string,
  candidateResponseSha256: string,
  label: string
): void {
  if (!isRecord(sourceBindings) || !isRecord(sourceBindings.candidateResponse)
    || sourceBindings.candidateResponse.path !== candidateResponsePath
    || sourceBindings.candidateResponse.fileSha256 !== candidateResponseSha256) {
    fail(`${label}の正式候補bindingが一致しません`);
  }
}

function summarizeCandidates(value: RecordValue, label: string): string[] {
  if (value.sourceVideoId !== 'ymUsGrT6EaA'
    || !Array.isArray(value.candidates)
    || value.candidateCount !== value.candidates.length) {
    fail(`${label}の動画IDまたは候補件数が不正です`);
  }
  const ids = value.candidates.map((candidate, index) => {
    if (!isRecord(candidate) || typeof candidate.candidateId !== 'string') {
      fail(`${label}の候補${index + 1}件目が不正です`);
    }
    return candidate.candidateId;
  });
  if (JSON.stringify(ids) !== JSON.stringify(CANDIDATE_IDS)) {
    fail(`${label}の候補IDまたは順序が正式2候補と一致しません`);
  }
  return ids;
}

function inspectSources(input: BuildDistantConnectionHumanReviewResultV002Input): {
  candidateResponseSha256: string;
  originalVideoPrototypeResultSha256: string;
  intervalizationImprovementResultSha256: string;
  candidateResponseSchema: string;
  originalVideoPrototypeResultSchema: string;
  intervalizationImprovementResultSchema: string;
} {
  const candidateResponseSha256 = sha256(input.candidateResponseBytes);
  const originalVideoPrototypeResultSha256 = sha256(input.originalVideoPrototypeResultBytes);
  const intervalizationImprovementResultSha256 =
    sha256(input.intervalizationImprovementResultBytes);
  assertExpectedSha(
    candidateResponseSha256,
    input.expectedCandidateResponseSha256,
    '正式候補成果物'
  );
  assertExpectedSha(
    originalVideoPrototypeResultSha256,
    input.expectedOriginalVideoPrototypeResultSha256,
    '旧動画試作結果'
  );
  assertExpectedSha(
    intervalizationImprovementResultSha256,
    input.expectedIntervalizationImprovementResultSha256,
    '区間化改善結果'
  );

  const candidateResponse = parseJson(input.candidateResponseBytes, '正式候補成果物');
  if (candidateResponse.schemaVersion !== 'distant-connection-luna-response-v001'
    || candidateResponse.sourceVideoId !== 'ymUsGrT6EaA'
    || !Array.isArray(candidateResponse.candidates)) {
    fail('正式候補成果物のschemaまたは動画IDが不正です');
  }
  const candidateIds = candidateResponse.candidates.map((candidate, index) => {
    if (!isRecord(candidate) || typeof candidate.candidateId !== 'string') {
      fail(`正式候補${index + 1}件目が不正です`);
    }
    return candidate.candidateId;
  });
  if (JSON.stringify(candidateIds) !== JSON.stringify(CANDIDATE_IDS)) {
    fail('正式候補成果物が評価対象2候補と一致しません');
  }

  const original = parseJson(input.originalVideoPrototypeResultBytes, '旧動画試作結果');
  if (original.schemaVersion !== 'distant-connection-video-prototype-result-v001'
    || !isRecord(original.qc) || original.qc.status !== 'passed') {
    fail('旧動画試作結果が正式な合格成果物ではありません');
  }
  assertCandidateBinding(
    original.sourceBindings,
    input.candidateResponsePath,
    candidateResponseSha256,
    '旧動画試作結果'
  );
  summarizeCandidates(original, '旧動画試作結果');

  const improved = parseJson(
    input.intervalizationImprovementResultBytes,
    '区間化改善結果'
  );
  if (improved.schemaVersion !==
      'distant-connection-video-intervalization-improvement-result-v001'
    || !isRecord(improved.qc) || improved.qc.status !== 'passed') {
    fail('区間化改善結果が正式な合格成果物ではありません');
  }
  assertCandidateBinding(
    improved.sourceBindings,
    input.candidateResponsePath,
    candidateResponseSha256,
    '区間化改善結果'
  );
  summarizeCandidates(improved, '区間化改善結果');

  return {
    candidateResponseSha256,
    originalVideoPrototypeResultSha256,
    intervalizationImprovementResultSha256,
    candidateResponseSchema: candidateResponse.schemaVersion as string,
    originalVideoPrototypeResultSchema: original.schemaVersion as string,
    intervalizationImprovementResultSchema: improved.schemaVersion as string
  };
}

export function buildDistantConnectionHumanReviewResultV002(
  input: BuildDistantConnectionHumanReviewResultV002Input
): DistantConnectionHumanReviewResultV002 {
  const sources = inspectSources(input);
  return {
    schemaVersion: DISTANT_CONNECTION_HUMAN_REVIEW_RESULT_SCHEMA_V002,
    sourceVideoId: 'ymUsGrT6EaA',
    reviewedAt: '2026-08-25',
    reviewer: 'kawafmm',
    sourceBindings: {
      candidateResponse: {
        path: input.candidateResponsePath,
        schemaVersion: sources.candidateResponseSchema,
        fileSha256: sources.candidateResponseSha256
      },
      originalVideoPrototypeResult: {
        path: input.originalVideoPrototypeResultPath,
        schemaVersion: sources.originalVideoPrototypeResultSchema,
        fileSha256: sources.originalVideoPrototypeResultSha256
      },
      intervalizationImprovementResult: {
        path: input.intervalizationImprovementResultPath,
        schemaVersion: sources.intervalizationImprovementResultSchema,
        fileSha256: sources.intervalizationImprovementResultSha256
      }
    },
    candidateCount: 2,
    candidateReviews: [
      {
        candidateId: 'camera-fear-escalation',
        candidateSelection: 'pass',
        originalIntervalization: 'fail',
        improvedIntervalization: 'pass',
        shortFormViability: 'pass',
        classification: 'accepted-distant-connection-example',
        reason: CAMERA_REASON,
        shortFormAssessment: CAMERA_SHORT_FORM
      },
      {
        candidateId: 'medicine-effect-payoff',
        candidateSelection: 'fail',
        originalIntervalization: 'fail',
        improvedIntervalization: 'pass',
        shortFormViability: 'fail',
        classification: 'rejected-short-form-candidate',
        reason: MEDICINE_REASON,
        shortFormAssessment: MEDICINE_SHORT_FORM
      }
    ],
    selectionPrinciple: SELECTION_PRINCIPLE
  };
}

export function assertDistantConnectionHumanReviewResultV002(
  value: unknown
): asserts value is DistantConnectionHumanReviewResultV002 {
  if (!isRecord(value) || !hasExactKeys(value, [
    'schemaVersion', 'sourceVideoId', 'reviewedAt', 'reviewer', 'sourceBindings',
    'candidateCount', 'candidateReviews', 'selectionPrinciple'
  ])) fail('人間評価v002のroot構造が不正です');
  if (value.schemaVersion !== DISTANT_CONNECTION_HUMAN_REVIEW_RESULT_SCHEMA_V002
    || value.sourceVideoId !== 'ymUsGrT6EaA'
    || value.reviewedAt !== '2026-08-25'
    || value.reviewer !== 'kawafmm'
    || value.candidateCount !== 2
    || value.selectionPrinciple !== SELECTION_PRINCIPLE
    || !isRecord(value.sourceBindings)
    || !hasExactKeys(value.sourceBindings, [
      'candidateResponse', 'originalVideoPrototypeResult', 'intervalizationImprovementResult'
    ])
    || !Array.isArray(value.candidateReviews)
    || value.candidateReviews.length !== 2) {
    fail('人間評価v002の固定値または件数が不正です');
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
  const expected = buildExpectedReviews();
  if (JSON.stringify(value.candidateReviews) !== JSON.stringify(expected)) {
    fail('人間評価v002の候補別評価がkawafmm評価と一致しません');
  }
}

function buildExpectedReviews(): DistantConnectionHumanReviewResultV002['candidateReviews'] {
  return [
    {
      candidateId: 'camera-fear-escalation', candidateSelection: 'pass',
      originalIntervalization: 'fail', improvedIntervalization: 'pass',
      shortFormViability: 'pass', classification: 'accepted-distant-connection-example',
      reason: CAMERA_REASON, shortFormAssessment: CAMERA_SHORT_FORM
    },
    {
      candidateId: 'medicine-effect-payoff', candidateSelection: 'fail',
      originalIntervalization: 'fail', improvedIntervalization: 'pass',
      shortFormViability: 'fail', classification: 'rejected-short-form-candidate',
      reason: MEDICINE_REASON, shortFormAssessment: MEDICINE_SHORT_FORM
    }
  ];
}

export function serializeDistantConnectionHumanReviewResultV002(
  result: DistantConnectionHumanReviewResultV002
): Buffer {
  assertDistantConnectionHumanReviewResultV002(result);
  return Buffer.from(`${JSON.stringify(result, null, 2)}\n`, 'utf8');
}

export function validateDistantConnectionHumanReviewResultAgainstSourcesV002(
  result: DistantConnectionHumanReviewResultV002,
  input: BuildDistantConnectionHumanReviewResultV002Input
): void {
  assertDistantConnectionHumanReviewResultV002(result);
  const rebuilt = buildDistantConnectionHumanReviewResultV002(input);
  if (JSON.stringify(result) !== JSON.stringify(rebuilt)) {
    fail('人間評価v002が指定された3正本からの決定的再生成結果と一致しません');
  }
}

export async function buildDistantConnectionHumanReviewResultV002FromFiles(
  input: BuildDistantConnectionHumanReviewResultV002FromFilesInput
): Promise<DistantConnectionHumanReviewResultV002> {
  const [candidateResponseBytes, originalVideoPrototypeResultBytes,
    intervalizationImprovementResultBytes] = await Promise.all([
    readFile(path.join(input.workspaceRoot, input.candidateResponsePath)),
    readFile(path.join(input.workspaceRoot, input.originalVideoPrototypeResultPath)),
    readFile(path.join(input.workspaceRoot, input.intervalizationImprovementResultPath))
  ]);
  return buildDistantConnectionHumanReviewResultV002({
    candidateResponsePath: input.candidateResponsePath,
    candidateResponseBytes,
    expectedCandidateResponseSha256: input.expectedCandidateResponseSha256,
    originalVideoPrototypeResultPath: input.originalVideoPrototypeResultPath,
    originalVideoPrototypeResultBytes,
    expectedOriginalVideoPrototypeResultSha256:
      input.expectedOriginalVideoPrototypeResultSha256,
    intervalizationImprovementResultPath: input.intervalizationImprovementResultPath,
    intervalizationImprovementResultBytes,
    expectedIntervalizationImprovementResultSha256:
      input.expectedIntervalizationImprovementResultSha256
  });
}

export async function writeDistantConnectionHumanReviewResultV002FromFiles(
  input: BuildDistantConnectionHumanReviewResultV002FromFilesInput & {outputPath: string}
): Promise<DistantConnectionHumanReviewResultV002> {
  const result = await buildDistantConnectionHumanReviewResultV002FromFiles(input);
  const outputAbsolute = path.join(input.workspaceRoot, input.outputPath);
  await mkdir(path.dirname(outputAbsolute), {recursive: true});
  await writeFile(outputAbsolute, serializeDistantConnectionHumanReviewResultV002(result));
  return result;
}
