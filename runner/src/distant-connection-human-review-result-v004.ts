import {createHash} from 'node:crypto';
import {mkdir, readFile, writeFile} from 'node:fs/promises';
import path from 'node:path';

export const DISTANT_CONNECTION_HUMAN_REVIEW_RESULT_SCHEMA_V004 =
  'distant-connection-human-review-result-v004';

export class DistantConnectionHumanReviewResultErrorV004 extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DistantConnectionHumanReviewResultErrorV004';
  }
}

type Binding = {path: string; schemaVersion: string; fileSha256: string};
type RecordValue = Record<string, unknown>;

type CandidateReviewV004 = {
  candidateId:
    | 'candidate-horror-claim-to-speed-up'
    | 'candidate-doctor-disappearance-to-ogre-mother';
  connectionValidity: 'pass';
  payoffStrength: 'fail' | 'story-level-pass';
  visualSuitability: 'not-primary-cause' | 'fail';
  finalDecision: 'fail';
  reason: string;
};

export type DistantConnectionHumanReviewResultV004 = {
  schemaVersion: typeof DISTANT_CONNECTION_HUMAN_REVIEW_RESULT_SCHEMA_V004;
  sourceVideoId: 'ymUsGrT6EaA';
  reviewedAt: '2026-08-29';
  reviewer: 'kawafmm';
  sourceBindings: {
    candidateResponse: Binding;
    videoPrototypeResult: Binding;
  };
  candidateCount: 2;
  candidateReviews: CandidateReviewV004[];
  responsibilityPrinciple: string;
};

export type BuildDistantConnectionHumanReviewResultV004Input = {
  candidateResponsePath: string;
  candidateResponseBytes: Uint8Array;
  expectedCandidateResponseSha256: string;
  videoPrototypeResultPath: string;
  videoPrototypeResultBytes: Uint8Array;
  expectedVideoPrototypeResultSha256: string;
};

export type BuildDistantConnectionHumanReviewResultV004FromFilesInput = {
  workspaceRoot: string;
  candidateResponsePath: string;
  expectedCandidateResponseSha256: string;
  videoPrototypeResultPath: string;
  expectedVideoPrototypeResultSha256: string;
};

const SHA256 = /^[0-9a-f]{64}$/u;
const CANDIDATE_IDS = [
  'candidate-horror-claim-to-speed-up',
  'candidate-doctor-disappearance-to-ogre-mother'
] as const;
const RESPONSIBILITY_PRINCIPLE =
  '接続成立・回収強度・映像適性を別々に人間評価し、最終採否を独立して保持する。Lunaは映像適性の正式所有者ではなく、試作動画を確認した人間評価が最終採否を所有する。';
const REASONS = Object.freeze({
  'candidate-horror-claim-to-speed-up':
    '接続関係自体はある。ただし後半の恐怖場面・反応が弱く、「今年一怖い」という前振りに対する回収強度が不足している。意味接続と具体的回収の存在だけでは採用価値を保証できない。',
  'candidate-doctor-disappearance-to-ogre-mother':
    '物語上の意味接続はある。ただし前後とも文字情報中心で、映像としての変化・反応・魅力が弱い。意味的には成立していてもショート動画として弱い。'
});

function fail(message: string): never {
  throw new DistantConnectionHumanReviewResultErrorV004(message);
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
    if (error instanceof DistantConnectionHumanReviewResultErrorV004) throw error;
    fail(`${label}がJSONとして読めません`);
  }
}

function assertExpectedSha(actual: string, expected: string, label: string): void {
  if (!SHA256.test(expected) || actual !== expected) {
    fail(`${label}のSHA-256が指定正本と一致しません`);
  }
}

function assertCandidateIds(value: RecordValue, label: string): void {
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
    fail(`${label}の候補IDまたは順序が今回2候補と一致しません`);
  }
}

function expectedReviews(): CandidateReviewV004[] {
  return [
    {
      candidateId: 'candidate-horror-claim-to-speed-up',
      connectionValidity: 'pass',
      payoffStrength: 'fail',
      visualSuitability: 'not-primary-cause',
      finalDecision: 'fail',
      reason: REASONS['candidate-horror-claim-to-speed-up']
    },
    {
      candidateId: 'candidate-doctor-disappearance-to-ogre-mother',
      connectionValidity: 'pass',
      payoffStrength: 'story-level-pass',
      visualSuitability: 'fail',
      finalDecision: 'fail',
      reason: REASONS['candidate-doctor-disappearance-to-ogre-mother']
    }
  ];
}

function inspectSources(input: BuildDistantConnectionHumanReviewResultV004Input): {
  candidateResponseSha256: string;
  videoPrototypeResultSha256: string;
  candidateResponseSchema: string;
  videoPrototypeResultSchema: string;
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
    '対象試作動画結果'
  );

  const candidateResponse = parseJson(input.candidateResponseBytes, '対象正式候補');
  if (candidateResponse.schemaVersion !== 'distant-connection-luna-response-v001') {
    fail('対象正式候補のschemaが不正です');
  }
  assertCandidateIds(candidateResponse, '対象正式候補');

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
  assertCandidateIds(videoPrototypeResult, '対象試作動画結果');
  const videoCandidates = videoPrototypeResult.candidates;
  if (!Array.isArray(videoCandidates)) {
    fail('対象試作動画結果の候補列が不正です');
  }
  for (const [index, candidate] of videoCandidates.entries()) {
    if (!isRecord(candidate)
      || !isRecord(candidate.video)
      || typeof candidate.video.fileSha256 !== 'string'
      || !SHA256.test(candidate.video.fileSha256)
      || !isRecord(candidate.qc)
      || candidate.qc.status !== 'passed') {
      fail(`対象試作動画結果の候補${index + 1}件目の動画bindingまたはQCが不正です`);
    }
  }

  return {
    candidateResponseSha256,
    videoPrototypeResultSha256,
    candidateResponseSchema: candidateResponse.schemaVersion as string,
    videoPrototypeResultSchema: videoPrototypeResult.schemaVersion as string
  };
}

export function buildDistantConnectionHumanReviewResultV004(
  input: BuildDistantConnectionHumanReviewResultV004Input
): DistantConnectionHumanReviewResultV004 {
  const sources = inspectSources(input);
  return {
    schemaVersion: DISTANT_CONNECTION_HUMAN_REVIEW_RESULT_SCHEMA_V004,
    sourceVideoId: 'ymUsGrT6EaA',
    reviewedAt: '2026-08-29',
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
      }
    },
    candidateCount: 2,
    candidateReviews: expectedReviews(),
    responsibilityPrinciple: RESPONSIBILITY_PRINCIPLE
  };
}

export function assertDistantConnectionHumanReviewResultV004(
  value: unknown
): asserts value is DistantConnectionHumanReviewResultV004 {
  if (!isRecord(value) || !hasExactKeys(value, [
    'schemaVersion', 'sourceVideoId', 'reviewedAt', 'reviewer', 'sourceBindings',
    'candidateCount', 'candidateReviews', 'responsibilityPrinciple'
  ])
    || value.schemaVersion !== DISTANT_CONNECTION_HUMAN_REVIEW_RESULT_SCHEMA_V004
    || value.sourceVideoId !== 'ymUsGrT6EaA'
    || value.reviewedAt !== '2026-08-29'
    || value.reviewer !== 'kawafmm'
    || value.candidateCount !== 2
    || value.responsibilityPrinciple !== RESPONSIBILITY_PRINCIPLE
    || !isRecord(value.sourceBindings)
    || !hasExactKeys(value.sourceBindings, ['candidateResponse', 'videoPrototypeResult'])
    || !Array.isArray(value.candidateReviews)
    || JSON.stringify(value.candidateReviews) !== JSON.stringify(expectedReviews())) {
    fail('人間評価v004の構造・固定値・評価内容が不正です');
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

export function serializeDistantConnectionHumanReviewResultV004(
  result: DistantConnectionHumanReviewResultV004
): Buffer {
  assertDistantConnectionHumanReviewResultV004(result);
  return Buffer.from(`${JSON.stringify(result, null, 2)}\n`, 'utf8');
}

export function validateDistantConnectionHumanReviewResultAgainstSourcesV004(
  result: DistantConnectionHumanReviewResultV004,
  input: BuildDistantConnectionHumanReviewResultV004Input
): void {
  assertDistantConnectionHumanReviewResultV004(result);
  const rebuilt = buildDistantConnectionHumanReviewResultV004(input);
  if (JSON.stringify(result) !== JSON.stringify(rebuilt)) {
    fail('人間評価v004が指定された2正本からの決定的再生成結果と一致しません');
  }
}

export async function buildDistantConnectionHumanReviewResultV004FromFiles(
  input: BuildDistantConnectionHumanReviewResultV004FromFilesInput
): Promise<DistantConnectionHumanReviewResultV004> {
  const [candidateResponseBytes, videoPrototypeResultBytes] = await Promise.all([
    readFile(path.join(input.workspaceRoot, input.candidateResponsePath)),
    readFile(path.join(input.workspaceRoot, input.videoPrototypeResultPath))
  ]);
  return buildDistantConnectionHumanReviewResultV004({
    candidateResponsePath: input.candidateResponsePath,
    candidateResponseBytes,
    expectedCandidateResponseSha256: input.expectedCandidateResponseSha256,
    videoPrototypeResultPath: input.videoPrototypeResultPath,
    videoPrototypeResultBytes,
    expectedVideoPrototypeResultSha256: input.expectedVideoPrototypeResultSha256
  });
}

export async function writeDistantConnectionHumanReviewResultV004FromFiles(
  input: BuildDistantConnectionHumanReviewResultV004FromFilesInput & {outputPath: string}
): Promise<DistantConnectionHumanReviewResultV004> {
  const result = await buildDistantConnectionHumanReviewResultV004FromFiles(input);
  const outputAbsolute = path.join(input.workspaceRoot, input.outputPath);
  await mkdir(path.dirname(outputAbsolute), {recursive: true});
  await writeFile(outputAbsolute, serializeDistantConnectionHumanReviewResultV004(result), {
    flag: 'wx'
  });
  return result;
}
