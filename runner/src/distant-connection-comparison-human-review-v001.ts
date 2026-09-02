import {createHash} from 'node:crypto';
import {mkdir, readFile, writeFile} from 'node:fs/promises';
import path from 'node:path';

import {
  DISTANT_CONNECTION_COMPARISON_B6_RUN_MANIFEST_SCHEMA_V001,
  DISTANT_CONNECTION_COMPARISON_CANDIDATE_RESPONSE_SCHEMA_V001,
  assertDistantConnectionComparisonB6RunManifestV001,
  type DistantConnectionComparisonB6RunManifestV001
} from './distant-connection-comparison-luna-b6-result-v001.js';
import {DISTANT_CONNECTION_COMPARISON_EXACT_REQUEST_SCHEMA_V001}
  from './distant-connection-comparison-luna-b5-local-v001.js';
import {
  DISTANT_CONNECTION_CANDIDATE_REVIEW_RESULT_SCHEMA_V002,
  assertDistantConnectionCandidateReviewResultV002
} from './distant-connection-candidate-review-v002.js';
import {
  DISTANT_CONNECTION_COMPARISON_SOURCE_PACKAGE_SCHEMA_V001,
  decodeDistantConnectionComparisonSourcePackageV001
} from './distant-connection-comparison-source-package-v001.js';

export const DISTANT_CONNECTION_COMPARISON_HUMAN_REVIEW_PLAN_SCHEMA_V001 =
  'distant-connection-comparison-human-review-plan-v001';
export const DISTANT_CONNECTION_COMPARISON_HUMAN_REVIEW_RESULT_SCHEMA_V001 =
  'distant-connection-comparison-human-review-result-v001';
export const DISTANT_CONNECTION_COMPARISON_DISCLOSURE_SEQUENCE_V001 = Object.freeze([
  'second-only',
  'first-then-second',
  'luna-reason'
] as const);

export const DISTANT_CONNECTION_COMPARISON_CONNECTION_TYPES_V001 = Object.freeze([
  '予告→実現',
  '断言→裏切り',
  '設置→使用',
  '認識→訂正',
  'その他'
] as const);

type RecordValue = Record<string, unknown>;
type Binding = {path: string; schemaVersion: string; fileSha256: string};
type SourceRole = 'new-stream' | 'old-stream';
type ReviewScope = 'primary' | 'supplementary';
type PassFail = 'pass' | 'fail';
type YesNo = 'yes' | 'no';
type ConnectionType = typeof DISTANT_CONNECTION_COMPARISON_CONNECTION_TYPES_V001[number];

type CandidateTarget = {
  candidateId: string;
  candidateOrdinal: number;
  reviewScope: ReviewScope;
};

type PrimaryTargetRule = {
  kind: 'formal-candidate-array-order-prefix';
  count: 5;
  rankingOrReranking: 'none';
};

type SupplementaryTargetRule = {
  kind: 'formal-candidate-array-order-remainder';
  metricAggregation: 'excluded-from-primary-A-to-E-except-known-good-rediscovery';
};

export type DistantConnectionComparisonHumanReviewPlanV001 = {
  schemaVersion: typeof DISTANT_CONNECTION_COMPARISON_HUMAN_REVIEW_PLAN_SCHEMA_V001;
  experimentId: string;
  sources: [
    {
      sourceRole: 'new-stream';
      sourceVideoId: 'o8rZAhARXAc';
      candidateResponseBinding: Binding;
      candidateArrayStatus: 'fixed-before-human-review';
      candidateCount: 7;
      primaryTargetRule: PrimaryTargetRule;
      supplementaryTargetRule: SupplementaryTargetRule;
      candidateTargets: CandidateTarget[];
    },
    {
      sourceRole: 'old-stream';
      sourceVideoId: 'ymUsGrT6EaA';
      exactRequestBinding: Binding;
      candidateArrayStatus: 'pending-single-authorized-b6';
      primaryTargetRule: PrimaryTargetRule;
      supplementaryTargetRule: SupplementaryTargetRule;
      candidateTargets: [];
    }
  ];
  disclosureSequence: [
    {
      stage: 'second-only';
      visible: ['second-part-review-mp4'];
      hidden: ['first-part-content', 'first-then-second-review-mp4', 'luna-reason'];
      requiredObservation: 'second-part-understanding';
    },
    {
      stage: 'first-then-second';
      visible: ['first-then-second-review-mp4'];
      hidden: ['luna-reason'];
      requiredObservation: 'concrete-meaning-increment';
    },
    {
      stage: 'luna-reason';
      visible: ['luna-added-understanding'];
      hidden: [];
      requiredObservation: 'reason-disclosure-assessment';
    }
  ];
  criteria: {
    A: {
      name: 'known-good-rediscovery';
      appliesTo: 'old-stream';
      knownGoodReference: 'camera-fear-escalation';
      successLabelExposedToLuna: false;
      aggregation: 'any-human-confirmed-equivalent-in-formal-candidate-array';
    };
    B: {
      name: 'general-introduction';
      definition: string;
      aggregation: 'primary-count-and-exact-ratio';
    };
    C: {
      name: 'concrete-meaning-increment';
      definition: string;
      aggregation: 'primary-pass-count-and-exact-ratio';
    };
    D: {
      name: 'top-five-connection-and-payoff';
      definition: string;
      aggregation: 'primary-both-pass-count-zero-to-five';
    };
    E: {
      name: 'want-to-make';
      definition: string;
      role: 'supplementary-metric';
      aggregation: 'primary-pass-count-and-exact-ratio';
    };
  };
  knownGoodReferenceEvidence: {
    sourceVideoId: 'ymUsGrT6EaA';
    candidateId: 'camera-fear-escalation';
    humanVerdict: 'accepted-after-intervalization-improvement';
    evidenceBindings: {
      humanReviewResult: Binding;
      candidateResponse: Binding;
      intervalizationImprovementResult: Binding;
    };
    modelInputUse: 'forbidden';
    modelInputNegativeAudit: {
      exactRequestBinding: Binding;
      auditedFields: ['instructions', 'input'];
      forbiddenStrings: Array<{
        kind:
          | 'known-good-candidate-id'
          | 'known-good-human-review-path'
          | 'known-good-human-review-sha256'
          | 'known-good-candidate-response-path'
          | 'known-good-candidate-response-sha256'
          | 'known-good-intervalization-result-path'
          | 'known-good-intervalization-result-sha256'
          | 'known-good-human-verdict-label'
          | 'known-good-human-classification-label'
          | 'known-good-criterion-label';
        value: string;
      }>;
      allAbsent: true;
    };
  };
  diagnostics: {
    connectionTypes: ConnectionType[];
    temporalDistanceUnit: 'milliseconds';
    secondPartCommentIncreaseOrigin: 'boolean';
    requiredVideoDurationUnit: 'milliseconds';
    diagnosticOnly: true;
  };
  comparisonPrinciple: {
    sameHumanProcedureForBothSources: true;
    candidateOrderOwner: 'formal-candidate-artifact';
    coefficients: 'none';
    rankingOrReranking: 'none';
    explorationChangeAfterSeeingNewCandidates: 'forbidden-until-comparison-complete';
  };
};

export type BuildDistantConnectionComparisonHumanReviewPlanV001Input = {
  experimentId: string;
  newCandidateResponsePath: string;
  newCandidateResponseBytes: Uint8Array;
  expectedNewCandidateResponseSha256: string;
  oldExactRequestPath: string;
  oldExactRequestBytes: Uint8Array;
  expectedOldExactRequestSha256: string;
  knownGoodHumanReviewResultPath: string;
  knownGoodHumanReviewResultBytes: Uint8Array;
  expectedKnownGoodHumanReviewResultSha256: string;
};

export type CandidateHumanComparisonReviewInputV001 = {
  candidateId: string;
  secondOnlyUnderstanding: string;
  concreteMeaningIncrement: PassFail;
  concreteMeaningIncrementDescription: string;
  lunaReasonDisclosureAssessment: string;
  meaningConnection: PassFail;
  payoffStrength: PassFail;
  wantToMake: PassFail;
  generalIntroduction: YesNo;
  knownGoodRediscovery: YesNo;
  connectionType: ConnectionType;
  requiredVideoDurationMs: number;
};

export type BuildComparisonSourceHumanReviewV001Input = {
  sourceRole: SourceRole;
  candidateResponsePath: string;
  candidateResponseBytes: Uint8Array;
  expectedCandidateResponseSha256: string;
  b6RunManifestPath: string;
  b6RunManifestBytes: Uint8Array;
  expectedB6RunManifestSha256: string;
  candidateReviewResultPath: string;
  candidateReviewResultBytes: Uint8Array;
  expectedCandidateReviewResultSha256: string;
  sourcePackagePath: string;
  sourcePackageBytes: Uint8Array;
  expectedSourcePackageSha256: string;
  candidateReviews: CandidateHumanComparisonReviewInputV001[];
};

type CandidateHumanComparisonReviewV001 = Omit<
  CandidateHumanComparisonReviewInputV001,
  'knownGoodRediscovery'
> & {
  knownGoodRediscovery: {
    decision: YesNo;
    referenceCandidateId: 'camera-fear-escalation';
    referenceHumanReviewResultSha256: string;
  };
  candidateOrdinal: number;
  reviewScope: ReviewScope;
  stageObservations: {
    secondOnly: {
      stage: 'second-only';
      understoodContent: string;
    };
    firstThenSecond: {
      stage: 'first-then-second';
      concreteMeaningIncrement: PassFail;
      concreteMeaningIncrementDescription: string;
    };
    lunaReason: {
      stage: 'luna-reason';
      assessment: string;
    };
  };
  diagnostics: {
    connectionType: ConnectionType;
    temporalDistanceMs: number;
    secondPartFromCommentIncreaseInterval: boolean;
    requiredVideoDurationMs: number;
  };
};

type ExactRatio = {numerator: number; denominator: number};
type PerSourceCountAndRatio = {
  sourceRole: SourceRole;
  primaryCandidateCount: number;
  passCount: number;
  ratio: ExactRatio;
};

export type DistantConnectionComparisonHumanReviewResultV001 = {
  schemaVersion: typeof DISTANT_CONNECTION_COMPARISON_HUMAN_REVIEW_RESULT_SCHEMA_V001;
  experimentId: string;
  reviewedAt: string;
  reviewer: string;
  planBinding: Binding;
  sources: Array<{
    sourceRole: SourceRole;
    sourceVideoId: string;
    sourceBindings: {
      candidateResponse: Binding;
      b6RunManifest: Binding;
      candidateReviewResult: Binding;
      sourcePackage: Binding;
    };
    candidateCount: number;
    primaryCandidateCount: number;
    candidateReviews: CandidateHumanComparisonReviewV001[];
  }>;
  metricAggregates: {
    A: {
      name: 'known-good-rediscovery';
      knownGoodReference: 'camera-fear-escalation';
      referenceHumanReviewResultSha256: string;
      rediscovered: YesNo;
      matchingCandidateIds: string[];
    };
    B: {
      name: 'general-introduction';
      sources: PerSourceCountAndRatio[];
    };
    C: {
      name: 'concrete-meaning-increment';
      sources: PerSourceCountAndRatio[];
    };
    D: {
      name: 'top-five-connection-and-payoff';
      sources: Array<{
        sourceRole: SourceRole;
        primaryCandidateCount: number;
        bothPassCount: number;
      }>;
    };
    E: {
      name: 'want-to-make';
      role: 'supplementary-metric';
      sources: PerSourceCountAndRatio[];
    };
  };
};

export type BuildDistantConnectionComparisonHumanReviewResultV001Input = {
  planPath: string;
  planBytes: Uint8Array;
  expectedPlanSha256: string;
  reviewedAt: string;
  reviewer: string;
  sources: [
    BuildComparisonSourceHumanReviewV001Input,
    BuildComparisonSourceHumanReviewV001Input
  ];
};

export class DistantConnectionComparisonHumanReviewErrorV001 extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DistantConnectionComparisonHumanReviewErrorV001';
  }
}

const SHA256 = /^[0-9a-f]{64}$/u;
const FORMAL_ID = /^[A-Za-z0-9][A-Za-z0-9._-]*$/u;
const WORKSPACE_RELATIVE_PATH =
  /^(?!\/)(?!\.\/)(?!.*(?:^|\/)\.\.(?:\/|$))(?!.*\\)(?!.*\/\/)[^\0]+$/u;
const ISO_DATETIME =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?(?:Z|[+-]\d{2}:\d{2})$/u;
const EXPECTED_SOURCE_ROLES = ['new-stream', 'old-stream'] as const;
const NEW_SOURCE_VIDEO_ID = 'o8rZAhARXAc';
const OLD_SOURCE_VIDEO_ID = 'ymUsGrT6EaA';
const NEW_CANDIDATE_COUNT = 7;
const PRIMARY_CANDIDATE_COUNT = 5;

const CRITERION_B_DEFINITION =
  '前半がゲーム名・ジャンル・一般的評判などの紹介だけで、特定の出来事・人物・物・判断・予告を含まない候補か。';
const CRITERION_C_DEFINITION =
  '後半単独の理解を先に記録し、前半→後半を見た後に、後半の読みが具体的にどう変わったかを記録できる場合だけpassとする。';
const CRITERION_D_DEFINITION =
  '正式candidate配列先頭5件のうち、意味的接続と回収の強さがどちらもpassの件数を0〜5で数える。';
const CRITERION_E_DEFINITION =
  '人間が遠方接続ショートとして実際に動画化したいかをpass/failで記録する。';

function fail(message: string): never {
  throw new DistantConnectionComparisonHumanReviewErrorV001(message);
}

function sha256(bytes: Uint8Array): string {
  return createHash('sha256').update(bytes).digest('hex');
}

function isRecord(value: unknown): value is RecordValue {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function hasExactKeys(value: RecordValue, keys: readonly string[]): boolean {
  const actual = Object.keys(value);
  return actual.length === keys.length && actual.every((key, index) => key === keys[index]);
}

function assertPath(value: unknown, label: string): asserts value is string {
  if (typeof value !== 'string' || !WORKSPACE_RELATIVE_PATH.test(value)) {
    fail(`${label}はworkspace相対pathである必要があります`);
  }
}

function assertFormalId(value: unknown, label: string): asserts value is string {
  if (typeof value !== 'string' || !FORMAL_ID.test(value)) fail(`${label}が不正です`);
}

function assertNonempty(value: unknown, label: string): asserts value is string {
  if (typeof value !== 'string' || value.trim().length === 0) fail(`${label}が空です`);
}

function assertExpectedSha(actual: string, expected: string, label: string): void {
  if (!SHA256.test(expected) || actual !== expected) {
    fail(`${label}のSHA-256が指定正本と一致しません`);
  }
}

function binding(pathValue: string, schemaVersion: string, bytes: Uint8Array): Binding {
  assertPath(pathValue, '成果物path');
  assertFormalId(schemaVersion, '成果物schema');
  return {path: pathValue, schemaVersion, fileSha256: sha256(bytes)};
}

function assertBinding(value: unknown, label: string): asserts value is Binding {
  if (!isRecord(value)
    || !hasExactKeys(value, ['path', 'schemaVersion', 'fileSha256'])) {
    fail(`${label}の構造が不正です`);
  }
  assertPath(value.path, `${label} path`);
  assertFormalId(value.schemaVersion, `${label} schema`);
  if (typeof value.fileSha256 !== 'string' || !SHA256.test(value.fileSha256)) {
    fail(`${label} SHA-256が不正です`);
  }
}

function parseJson(bytes: Uint8Array, label: string): RecordValue {
  try {
    const value: unknown = JSON.parse(Buffer.from(bytes).toString('utf8'));
    if (!isRecord(value)) fail(`${label}のrootがobjectではありません`);
    return value;
  } catch (error) {
    if (error instanceof DistantConnectionComparisonHumanReviewErrorV001) throw error;
    fail(`${label}がJSONとして読めません`);
  }
}

function assertCanonicalJson(bytes: Uint8Array, value: RecordValue, label: string): void {
  const canonical = Buffer.from(`${JSON.stringify(value, null, 2)}\n`, 'utf8');
  if (!canonical.equals(Buffer.from(bytes))) fail(`${label}がcanonical formal byteではありません`);
}

type ParsedCandidate = {
  candidateId: string;
  anchorId: string;
  firstPartUtteranceIds: string[];
  secondPartUtteranceIds: string[];
  addedUnderstanding: string;
  direction: 'past' | 'future';
};

function parseCandidateResponse(bytes: Uint8Array, label: string): {
  value: RecordValue;
  sourceVideoId: string;
  candidates: ParsedCandidate[];
} {
  const value = parseJson(bytes, label);
  if (!hasExactKeys(value, [
    'schemaVersion', 'sourceVideoId', 'sourcePackageBinding', 'indexedModelInputBinding',
    'rawResponseBinding', 'candidates'
  ])
    || value.schemaVersion !== DISTANT_CONNECTION_COMPARISON_CANDIDATE_RESPONSE_SCHEMA_V001
    || typeof value.sourceVideoId !== 'string'
    || value.sourceVideoId.length === 0
    || !Array.isArray(value.candidates)
    || value.candidates.length === 0) {
    fail(`${label}の正式candidate構造が不正です`);
  }
  assertBinding(value.sourcePackageBinding, `${label} source package binding`);
  assertBinding(value.indexedModelInputBinding, `${label} indexed input binding`);
  assertBinding(value.rawResponseBinding, `${label} raw response binding`);
  const seen = new Set<string>();
  const candidates = value.candidates.map((candidate, index) => {
    if (!isRecord(candidate)
      || !hasExactKeys(candidate, [
        'candidateId', 'anchorId', 'firstPartUtteranceIds', 'secondPartUtteranceIds',
        'addedUnderstanding', 'direction'
      ])
      || typeof candidate.candidateId !== 'string'
      || typeof candidate.anchorId !== 'string'
      || !Array.isArray(candidate.firstPartUtteranceIds)
      || !Array.isArray(candidate.secondPartUtteranceIds)
      || candidate.firstPartUtteranceIds.length === 0
      || candidate.secondPartUtteranceIds.length === 0
      || candidate.firstPartUtteranceIds.some((id) => typeof id !== 'string')
      || candidate.secondPartUtteranceIds.some((id) => typeof id !== 'string')
      || typeof candidate.addedUnderstanding !== 'string'
      || candidate.addedUnderstanding.trim().length === 0
      || !['past', 'future'].includes(candidate.direction as string)) {
      fail(`${label}の${index + 1}件目candidateが不正です`);
    }
    if (seen.has(candidate.candidateId)) fail(`${label}のcandidate IDが重複しています`);
    seen.add(candidate.candidateId);
    return {
      candidateId: candidate.candidateId,
      anchorId: candidate.anchorId,
      firstPartUtteranceIds: [...candidate.firstPartUtteranceIds] as string[],
      secondPartUtteranceIds: [...candidate.secondPartUtteranceIds] as string[],
      addedUnderstanding: candidate.addedUnderstanding,
      direction: candidate.direction as 'past' | 'future'
    };
  });
  assertCanonicalJson(bytes, value, label);
  return {value, sourceVideoId: value.sourceVideoId, candidates};
}

function inspectExactRequest(bytes: Uint8Array, label: string): {
  instructions: string;
  input: string;
} {
  const value = parseJson(bytes, label);
  if (!hasExactKeys(value, ['model', 'instructions', 'input', 'reasoning', 'text', 'store'])
    || value.model !== 'gpt-5.6-luna'
    || typeof value.instructions !== 'string'
    || typeof value.input !== 'string'
    || value.store !== false
    || !isRecord(value.reasoning)
    || !hasExactKeys(value.reasoning, ['effort'])
    || value.reasoning.effort !== 'medium'
    || !isRecord(value.text)
    || !hasExactKeys(value.text, ['format'])) {
    fail(`${label}のモデル・推論・固定request構造が不正です`);
  }
  assertCanonicalJson(bytes, value, label);
  return {instructions: value.instructions, input: value.input};
}

function buildKnownGoodModelInputNegativeAudit(
  requestText: {instructions: string; input: string},
  exactRequestBinding: Binding,
  knownGoodHumanReviewPath: string,
  knownGoodHumanReviewSha256: string,
  knownGoodCandidateResponseBinding: Binding,
  knownGoodIntervalizationImprovementResultBinding: Binding
): DistantConnectionComparisonHumanReviewPlanV001[
  'knownGoodReferenceEvidence'
]['modelInputNegativeAudit'] {
  const forbiddenStrings = [
    {kind: 'known-good-candidate-id' as const, value: 'camera-fear-escalation'},
    {kind: 'known-good-human-review-path' as const, value: knownGoodHumanReviewPath},
    {kind: 'known-good-human-review-sha256' as const, value: knownGoodHumanReviewSha256},
    {
      kind: 'known-good-candidate-response-path' as const,
      value: knownGoodCandidateResponseBinding.path
    },
    {
      kind: 'known-good-candidate-response-sha256' as const,
      value: knownGoodCandidateResponseBinding.fileSha256
    },
    {
      kind: 'known-good-intervalization-result-path' as const,
      value: knownGoodIntervalizationImprovementResultBinding.path
    },
    {
      kind: 'known-good-intervalization-result-sha256' as const,
      value: knownGoodIntervalizationImprovementResultBinding.fileSha256
    },
    {
      kind: 'known-good-human-verdict-label' as const,
      value: 'accepted-after-intervalization-improvement'
    },
    {
      kind: 'known-good-human-classification-label' as const,
      value: 'accepted-distant-connection-example'
    },
    {kind: 'known-good-criterion-label' as const, value: 'known-good-rediscovery'}
  ];
  for (const forbidden of forbiddenStrings) {
    if (requestText.instructions.includes(forbidden.value)
      || requestText.input.includes(forbidden.value)) {
      fail(`旧配信exact requestが既知合格例情報 ${forbidden.kind} をLuna入力へ露出しています`);
    }
  }
  return {
    exactRequestBinding: structuredClone(exactRequestBinding),
    auditedFields: ['instructions', 'input'],
    forbiddenStrings,
    allAbsent: true
  };
}

function inspectKnownGoodHumanReview(bytes: Uint8Array): {
  candidateResponseBinding: Binding;
  intervalizationImprovementResultBinding: Binding;
} {
  const value = parseJson(bytes, '既知合格例人間評価');
  if (value.schemaVersion !== 'distant-connection-human-review-result-v002'
    || value.sourceVideoId !== OLD_SOURCE_VIDEO_ID
    || !isRecord(value.sourceBindings)
    || !isRecord(value.sourceBindings.candidateResponse)
    || !isRecord(value.sourceBindings.intervalizationImprovementResult)
    || !Array.isArray(value.candidateReviews)
    || !value.candidateReviews.some((review) => isRecord(review)
      && review.candidateId === 'camera-fear-escalation'
      && review.candidateSelection === 'pass'
      && review.originalIntervalization === 'fail'
      && review.improvedIntervalization === 'pass'
      && review.shortFormViability === 'pass'
      && review.classification === 'accepted-distant-connection-example')) {
    fail('既知合格例の人間合格・区間化改善根拠が不正です');
  }
  assertBinding(value.sourceBindings.candidateResponse, '既知合格例candidate binding');
  assertBinding(
    value.sourceBindings.intervalizationImprovementResult,
    '既知合格例区間化改善binding'
  );
  assertCanonicalJson(bytes, value, '既知合格例人間評価');
  return {
    candidateResponseBinding: value.sourceBindings.candidateResponse as Binding,
    intervalizationImprovementResultBinding:
      value.sourceBindings.intervalizationImprovementResult as Binding
  };
}

function primaryTargetRule(): PrimaryTargetRule {
  return {
    kind: 'formal-candidate-array-order-prefix',
    count: PRIMARY_CANDIDATE_COUNT,
    rankingOrReranking: 'none'
  };
}

function supplementaryTargetRule(): SupplementaryTargetRule {
  return {
    kind: 'formal-candidate-array-order-remainder',
    metricAggregation: 'excluded-from-primary-A-to-E-except-known-good-rediscovery'
  };
}

export function buildDistantConnectionComparisonHumanReviewPlanV001(
  input: BuildDistantConnectionComparisonHumanReviewPlanV001Input
): DistantConnectionComparisonHumanReviewPlanV001 {
  assertFormalId(input.experimentId, 'experiment ID');
  assertExpectedSha(
    sha256(input.newCandidateResponseBytes),
    input.expectedNewCandidateResponseSha256,
    '新配信正式候補'
  );
  assertExpectedSha(
    sha256(input.oldExactRequestBytes),
    input.expectedOldExactRequestSha256,
    '旧配信exact request'
  );
  assertExpectedSha(
    sha256(input.knownGoodHumanReviewResultBytes),
    input.expectedKnownGoodHumanReviewResultSha256,
    '既知合格例人間評価'
  );
  const newSource = parseCandidateResponse(input.newCandidateResponseBytes, '新配信正式候補');
  if (newSource.sourceVideoId !== NEW_SOURCE_VIDEO_ID
    || newSource.candidates.length !== NEW_CANDIDATE_COUNT) {
    fail('新配信の動画IDまたは正式候補7件が不一致です');
  }
  const oldRequestText = inspectExactRequest(input.oldExactRequestBytes, '旧配信exact request');
  const knownGoodEvidence = inspectKnownGoodHumanReview(
    input.knownGoodHumanReviewResultBytes
  );
  const oldExactRequestBinding = binding(
    input.oldExactRequestPath,
    DISTANT_CONNECTION_COMPARISON_EXACT_REQUEST_SCHEMA_V001,
    input.oldExactRequestBytes
  );
  const modelInputNegativeAudit = buildKnownGoodModelInputNegativeAudit(
    oldRequestText,
    oldExactRequestBinding,
    input.knownGoodHumanReviewResultPath,
    input.expectedKnownGoodHumanReviewResultSha256,
    knownGoodEvidence.candidateResponseBinding,
    knownGoodEvidence.intervalizationImprovementResultBinding
  );

  return {
    schemaVersion: DISTANT_CONNECTION_COMPARISON_HUMAN_REVIEW_PLAN_SCHEMA_V001,
    experimentId: input.experimentId,
    sources: [
      {
        sourceRole: 'new-stream',
        sourceVideoId: NEW_SOURCE_VIDEO_ID,
        candidateResponseBinding: binding(
          input.newCandidateResponsePath,
          DISTANT_CONNECTION_COMPARISON_CANDIDATE_RESPONSE_SCHEMA_V001,
          input.newCandidateResponseBytes
        ),
        candidateArrayStatus: 'fixed-before-human-review',
        candidateCount: NEW_CANDIDATE_COUNT,
        primaryTargetRule: primaryTargetRule(),
        supplementaryTargetRule: supplementaryTargetRule(),
        candidateTargets: newSource.candidates.map((candidate, index) => ({
          candidateId: candidate.candidateId,
          candidateOrdinal: index + 1,
          reviewScope: index < PRIMARY_CANDIDATE_COUNT ? 'primary' : 'supplementary'
        }))
      },
      {
        sourceRole: 'old-stream',
        sourceVideoId: OLD_SOURCE_VIDEO_ID,
        exactRequestBinding: structuredClone(oldExactRequestBinding),
        candidateArrayStatus: 'pending-single-authorized-b6',
        primaryTargetRule: primaryTargetRule(),
        supplementaryTargetRule: supplementaryTargetRule(),
        candidateTargets: []
      }
    ],
    disclosureSequence: [
      {
        stage: 'second-only',
        visible: ['second-part-review-mp4'],
        hidden: ['first-part-content', 'first-then-second-review-mp4', 'luna-reason'],
        requiredObservation: 'second-part-understanding'
      },
      {
        stage: 'first-then-second',
        visible: ['first-then-second-review-mp4'],
        hidden: ['luna-reason'],
        requiredObservation: 'concrete-meaning-increment'
      },
      {
        stage: 'luna-reason',
        visible: ['luna-added-understanding'],
        hidden: [],
        requiredObservation: 'reason-disclosure-assessment'
      }
    ],
    criteria: {
      A: {
        name: 'known-good-rediscovery',
        appliesTo: 'old-stream',
        knownGoodReference: 'camera-fear-escalation',
        successLabelExposedToLuna: false,
        aggregation: 'any-human-confirmed-equivalent-in-formal-candidate-array'
      },
      B: {
        name: 'general-introduction',
        definition: CRITERION_B_DEFINITION,
        aggregation: 'primary-count-and-exact-ratio'
      },
      C: {
        name: 'concrete-meaning-increment',
        definition: CRITERION_C_DEFINITION,
        aggregation: 'primary-pass-count-and-exact-ratio'
      },
      D: {
        name: 'top-five-connection-and-payoff',
        definition: CRITERION_D_DEFINITION,
        aggregation: 'primary-both-pass-count-zero-to-five'
      },
      E: {
        name: 'want-to-make',
        definition: CRITERION_E_DEFINITION,
        role: 'supplementary-metric',
        aggregation: 'primary-pass-count-and-exact-ratio'
      }
    },
    knownGoodReferenceEvidence: {
      sourceVideoId: OLD_SOURCE_VIDEO_ID,
      candidateId: 'camera-fear-escalation',
      humanVerdict: 'accepted-after-intervalization-improvement',
      evidenceBindings: {
        humanReviewResult: binding(
          input.knownGoodHumanReviewResultPath,
          'distant-connection-human-review-result-v002',
          input.knownGoodHumanReviewResultBytes
        ),
        candidateResponse: structuredClone(knownGoodEvidence.candidateResponseBinding),
        intervalizationImprovementResult: structuredClone(
          knownGoodEvidence.intervalizationImprovementResultBinding
        )
      },
      modelInputUse: 'forbidden',
      modelInputNegativeAudit
    },
    diagnostics: {
      connectionTypes: [...DISTANT_CONNECTION_COMPARISON_CONNECTION_TYPES_V001],
      temporalDistanceUnit: 'milliseconds',
      secondPartCommentIncreaseOrigin: 'boolean',
      requiredVideoDurationUnit: 'milliseconds',
      diagnosticOnly: true
    },
    comparisonPrinciple: {
      sameHumanProcedureForBothSources: true,
      candidateOrderOwner: 'formal-candidate-artifact',
      coefficients: 'none',
      rankingOrReranking: 'none',
      explorationChangeAfterSeeingNewCandidates: 'forbidden-until-comparison-complete'
    }
  };
}

function assertPrimaryTargetRule(value: unknown, label: string): void {
  if (!isRecord(value)
    || !hasExactKeys(value, ['kind', 'count', 'rankingOrReranking'])
    || value.kind !== 'formal-candidate-array-order-prefix'
    || value.count !== PRIMARY_CANDIDATE_COUNT
    || value.rankingOrReranking !== 'none') {
    fail(`${label}の先頭5件規則が不正です`);
  }
}

function assertSupplementaryTargetRule(value: unknown, label: string): void {
  if (!isRecord(value)
    || !hasExactKeys(value, ['kind', 'metricAggregation'])
    || value.kind !== 'formal-candidate-array-order-remainder'
    || value.metricAggregation
      !== 'excluded-from-primary-A-to-E-except-known-good-rediscovery') {
    fail(`${label}の補助観測規則が不正です`);
  }
}

function assertPlanCandidateTargets(value: unknown): void {
  if (!Array.isArray(value) || value.length !== NEW_CANDIDATE_COUNT) {
    fail('新配信candidate targetが7件ではありません');
  }
  const ids = new Set<string>();
  for (const [index, target] of value.entries()) {
    if (!isRecord(target)
      || !hasExactKeys(target, ['candidateId', 'candidateOrdinal', 'reviewScope'])
      || typeof target.candidateId !== 'string'
      || target.candidateOrdinal !== index + 1
      || target.reviewScope !== (index < PRIMARY_CANDIDATE_COUNT ? 'primary' : 'supplementary')) {
      fail(`新配信candidate target ${index + 1}件目が不正です`);
    }
    assertFormalId(target.candidateId, `新配信candidate target ${index + 1}件目のID`);
    if (ids.has(target.candidateId)) fail('新配信candidate targetが重複しています');
    ids.add(target.candidateId);
  }
}

export function assertDistantConnectionComparisonHumanReviewPlanV001(
  value: unknown
): asserts value is DistantConnectionComparisonHumanReviewPlanV001 {
  if (!isRecord(value)
    || !hasExactKeys(value, [
      'schemaVersion', 'experimentId', 'sources', 'disclosureSequence', 'criteria',
      'knownGoodReferenceEvidence', 'diagnostics', 'comparisonPrinciple'
    ])
    || value.schemaVersion !== DISTANT_CONNECTION_COMPARISON_HUMAN_REVIEW_PLAN_SCHEMA_V001) {
    fail('比較人間評価planのroot構造または版が不正です');
  }
  assertFormalId(value.experimentId, 'experiment ID');
  if (!Array.isArray(value.sources) || value.sources.length !== 2) {
    fail('比較対象sourceが新旧2件ではありません');
  }
  const [newSource, oldSource] = value.sources;
  if (!isRecord(newSource)
    || !hasExactKeys(newSource, [
      'sourceRole', 'sourceVideoId', 'candidateResponseBinding', 'candidateArrayStatus',
      'candidateCount', 'primaryTargetRule', 'supplementaryTargetRule', 'candidateTargets'
    ])
    || newSource.sourceRole !== 'new-stream'
    || newSource.sourceVideoId !== NEW_SOURCE_VIDEO_ID
    || newSource.candidateArrayStatus !== 'fixed-before-human-review'
    || newSource.candidateCount !== NEW_CANDIDATE_COUNT) {
    fail('新配信の事前登録構造が不正です');
  }
  assertBinding(newSource.candidateResponseBinding, '新配信正式候補binding');
  if (newSource.candidateResponseBinding.schemaVersion
    !== DISTANT_CONNECTION_COMPARISON_CANDIDATE_RESPONSE_SCHEMA_V001) {
    fail('新配信正式候補bindingのschemaが不正です');
  }
  assertPrimaryTargetRule(newSource.primaryTargetRule, '新配信');
  assertSupplementaryTargetRule(newSource.supplementaryTargetRule, '新配信');
  assertPlanCandidateTargets(newSource.candidateTargets);

  if (!isRecord(oldSource)
    || !hasExactKeys(oldSource, [
      'sourceRole', 'sourceVideoId', 'exactRequestBinding', 'candidateArrayStatus',
      'primaryTargetRule', 'supplementaryTargetRule', 'candidateTargets'
    ])
    || oldSource.sourceRole !== 'old-stream'
    || oldSource.sourceVideoId !== OLD_SOURCE_VIDEO_ID
    || oldSource.candidateArrayStatus !== 'pending-single-authorized-b6'
    || !Array.isArray(oldSource.candidateTargets)
    || oldSource.candidateTargets.length !== 0) {
    fail('旧配信の将来実走target構造が不正です');
  }
  assertBinding(oldSource.exactRequestBinding, '旧配信exact request binding');
  if (oldSource.exactRequestBinding.schemaVersion
    !== DISTANT_CONNECTION_COMPARISON_EXACT_REQUEST_SCHEMA_V001) {
    fail('旧配信exact request bindingのschemaが不正です');
  }
  assertPrimaryTargetRule(oldSource.primaryTargetRule, '旧配信');
  assertSupplementaryTargetRule(oldSource.supplementaryTargetRule, '旧配信');

  const expectedDisclosure = [
    {
      stage: 'second-only',
      visible: ['second-part-review-mp4'],
      hidden: ['first-part-content', 'first-then-second-review-mp4', 'luna-reason'],
      requiredObservation: 'second-part-understanding'
    },
    {
      stage: 'first-then-second',
      visible: ['first-then-second-review-mp4'],
      hidden: ['luna-reason'],
      requiredObservation: 'concrete-meaning-increment'
    },
    {
      stage: 'luna-reason',
      visible: ['luna-added-understanding'],
      hidden: [],
      requiredObservation: 'reason-disclosure-assessment'
    }
  ];
  if (JSON.stringify(value.disclosureSequence) !== JSON.stringify(expectedDisclosure)) {
    fail('人間評価の開示順または段階必須観測が不正です');
  }
  if (!isRecord(value.criteria)
    || !hasExactKeys(value.criteria, ['A', 'B', 'C', 'D', 'E'])) {
    fail('比較評価A〜Eが完全ではありません');
  }
  const expectedCriteria = buildExpectedCriteria();
  if (JSON.stringify(value.criteria) !== JSON.stringify(expectedCriteria)) {
    fail('比較評価A〜Eの定義または集計規則が不正です');
  }
  if (!isRecord(value.knownGoodReferenceEvidence)
    || !hasExactKeys(value.knownGoodReferenceEvidence, [
      'sourceVideoId', 'candidateId', 'humanVerdict', 'evidenceBindings', 'modelInputUse',
      'modelInputNegativeAudit'
    ])
    || value.knownGoodReferenceEvidence.sourceVideoId !== OLD_SOURCE_VIDEO_ID
    || value.knownGoodReferenceEvidence.candidateId !== 'camera-fear-escalation'
    || value.knownGoodReferenceEvidence.humanVerdict
      !== 'accepted-after-intervalization-improvement'
    || value.knownGoodReferenceEvidence.modelInputUse !== 'forbidden'
    || !isRecord(value.knownGoodReferenceEvidence.evidenceBindings)
    || !hasExactKeys(value.knownGoodReferenceEvidence.evidenceBindings, [
      'humanReviewResult', 'candidateResponse', 'intervalizationImprovementResult'
    ])) {
    fail('既知合格例の正式根拠またはLuna入力非使用原則が不正です');
  }
  for (const [name, evidenceBinding] of Object.entries(
    value.knownGoodReferenceEvidence.evidenceBindings
  )) assertBinding(evidenceBinding, `known-good ${name} binding`);
  const negativeAudit = value.knownGoodReferenceEvidence.modelInputNegativeAudit;
  const expectedForbiddenStrings = [
    {kind: 'known-good-candidate-id', value: 'camera-fear-escalation'},
    {
      kind: 'known-good-human-review-path',
      value: (value.knownGoodReferenceEvidence.evidenceBindings as RecordValue)
        .humanReviewResult && ((value.knownGoodReferenceEvidence.evidenceBindings as RecordValue)
        .humanReviewResult as RecordValue).path
    },
    {
      kind: 'known-good-human-review-sha256',
      value: ((value.knownGoodReferenceEvidence.evidenceBindings as RecordValue)
        .humanReviewResult as RecordValue).fileSha256
    },
    {
      kind: 'known-good-candidate-response-path',
      value: ((value.knownGoodReferenceEvidence.evidenceBindings as RecordValue)
        .candidateResponse as RecordValue).path
    },
    {
      kind: 'known-good-candidate-response-sha256',
      value: ((value.knownGoodReferenceEvidence.evidenceBindings as RecordValue)
        .candidateResponse as RecordValue).fileSha256
    },
    {
      kind: 'known-good-intervalization-result-path',
      value: ((value.knownGoodReferenceEvidence.evidenceBindings as RecordValue)
        .intervalizationImprovementResult as RecordValue).path
    },
    {
      kind: 'known-good-intervalization-result-sha256',
      value: ((value.knownGoodReferenceEvidence.evidenceBindings as RecordValue)
        .intervalizationImprovementResult as RecordValue).fileSha256
    },
    {
      kind: 'known-good-human-verdict-label',
      value: 'accepted-after-intervalization-improvement'
    },
    {
      kind: 'known-good-human-classification-label',
      value: 'accepted-distant-connection-example'
    },
    {kind: 'known-good-criterion-label', value: 'known-good-rediscovery'}
  ];
  if (!isRecord(negativeAudit)
    || !hasExactKeys(negativeAudit, [
      'exactRequestBinding', 'auditedFields', 'forbiddenStrings', 'allAbsent'
    ])
    || !isRecord(negativeAudit.exactRequestBinding)
    || JSON.stringify(negativeAudit.exactRequestBinding)
      !== JSON.stringify(oldSource.exactRequestBinding)
    || JSON.stringify(negativeAudit.auditedFields) !== JSON.stringify(['instructions', 'input'])
    || JSON.stringify(negativeAudit.forbiddenStrings)
      !== JSON.stringify(expectedForbiddenStrings)
    || negativeAudit.allAbsent !== true) {
    fail('既知合格例のLuna入力negative auditが不正です');
  }
  if (!isRecord(value.diagnostics)
    || !hasExactKeys(value.diagnostics, [
      'connectionTypes', 'temporalDistanceUnit', 'secondPartCommentIncreaseOrigin',
      'requiredVideoDurationUnit', 'diagnosticOnly'
    ])
    || JSON.stringify(value.diagnostics.connectionTypes)
      !== JSON.stringify(DISTANT_CONNECTION_COMPARISON_CONNECTION_TYPES_V001)
    || value.diagnostics.temporalDistanceUnit !== 'milliseconds'
    || value.diagnostics.secondPartCommentIncreaseOrigin !== 'boolean'
    || value.diagnostics.requiredVideoDurationUnit !== 'milliseconds'
    || value.diagnostics.diagnosticOnly !== true) {
    fail('診断項目または接続型語彙が不正です');
  }
  if (!isRecord(value.comparisonPrinciple)
    || !hasExactKeys(value.comparisonPrinciple, [
      'sameHumanProcedureForBothSources', 'candidateOrderOwner', 'coefficients',
      'rankingOrReranking', 'explorationChangeAfterSeeingNewCandidates'
    ])
    || value.comparisonPrinciple.sameHumanProcedureForBothSources !== true
    || value.comparisonPrinciple.candidateOrderOwner !== 'formal-candidate-artifact'
    || value.comparisonPrinciple.coefficients !== 'none'
    || value.comparisonPrinciple.rankingOrReranking !== 'none'
    || value.comparisonPrinciple.explorationChangeAfterSeeingNewCandidates
      !== 'forbidden-until-comparison-complete') {
    fail('同条件比較原則が不正です');
  }
}

function buildExpectedCriteria(): DistantConnectionComparisonHumanReviewPlanV001['criteria'] {
  return {
    A: {
      name: 'known-good-rediscovery',
      appliesTo: 'old-stream',
      knownGoodReference: 'camera-fear-escalation',
      successLabelExposedToLuna: false,
      aggregation: 'any-human-confirmed-equivalent-in-formal-candidate-array'
    },
    B: {
      name: 'general-introduction',
      definition: CRITERION_B_DEFINITION,
      aggregation: 'primary-count-and-exact-ratio'
    },
    C: {
      name: 'concrete-meaning-increment',
      definition: CRITERION_C_DEFINITION,
      aggregation: 'primary-pass-count-and-exact-ratio'
    },
    D: {
      name: 'top-five-connection-and-payoff',
      definition: CRITERION_D_DEFINITION,
      aggregation: 'primary-both-pass-count-zero-to-five'
    },
    E: {
      name: 'want-to-make',
      definition: CRITERION_E_DEFINITION,
      role: 'supplementary-metric',
      aggregation: 'primary-pass-count-and-exact-ratio'
    }
  };
}

export function serializeDistantConnectionComparisonHumanReviewPlanV001(
  value: DistantConnectionComparisonHumanReviewPlanV001
): Buffer {
  assertDistantConnectionComparisonHumanReviewPlanV001(value);
  return Buffer.from(`${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

export function decodeDistantConnectionComparisonHumanReviewPlanV001(
  bytes: Uint8Array
): DistantConnectionComparisonHumanReviewPlanV001 {
  const value = parseJson(bytes, '比較人間評価plan');
  assertDistantConnectionComparisonHumanReviewPlanV001(value);
  if (!serializeDistantConnectionComparisonHumanReviewPlanV001(value)
    .equals(Buffer.from(bytes))) {
    fail('比較人間評価planがcanonical formal byteではありません');
  }
  return value;
}

export function validateDistantConnectionComparisonHumanReviewPlanAgainstSourcesV001(
  value: DistantConnectionComparisonHumanReviewPlanV001,
  input: BuildDistantConnectionComparisonHumanReviewPlanV001Input
): void {
  const rebuilt = buildDistantConnectionComparisonHumanReviewPlanV001(input);
  if (!serializeDistantConnectionComparisonHumanReviewPlanV001(value)
    .equals(serializeDistantConnectionComparisonHumanReviewPlanV001(rebuilt))) {
    fail('比較人間評価planが入力正本からの決定的再生成と一致しません');
  }
}

function parseB6Manifest(bytes: Uint8Array, label: string): DistantConnectionComparisonB6RunManifestV001 {
  const value = parseJson(bytes, label);
  try {
    assertDistantConnectionComparisonB6RunManifestV001(value);
  } catch (error) {
    fail(`${label}の契約検査に失敗しました: ${(error as Error).message}`);
  }
  assertCanonicalJson(bytes, value, label);
  return value;
}

type ReviewMediaInfo = {
  candidateId: string;
  candidateOrdinal: number;
  secondOnlyDurationMs: number;
  firstThenSecondDurationMs: number;
  firstPartStartMs: number;
  firstPartEndMs: number;
  secondPartStartMs: number;
  secondPartEndMs: number;
  secondOnlyVideoBinding: {path: string; fileSha256: string};
  firstThenSecondVideoBinding: {path: string; fileSha256: string};
};

function finiteNonnegativeInteger(value: unknown, label: string): number {
  if (!Number.isSafeInteger(value) || (value as number) < 0) fail(`${label}が非負の安全な整数ではありません`);
  return value as number;
}

function readSourceInterval(part: unknown, label: string): {startMs: number; endMs: number} {
  if (!isRecord(part)
    || !hasExactKeys(part, [
      'part', 'selectedUtteranceIds', 'selectedOrdinals', 'sourceInterval'
    ])
    || !['first', 'second'].includes(part.part as string)
    || !Array.isArray(part.selectedUtteranceIds)
    || part.selectedUtteranceIds.length === 0
    || part.selectedUtteranceIds.some((id) => typeof id !== 'string')
    || !Array.isArray(part.selectedOrdinals)
    || part.selectedOrdinals.length !== part.selectedUtteranceIds.length
    || part.selectedOrdinals.some((ordinal) => !Number.isSafeInteger(ordinal) || ordinal <= 0)
    || !isRecord(part.sourceInterval)
    || !hasExactKeys(part.sourceInterval, ['sourceStartMs', 'sourceEndMs'])) {
    fail(`${label}の発話・順序・時刻構造が不正です`);
  }
  const interval = part.sourceInterval;
  const startMs = finiteNonnegativeInteger(interval.sourceStartMs, `${label} sourceStartMs`);
  const endMs = finiteNonnegativeInteger(interval.sourceEndMs, `${label} sourceEndMs`);
  if (endMs <= startMs) fail(`${label}の時刻順が不正です`);
  return {startMs, endMs};
}

function readVideoBinding(value: unknown, label: string): {path: string; fileSha256: string} {
  if (!isRecord(value)
    || !hasExactKeys(value, ['path', 'fileSha256'])) fail(`${label}の構造が不正です`);
  assertPath(value.path, `${label} path`);
  if (typeof value.fileSha256 !== 'string' || !SHA256.test(value.fileSha256)) {
    fail(`${label} SHA-256が不正です`);
  }
  return {path: value.path, fileSha256: value.fileSha256};
}

function parseCandidateReviewResult(
  bytes: Uint8Array,
  expectedSourceVideoId: string,
  expectedCandidateBinding: Binding,
  expectedCandidates: ParsedCandidate[]
): ReviewMediaInfo[] {
  const value = parseJson(bytes, 'candidate review result');
  try {
    assertDistantConnectionCandidateReviewResultV002(value);
  } catch (error) {
    fail(`candidate review resultの正式契約検査に失敗しました: ${(error as Error).message}`);
  }
  if (value.schemaVersion !== DISTANT_CONNECTION_CANDIDATE_REVIEW_RESULT_SCHEMA_V002
    || value.sourceVideoId !== expectedSourceVideoId
    || !isRecord(value.candidateResponseBinding)
    || JSON.stringify(value.candidateResponseBinding) !== JSON.stringify(expectedCandidateBinding)
    || !Array.isArray(value.candidates)
    || value.candidates.length !== expectedCandidates.length) {
    fail('candidate review resultの版・動画ID・正式candidate binding・件数が不正です');
  }
  const rows = value.candidates.map((candidate, index) => {
    const expectedCandidate = expectedCandidates[index];
    if (!isRecord(candidate)
      || !hasExactKeys(candidate, ['candidateId', 'candidateOrdinal', 'reviewArtifacts'])
      || candidate.candidateId !== expectedCandidate.candidateId
      || candidate.candidateOrdinal !== index + 1
      || !isRecord(candidate.reviewArtifacts)) {
      fail(`candidate review result ${index + 1}件目のID・順序・動画構造が不正です`);
    }
    const secondOnly = candidate.reviewArtifacts.secondOnly;
    const firstThenSecond = candidate.reviewArtifacts.firstThenSecond;
    if (!isRecord(secondOnly)
      || !hasExactKeys(secondOnly, [
        'stage', 'videoBinding', 'mediaInspection', 'evaluatedParts'
      ])
      || secondOnly.stage !== 'second-only'
      || !isRecord(firstThenSecond)
      || !hasExactKeys(firstThenSecond, [
        'stage', 'videoBinding', 'mediaInspection', 'evaluatedParts'
      ])
      || firstThenSecond.stage !== 'first-then-second'
      || !isRecord(secondOnly.mediaInspection)
      || !hasExactKeys(secondOnly.mediaInspection, [
        'durationMs', 'videoPresent', 'audioPresent'
      ])
      || secondOnly.mediaInspection.videoPresent !== true
      || secondOnly.mediaInspection.audioPresent !== true
      || !isRecord(firstThenSecond.mediaInspection)
      || !hasExactKeys(firstThenSecond.mediaInspection, [
        'durationMs', 'videoPresent', 'audioPresent'
      ])
      || firstThenSecond.mediaInspection.videoPresent !== true
      || firstThenSecond.mediaInspection.audioPresent !== true
      || !Array.isArray(secondOnly.evaluatedParts)
      || !Array.isArray(firstThenSecond.evaluatedParts)
      || secondOnly.evaluatedParts.length !== 1
      || firstThenSecond.evaluatedParts.length !== 2) {
      fail(`candidate review result ${index + 1}件目の開示段階またはevaluated partsが不正です`);
    }
    const secondOnlyDurationMs = finiteNonnegativeInteger(
      secondOnly.mediaInspection.durationMs,
      `candidate ${index + 1} second-only duration`
    );
    const firstThenSecondDurationMs = finiteNonnegativeInteger(
      firstThenSecond.mediaInspection.durationMs,
      `candidate ${index + 1} first-then-second duration`
    );
    if (secondOnlyDurationMs === 0 || firstThenSecondDurationMs === 0) {
      fail(`candidate review result ${index + 1}件目の動画尺が0です`);
    }
    const secondOnlyVideoBinding = readVideoBinding(
      secondOnly.videoBinding,
      `candidate ${index + 1} second-only video binding`
    );
    const firstThenSecondVideoBinding = readVideoBinding(
      firstThenSecond.videoBinding,
      `candidate ${index + 1} first-then-second video binding`
    );
    const first = readSourceInterval(
      firstThenSecond.evaluatedParts[0],
      `candidate ${index + 1} first part`
    );
    const second = readSourceInterval(
      firstThenSecond.evaluatedParts[1],
      `candidate ${index + 1} second part`
    );
    const secondOnlyPart = readSourceInterval(
      secondOnly.evaluatedParts[0],
      `candidate ${index + 1} second-only part`
    );
    const firstPartValue = firstThenSecond.evaluatedParts[0] as RecordValue;
    const secondPartValue = firstThenSecond.evaluatedParts[1] as RecordValue;
    const secondOnlyPartValue = secondOnly.evaluatedParts[0] as RecordValue;
    if ((firstThenSecond.evaluatedParts[0] as RecordValue).part !== 'first'
      || (firstThenSecond.evaluatedParts[1] as RecordValue).part !== 'second'
      || (secondOnly.evaluatedParts[0] as RecordValue).part !== 'second'
      || JSON.stringify(firstPartValue.selectedUtteranceIds)
        !== JSON.stringify(expectedCandidate.firstPartUtteranceIds)
      || JSON.stringify(secondPartValue.selectedUtteranceIds)
        !== JSON.stringify(expectedCandidate.secondPartUtteranceIds)
      || JSON.stringify(secondOnlyPartValue.selectedUtteranceIds)
        !== JSON.stringify(expectedCandidate.secondPartUtteranceIds)
      || JSON.stringify(secondOnlyPart) !== JSON.stringify(second)
      || second.startMs < first.endMs) {
      fail(`candidate review result ${index + 1}件目の後半一致または前後順が不正です`);
    }
    return {
      candidateId: candidate.candidateId as string,
      candidateOrdinal: candidate.candidateOrdinal as number,
      secondOnlyDurationMs,
      firstThenSecondDurationMs,
      firstPartStartMs: first.startMs,
      firstPartEndMs: first.endMs,
      secondPartStartMs: second.startMs,
      secondPartEndMs: second.endMs,
      secondOnlyVideoBinding,
      firstThenSecondVideoBinding
    };
  });
  assertCanonicalJson(bytes, value, 'candidate review result');
  return rows;
}

function parseSelectedMinuteIntervals(
  bytes: Uint8Array,
  expectedSourceVideoId: string
): Array<{startMs: number; endMs: number}> {
  let value;
  try {
    value = decodeDistantConnectionComparisonSourcePackageV001(bytes);
  } catch (error) {
    fail(`comparison source packageの正式契約検査に失敗しました: ${(error as Error).message}`);
  }
  if (value.schemaVersion !== DISTANT_CONNECTION_COMPARISON_SOURCE_PACKAGE_SCHEMA_V001
    || value.sourceVideoId !== expectedSourceVideoId
    || value.selectedMinutes.length === 0) {
    fail('comparison source packageの版・動画ID・選択minuteが不正です');
  }
  return value.selectedMinutes.map((minute, index) => {
    const startMs = finiteNonnegativeInteger(minute.sourceStartMs, 'selected minute start');
    const endMs = finiteNonnegativeInteger(minute.sourceEndMs, 'selected minute end');
    if (endMs <= startMs) fail(`selected minute ${index + 1}件目の時刻順が不正です`);
    return {startMs, endMs};
  });
}

function overlapsSelectedMinute(
  startMs: number,
  endMs: number,
  minutes: Array<{startMs: number; endMs: number}>
): boolean {
  return minutes.some((minute) => startMs < minute.endMs && endMs > minute.startMs);
}

function assertHumanReviewInput(
  value: CandidateHumanComparisonReviewInputV001,
  expectedCandidateId: string,
  sourceRole: SourceRole,
  index: number
): void {
  if (!isRecord(value)
    || !hasExactKeys(value, [
      'candidateId', 'secondOnlyUnderstanding', 'concreteMeaningIncrement',
      'concreteMeaningIncrementDescription', 'lunaReasonDisclosureAssessment',
      'meaningConnection', 'payoffStrength', 'wantToMake', 'generalIntroduction',
      'knownGoodRediscovery', 'connectionType', 'requiredVideoDurationMs'
    ])
    || value.candidateId !== expectedCandidateId
    || !['pass', 'fail'].includes(value.concreteMeaningIncrement)
    || !['pass', 'fail'].includes(value.meaningConnection)
    || !['pass', 'fail'].includes(value.payoffStrength)
    || !['pass', 'fail'].includes(value.wantToMake)
    || !['yes', 'no'].includes(value.generalIntroduction)
    || !['yes', 'no'].includes(value.knownGoodRediscovery)
    || !DISTANT_CONNECTION_COMPARISON_CONNECTION_TYPES_V001.includes(value.connectionType)
    || !Number.isSafeInteger(value.requiredVideoDurationMs)
    || value.requiredVideoDurationMs <= 0
    || (sourceRole === 'new-stream' && value.knownGoodRediscovery !== 'no')) {
    fail(`${sourceRole}の候補${index + 1}件目の人間評価値が不正です`);
  }
  assertNonempty(value.secondOnlyUnderstanding, '後半単独の理解記録');
  assertNonempty(value.concreteMeaningIncrementDescription, '具体的意味増分の記録');
  assertNonempty(value.lunaReasonDisclosureAssessment, 'Luna理由開示後の評価');
}

function inspectResultSource(
  plan: DistantConnectionComparisonHumanReviewPlanV001,
  input: BuildComparisonSourceHumanReviewV001Input,
  expectedRole: SourceRole
): DistantConnectionComparisonHumanReviewResultV001['sources'][number] {
  if (input.sourceRole !== expectedRole) fail('結果sourceの順序またはroleが不正です');
  for (const [actual, expected, label] of [
    [sha256(input.candidateResponseBytes), input.expectedCandidateResponseSha256, '正式candidate'],
    [sha256(input.b6RunManifestBytes), input.expectedB6RunManifestSha256, 'B6 manifest'],
    [sha256(input.candidateReviewResultBytes), input.expectedCandidateReviewResultSha256, 'candidate review result'],
    [sha256(input.sourcePackageBytes), input.expectedSourcePackageSha256, 'source package']
  ] as const) assertExpectedSha(actual, expected, `${expectedRole} ${label}`);

  const parsed = parseCandidateResponse(input.candidateResponseBytes, `${expectedRole} 正式candidate`);
  const expectedSourceId = expectedRole === 'new-stream' ? NEW_SOURCE_VIDEO_ID : OLD_SOURCE_VIDEO_ID;
  if (parsed.sourceVideoId !== expectedSourceId) fail(`${expectedRole}のsourceVideoIdが不正です`);
  const candidateBinding = binding(
    input.candidateResponsePath,
    DISTANT_CONNECTION_COMPARISON_CANDIDATE_RESPONSE_SCHEMA_V001,
    input.candidateResponseBytes
  );
  const sourcePackageBinding = binding(
    input.sourcePackagePath,
    'distant-connection-comparison-source-package-v001',
    input.sourcePackageBytes
  );
  if (JSON.stringify(parsed.value.sourcePackageBinding)
    !== JSON.stringify(sourcePackageBinding)) {
    fail(`${expectedRole}の正式candidateが指定source packageを束縛していません`);
  }
  const selectedMinutes = parseSelectedMinuteIntervals(
    input.sourcePackageBytes,
    expectedSourceId
  );
  const manifest = parseB6Manifest(input.b6RunManifestBytes, `${expectedRole} B6 manifest`);
  if (JSON.stringify(manifest.sourcePackageBinding) !== JSON.stringify(sourcePackageBinding)
    || JSON.stringify(manifest.candidateResponseBinding) !== JSON.stringify(candidateBinding)
    || manifest.validation.candidateCount !== parsed.candidates.length) {
    fail(`${expectedRole}のB6 manifestがsource package・正式candidate配列と一致しません`);
  }
  const planSource = plan.sources[expectedRole === 'new-stream' ? 0 : 1];
  if (expectedRole === 'new-stream') {
    if (!('candidateResponseBinding' in planSource)
      || JSON.stringify(planSource.candidateResponseBinding) !== JSON.stringify(candidateBinding)
      || JSON.stringify(planSource.candidateTargets.map((target) => target.candidateId))
        !== JSON.stringify(parsed.candidates.map((candidate) => candidate.candidateId))) {
      fail('新配信の正式candidateが事前登録planと一致しません');
    }
  } else {
    if (!('exactRequestBinding' in planSource)
      || JSON.stringify(manifest.exactRequestBinding)
        !== JSON.stringify(planSource.exactRequestBinding)
      || parsed.candidates.length < PRIMARY_CANDIDATE_COUNT) {
      fail('旧配信B6が事前登録exact requestまたは先頭5件ruleと一致しません');
    }
  }

  const reviewResultBinding = binding(
    input.candidateReviewResultPath,
    DISTANT_CONNECTION_CANDIDATE_REVIEW_RESULT_SCHEMA_V002,
    input.candidateReviewResultBytes
  );
  const media = parseCandidateReviewResult(
    input.candidateReviewResultBytes,
    expectedSourceId,
    candidateBinding,
    parsed.candidates
  );
  if (input.candidateReviews.length !== parsed.candidates.length) {
    fail(`${expectedRole}の人間評価が正式candidateを完全被覆していません`);
  }
  const candidateReviews = input.candidateReviews.map((review, index) => {
    const candidate = parsed.candidates[index];
    const mediaInfo = media[index];
    assertHumanReviewInput(review, candidate.candidateId, expectedRole, index);
    return {
      candidateId: candidate.candidateId,
      secondOnlyUnderstanding: review.secondOnlyUnderstanding,
      concreteMeaningIncrement: review.concreteMeaningIncrement,
      concreteMeaningIncrementDescription: review.concreteMeaningIncrementDescription,
      lunaReasonDisclosureAssessment: review.lunaReasonDisclosureAssessment,
      meaningConnection: review.meaningConnection,
      payoffStrength: review.payoffStrength,
      wantToMake: review.wantToMake,
      generalIntroduction: review.generalIntroduction,
      knownGoodRediscovery: {
        decision: review.knownGoodRediscovery,
        referenceCandidateId: 'camera-fear-escalation' as const,
        referenceHumanReviewResultSha256:
          plan.knownGoodReferenceEvidence.evidenceBindings.humanReviewResult.fileSha256
      },
      connectionType: review.connectionType,
      requiredVideoDurationMs: review.requiredVideoDurationMs,
      candidateOrdinal: index + 1,
      reviewScope: index < PRIMARY_CANDIDATE_COUNT ? 'primary' as const : 'supplementary' as const,
      stageObservations: {
        secondOnly: {
          stage: 'second-only' as const,
          understoodContent: review.secondOnlyUnderstanding
        },
        firstThenSecond: {
          stage: 'first-then-second' as const,
          concreteMeaningIncrement: review.concreteMeaningIncrement,
          concreteMeaningIncrementDescription: review.concreteMeaningIncrementDescription
        },
        lunaReason: {
          stage: 'luna-reason' as const,
          assessment: review.lunaReasonDisclosureAssessment
        }
      },
      diagnostics: {
        connectionType: review.connectionType,
        temporalDistanceMs: mediaInfo.secondPartStartMs - mediaInfo.firstPartEndMs,
        secondPartFromCommentIncreaseInterval: overlapsSelectedMinute(
          mediaInfo.secondPartStartMs,
          mediaInfo.secondPartEndMs,
          selectedMinutes
        ),
        requiredVideoDurationMs: review.requiredVideoDurationMs
      }
    };
  });
  return {
    sourceRole: expectedRole,
    sourceVideoId: expectedSourceId,
    sourceBindings: {
      candidateResponse: candidateBinding,
      b6RunManifest: binding(
        input.b6RunManifestPath,
        DISTANT_CONNECTION_COMPARISON_B6_RUN_MANIFEST_SCHEMA_V001,
        input.b6RunManifestBytes
      ),
      candidateReviewResult: reviewResultBinding,
      sourcePackage: sourcePackageBinding
    },
    candidateCount: parsed.candidates.length,
    primaryCandidateCount: PRIMARY_CANDIDATE_COUNT,
    candidateReviews
  };
}

function countAndRatio(
  source: DistantConnectionComparisonHumanReviewResultV001['sources'][number],
  predicate: (review: CandidateHumanComparisonReviewV001) => boolean
): PerSourceCountAndRatio {
  const primary = source.candidateReviews.slice(0, source.primaryCandidateCount);
  const passCount = primary.filter(predicate).length;
  return {
    sourceRole: source.sourceRole,
    primaryCandidateCount: primary.length,
    passCount,
    ratio: {numerator: passCount, denominator: primary.length}
  };
}

function metricAggregates(
  sources: DistantConnectionComparisonHumanReviewResultV001['sources']
): DistantConnectionComparisonHumanReviewResultV001['metricAggregates'] {
  const old = sources[1];
  const knownGood = old.candidateReviews
    .filter((review) => review.knownGoodRediscovery.decision === 'yes')
    .map((review) => review.candidateId);
  const referenceHumanReviewResultSha256 =
    old.candidateReviews[0]?.knownGoodRediscovery.referenceHumanReviewResultSha256
      ?? fail('旧配信の既知合格例比較対象が空です');
  return {
    A: {
      name: 'known-good-rediscovery',
      knownGoodReference: 'camera-fear-escalation',
      referenceHumanReviewResultSha256,
      rediscovered: knownGood.length > 0 ? 'yes' : 'no',
      matchingCandidateIds: knownGood
    },
    B: {
      name: 'general-introduction',
      sources: sources.map((source) => countAndRatio(
        source,
        (review) => review.generalIntroduction === 'yes'
      ))
    },
    C: {
      name: 'concrete-meaning-increment',
      sources: sources.map((source) => countAndRatio(
        source,
        (review) => review.concreteMeaningIncrement === 'pass'
      ))
    },
    D: {
      name: 'top-five-connection-and-payoff',
      sources: sources.map((source) => ({
        sourceRole: source.sourceRole,
        primaryCandidateCount: source.primaryCandidateCount,
        bothPassCount: source.candidateReviews.slice(0, source.primaryCandidateCount)
          .filter((review) => review.meaningConnection === 'pass'
            && review.payoffStrength === 'pass').length
      }))
    },
    E: {
      name: 'want-to-make',
      role: 'supplementary-metric',
      sources: sources.map((source) => countAndRatio(
        source,
        (review) => review.wantToMake === 'pass'
      ))
    }
  };
}

export function buildDistantConnectionComparisonHumanReviewResultV001(
  input: BuildDistantConnectionComparisonHumanReviewResultV001Input
): DistantConnectionComparisonHumanReviewResultV001 {
  assertExpectedSha(sha256(input.planBytes), input.expectedPlanSha256, '事前登録plan');
  const plan = decodeDistantConnectionComparisonHumanReviewPlanV001(input.planBytes);
  assertPath(input.planPath, '事前登録plan path');
  if (!ISO_DATETIME.test(input.reviewedAt) || Number.isNaN(Date.parse(input.reviewedAt))) {
    fail('reviewedAtがtimezone付きISO 8601日時ではありません');
  }
  assertNonempty(input.reviewer, 'reviewer');
  if (input.sources.length !== 2) fail('比較結果sourceが2件ではありません');
  const sources = [
    inspectResultSource(plan, input.sources[0], EXPECTED_SOURCE_ROLES[0]),
    inspectResultSource(plan, input.sources[1], EXPECTED_SOURCE_ROLES[1])
  ];
  return {
    schemaVersion: DISTANT_CONNECTION_COMPARISON_HUMAN_REVIEW_RESULT_SCHEMA_V001,
    experimentId: plan.experimentId,
    reviewedAt: input.reviewedAt,
    reviewer: input.reviewer,
    planBinding: binding(
      input.planPath,
      DISTANT_CONNECTION_COMPARISON_HUMAN_REVIEW_PLAN_SCHEMA_V001,
      input.planBytes
    ),
    sources,
    metricAggregates: metricAggregates(sources)
  };
}

function assertStageObservations(value: unknown, label: string): void {
  if (!isRecord(value)
    || !hasExactKeys(value, ['secondOnly', 'firstThenSecond', 'lunaReason'])
    || !isRecord(value.secondOnly)
    || !hasExactKeys(value.secondOnly, ['stage', 'understoodContent'])
    || value.secondOnly.stage !== 'second-only'
    || !isRecord(value.firstThenSecond)
    || !hasExactKeys(value.firstThenSecond, [
      'stage', 'concreteMeaningIncrement', 'concreteMeaningIncrementDescription'
    ])
    || value.firstThenSecond.stage !== 'first-then-second'
    || !isRecord(value.lunaReason)
    || !hasExactKeys(value.lunaReason, ['stage', 'assessment'])
    || value.lunaReason.stage !== 'luna-reason') {
    fail(`${label}の3段階記録が欠落または順序不正です`);
  }
  assertNonempty(value.secondOnly.understoodContent, `${label} second-only`);
  if (!['pass', 'fail'].includes(value.firstThenSecond.concreteMeaningIncrement as string)) {
    fail(`${label}の具体的意味増分enumが不正です`);
  }
  assertNonempty(
    value.firstThenSecond.concreteMeaningIncrementDescription,
    `${label} concrete meaning increment`
  );
  assertNonempty(value.lunaReason.assessment, `${label} Luna reason assessment`);
}

function assertResultCandidateReview(
  value: unknown,
  expectedOrdinal: number,
  expectedScope: ReviewScope,
  sourceRole: SourceRole
): void {
  if (!isRecord(value)
    || !hasExactKeys(value, [
      'candidateId', 'secondOnlyUnderstanding', 'concreteMeaningIncrement',
      'concreteMeaningIncrementDescription', 'lunaReasonDisclosureAssessment',
      'meaningConnection', 'payoffStrength', 'wantToMake', 'generalIntroduction',
      'knownGoodRediscovery', 'connectionType', 'requiredVideoDurationMs',
      'candidateOrdinal', 'reviewScope',
      'stageObservations', 'diagnostics'
    ])
    || typeof value.candidateId !== 'string'
    || value.candidateOrdinal !== expectedOrdinal
    || value.reviewScope !== expectedScope
    || !['pass', 'fail'].includes(value.concreteMeaningIncrement as string)
    || !['pass', 'fail'].includes(value.meaningConnection as string)
    || !['pass', 'fail'].includes(value.payoffStrength as string)
    || !['pass', 'fail'].includes(value.wantToMake as string)
    || !['yes', 'no'].includes(value.generalIntroduction as string)
    || !isRecord(value.knownGoodRediscovery)
    || !hasExactKeys(value.knownGoodRediscovery, [
      'decision', 'referenceCandidateId', 'referenceHumanReviewResultSha256'
    ])
    || !['yes', 'no'].includes(value.knownGoodRediscovery.decision as string)
    || value.knownGoodRediscovery.referenceCandidateId !== 'camera-fear-escalation'
    || typeof value.knownGoodRediscovery.referenceHumanReviewResultSha256 !== 'string'
    || !SHA256.test(value.knownGoodRediscovery.referenceHumanReviewResultSha256)
    || (sourceRole === 'new-stream' && value.knownGoodRediscovery.decision !== 'no')
    || !DISTANT_CONNECTION_COMPARISON_CONNECTION_TYPES_V001.includes(
      value.connectionType as ConnectionType
    )) {
    fail(`${sourceRole}の人間評価${expectedOrdinal}件目が不正です`);
  }
  assertNonempty(value.secondOnlyUnderstanding, '後半単独理解');
  assertNonempty(value.concreteMeaningIncrementDescription, '具体的意味増分');
  assertNonempty(value.lunaReasonDisclosureAssessment, 'Luna理由開示後評価');
  assertStageObservations(value.stageObservations, `${sourceRole} candidate ${expectedOrdinal}`);
  const stageObservations = value.stageObservations as RecordValue;
  const secondOnly = stageObservations.secondOnly as RecordValue;
  const firstThenSecond = stageObservations.firstThenSecond as RecordValue;
  const lunaReason = stageObservations.lunaReason as RecordValue;
  if (secondOnly.understoodContent !== value.secondOnlyUnderstanding
    || firstThenSecond.concreteMeaningIncrement !== value.concreteMeaningIncrement
    || firstThenSecond.concreteMeaningIncrementDescription
      !== value.concreteMeaningIncrementDescription
    || lunaReason.assessment !== value.lunaReasonDisclosureAssessment) {
    fail(`${sourceRole}の人間評価${expectedOrdinal}件目の段階記録が評価値と一致しません`);
  }
  if (!isRecord(value.diagnostics)
    || !hasExactKeys(value.diagnostics, [
      'connectionType', 'temporalDistanceMs', 'secondPartFromCommentIncreaseInterval',
      'requiredVideoDurationMs'
    ])
    || value.diagnostics.connectionType !== value.connectionType
    || !Number.isSafeInteger(value.diagnostics.temporalDistanceMs)
    || (value.diagnostics.temporalDistanceMs as number) < 0
    || typeof value.diagnostics.secondPartFromCommentIncreaseInterval !== 'boolean'
    || !Number.isSafeInteger(value.diagnostics.requiredVideoDurationMs)
    || (value.diagnostics.requiredVideoDurationMs as number) <= 0
    || value.requiredVideoDurationMs !== value.diagnostics.requiredVideoDurationMs) {
    fail(`${sourceRole}の人間評価${expectedOrdinal}件目の診断項目が不正です`);
  }
}

export function assertDistantConnectionComparisonHumanReviewResultV001(
  value: unknown
): asserts value is DistantConnectionComparisonHumanReviewResultV001 {
  if (!isRecord(value)
    || !hasExactKeys(value, [
      'schemaVersion', 'experimentId', 'reviewedAt', 'reviewer', 'planBinding',
      'sources', 'metricAggregates'
    ])
    || value.schemaVersion !== DISTANT_CONNECTION_COMPARISON_HUMAN_REVIEW_RESULT_SCHEMA_V001) {
    fail('比較人間評価resultのroot構造または版が不正です');
  }
  assertFormalId(value.experimentId, 'experiment ID');
  if (typeof value.reviewedAt !== 'string'
    || !ISO_DATETIME.test(value.reviewedAt)
    || Number.isNaN(Date.parse(value.reviewedAt))) fail('reviewedAtが不正です');
  assertNonempty(value.reviewer, 'reviewer');
  assertBinding(value.planBinding, 'plan binding');
  if (value.planBinding.schemaVersion
    !== DISTANT_CONNECTION_COMPARISON_HUMAN_REVIEW_PLAN_SCHEMA_V001
    || !Array.isArray(value.sources)
    || value.sources.length !== 2) {
    fail('plan bindingまたはsource件数が不正です');
  }
  const knownGoodReferenceShas = new Set<string>();
  for (const [sourceIndex, source] of value.sources.entries()) {
    const expectedRole = EXPECTED_SOURCE_ROLES[sourceIndex];
    if (!isRecord(source)
      || !hasExactKeys(source, [
        'sourceRole', 'sourceVideoId', 'sourceBindings', 'candidateCount',
        'primaryCandidateCount', 'candidateReviews'
      ])
      || source.sourceRole !== expectedRole
      || source.sourceVideoId !== (expectedRole === 'new-stream'
        ? NEW_SOURCE_VIDEO_ID : OLD_SOURCE_VIDEO_ID)
      || !Number.isSafeInteger(source.candidateCount)
      || (source.candidateCount as number) < PRIMARY_CANDIDATE_COUNT
      || source.primaryCandidateCount !== PRIMARY_CANDIDATE_COUNT
      || !Array.isArray(source.candidateReviews)
      || source.candidateReviews.length !== source.candidateCount
      || !isRecord(source.sourceBindings)
      || !hasExactKeys(source.sourceBindings, [
        'candidateResponse', 'b6RunManifest', 'candidateReviewResult', 'sourcePackage'
      ])) {
      fail(`${expectedRole}の結果source構造・順序・完全被覆が不正です`);
    }
    assertBinding(source.sourceBindings.candidateResponse, `${expectedRole} candidate binding`);
    assertBinding(source.sourceBindings.b6RunManifest, `${expectedRole} B6 binding`);
    assertBinding(source.sourceBindings.candidateReviewResult, `${expectedRole} review binding`);
    assertBinding(source.sourceBindings.sourcePackage, `${expectedRole} source package binding`);
    const ids = new Set<string>();
    for (const [index, review] of source.candidateReviews.entries()) {
      assertResultCandidateReview(
        review,
        index + 1,
        index < PRIMARY_CANDIDATE_COUNT ? 'primary' : 'supplementary',
        expectedRole
      );
      const id = (review as RecordValue).candidateId as string;
      if (ids.has(id)) fail(`${expectedRole}のcandidate評価が重複しています`);
      ids.add(id);
      knownGoodReferenceShas.add(
        ((review as RecordValue).knownGoodRediscovery as RecordValue)
          .referenceHumanReviewResultSha256 as string
      );
    }
  }
  if (knownGoodReferenceShas.size !== 1) {
    fail('candidate別の既知合格例正式人間評価SHAが一致しません');
  }
  if (!isRecord(value.metricAggregates)
    || !hasExactKeys(value.metricAggregates, ['A', 'B', 'C', 'D', 'E'])) {
    fail('A〜E決定的集計が欠落しています');
  }
  const expected = metricAggregates(
    value.sources as DistantConnectionComparisonHumanReviewResultV001['sources']
  );
  if (JSON.stringify(value.metricAggregates) !== JSON.stringify(expected)) {
    fail('A〜E集計がcandidate別人間評価からの決定的再計算と一致しません');
  }
}

export function serializeDistantConnectionComparisonHumanReviewResultV001(
  value: DistantConnectionComparisonHumanReviewResultV001
): Buffer {
  assertDistantConnectionComparisonHumanReviewResultV001(value);
  return Buffer.from(`${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

export function validateDistantConnectionComparisonHumanReviewResultAgainstSourcesV001(
  value: DistantConnectionComparisonHumanReviewResultV001,
  input: BuildDistantConnectionComparisonHumanReviewResultV001Input
): void {
  const rebuilt = buildDistantConnectionComparisonHumanReviewResultV001(input);
  if (!serializeDistantConnectionComparisonHumanReviewResultV001(value)
    .equals(serializeDistantConnectionComparisonHumanReviewResultV001(rebuilt))) {
    fail('比較人間評価resultがplan・review動画・人間入力からの決定的再生成と一致しません');
  }
}

export type BuildDistantConnectionComparisonHumanReviewPageV001Input = {
  planPath: string;
  planBytes: Uint8Array;
  expectedPlanSha256: string;
  sourceRole: SourceRole;
  candidateResponsePath: string;
  candidateResponseBytes: Uint8Array;
  expectedCandidateResponseSha256: string;
  b6RunManifestPath: string;
  b6RunManifestBytes: Uint8Array;
  expectedB6RunManifestSha256: string;
  candidateReviewResultPath: string;
  candidateReviewResultBytes: Uint8Array;
  expectedCandidateReviewResultSha256: string;
  outputPath: string;
};

export type DistantConnectionComparisonHumanReviewPageV001 = {
  htmlBytes: Buffer;
  candidateCount: number;
  primaryCandidateCount: number;
};

export type WriteDistantConnectionComparisonHumanReviewPageV001FromFilesInput = Omit<
  BuildDistantConnectionComparisonHumanReviewPageV001Input,
  | 'planBytes'
  | 'candidateResponseBytes'
  | 'b6RunManifestBytes'
  | 'candidateReviewResultBytes'
> & {workspaceRoot: string};

function htmlEscape(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function relativeMediaUrl(outputPath: string, mediaPath: string): string {
  const relative = path.posix.relative(path.posix.dirname(outputPath), mediaPath);
  return relative.startsWith('.') ? relative : `./${relative}`;
}

export function buildDistantConnectionComparisonHumanReviewPageV001(
  input: BuildDistantConnectionComparisonHumanReviewPageV001Input
): DistantConnectionComparisonHumanReviewPageV001 {
  assertExpectedSha(sha256(input.planBytes), input.expectedPlanSha256, '事前登録plan');
  assertExpectedSha(
    sha256(input.candidateResponseBytes),
    input.expectedCandidateResponseSha256,
    '確認対象正式candidate'
  );
  assertExpectedSha(
    sha256(input.b6RunManifestBytes),
    input.expectedB6RunManifestSha256,
    '確認対象B6 manifest'
  );
  assertExpectedSha(
    sha256(input.candidateReviewResultBytes),
    input.expectedCandidateReviewResultSha256,
    '確認対象candidate review result'
  );
  assertPath(input.planPath, 'plan path');
  assertPath(input.outputPath, '確認page output path');
  const plan = decodeDistantConnectionComparisonHumanReviewPlanV001(input.planBytes);
  const parsed = parseCandidateResponse(input.candidateResponseBytes, '確認対象正式candidate');
  const expectedSourceId = input.sourceRole === 'new-stream'
    ? NEW_SOURCE_VIDEO_ID : OLD_SOURCE_VIDEO_ID;
  if (parsed.sourceVideoId !== expectedSourceId) fail('確認pageのsourceVideoIdがroleと一致しません');
  const candidateBinding = binding(
    input.candidateResponsePath,
    DISTANT_CONNECTION_COMPARISON_CANDIDATE_RESPONSE_SCHEMA_V001,
    input.candidateResponseBytes
  );
  const manifest = parseB6Manifest(input.b6RunManifestBytes, '確認page B6 manifest');
  if (JSON.stringify(manifest.candidateResponseBinding) !== JSON.stringify(candidateBinding)
    || manifest.validation.candidateCount !== parsed.candidates.length) {
    fail('確認pageのB6 manifestと正式candidateが不一致です');
  }
  const planSource = plan.sources[input.sourceRole === 'new-stream' ? 0 : 1];
  if (input.sourceRole === 'new-stream') {
    if (!('candidateResponseBinding' in planSource)
      || JSON.stringify(planSource.candidateResponseBinding) !== JSON.stringify(candidateBinding)
      || JSON.stringify(planSource.candidateTargets.map((target) => target.candidateId))
        !== JSON.stringify(parsed.candidates.map((candidate) => candidate.candidateId))) {
      fail('確認pageの新配信candidateがplanの事前登録配列と不一致です');
    }
  } else if (!('exactRequestBinding' in planSource)
    || JSON.stringify(manifest.exactRequestBinding) !== JSON.stringify(planSource.exactRequestBinding)
    || parsed.candidates.length < PRIMARY_CANDIDATE_COUNT) {
    fail('確認pageの旧配信B6がplanのexact request・先頭5件規則と不一致です');
  }
  const media = parseCandidateReviewResult(
    input.candidateReviewResultBytes,
    expectedSourceId,
    candidateBinding,
    parsed.candidates
  );
  const draftContextJson = JSON.stringify({
    draftClassification: 'non-formal-comparison-human-review-draft',
    formalHumanReviewResult: false,
    planBinding: {
      path: input.planPath,
      fileSha256: input.expectedPlanSha256
    },
    candidateResponseBinding: {
      path: input.candidateResponsePath,
      fileSha256: input.expectedCandidateResponseSha256
    },
    sourceVideoId: expectedSourceId
  }).replaceAll('<', '\\u003c');
  const cards = parsed.candidates.map((candidate, index) => {
    const row = media[index];
    const scope = index < PRIMARY_CANDIDATE_COUNT ? '主要評価' : '補助観測';
    const secondUrl = htmlEscape(relativeMediaUrl(
      input.outputPath,
      row.secondOnlyVideoBinding.path
    ));
    const bothUrl = htmlEscape(relativeMediaUrl(
      input.outputPath,
      row.firstThenSecondVideoBinding.path
    ));
    return `
      <article class="candidate" data-candidate-ordinal="${index + 1}">
        <header><h2>候補 ${index + 1}</h2><span>${scope}</span></header>
        <section class="stage stage-one" data-stage="second-only">
          <h3>1. まず後半だけ見る</h3>
          <p>前半とLunaの理由はまだ表示しません。</p>
          <video controls preload="metadata" src="${secondUrl}"></video>
          <label>後半だけで何が起きたと理解しましたか
            <textarea data-observation="second-only" required></textarea>
          </label>
          <button type="button" data-unlock="first-then-second">2へ進む</button>
        </section>
        <section class="stage stage-two" data-stage="first-then-second" hidden>
          <h3>2. 前半→後半を見る</h3>
          <video controls preload="metadata" src="${bothUrl}"></video>
          <label>後半について具体的に何が新しく分かりましたか
            <textarea data-observation="first-then-second" required></textarea>
          </label>
          <button type="button" data-unlock="luna-reason">3へ進む</button>
        </section>
        <section class="stage stage-three" data-stage="luna-reason" hidden>
          <h3>3. 最後にLunaの接続理由を見る</h3>
          <p class="luna-reason">${htmlEscape(candidate.addedUnderstanding)}</p>
          <label>人間の段階記録とLunaの理由を比べた評価
            <textarea data-observation="luna-reason" required></textarea>
          </label>
          <button type="button" data-export-draft>この候補の記録をJSON下書きとして保存</button>
          <p>保存されるJSONは正式な比較評価resultではなく、入力用の非正式下書きです。</p>
        </section>
      </article>`;
  }).join('\n');
  const html = `<!doctype html>
<html lang="ja">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>遠方接続 段階式比較確認</title>
  <style>
    :root{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#172033;background:#f4f6fa}
    body{max-width:1040px;margin:0 auto;padding:32px 20px 80px}h1{margin-bottom:8px}
    .notice{background:#fff4ce;border:1px solid #d8aa00;border-radius:12px;padding:16px;line-height:1.7}
    .candidate{background:white;border:1px solid #d8deea;border-radius:16px;margin:24px 0;padding:20px;box-shadow:0 3px 14px #17203312}
    header{display:flex;align-items:center;gap:16px}header span{background:#edf2ff;border-radius:999px;padding:5px 10px}
    .stage{border-top:1px solid #e4e8f0;margin-top:16px;padding-top:16px}.stage[hidden]{display:none!important}
    video{display:block;width:100%;max-height:560px;background:#111;border-radius:10px;margin:12px 0}
    label{display:block;font-weight:650;line-height:1.6}textarea{display:block;width:100%;min-height:92px;box-sizing:border-box;margin:8px 0 12px;padding:10px;font:inherit}
    button{border:0;border-radius:9px;background:#2457d6;color:white;padding:10px 18px;font-weight:700;cursor:pointer}.luna-reason{white-space:pre-wrap;background:#f0f4ff;padding:14px;border-radius:10px}
  </style>
</head>
<body>
  <h1>遠方接続の段階式比較確認</h1>
  <p class="notice">各候補を必ず「後半だけ」→「前半と後半」→「Lunaの理由」の順で確認します。先の段階の記録を書くまで次は開きません。</p>
  ${cards}
  <script>
    const draftContext = ${draftContextJson};
    for (const button of document.querySelectorAll('[data-unlock]')) {
      button.addEventListener('click', () => {
        const current = button.closest('.stage');
        const observation = current.querySelector('textarea');
        if (!observation.value.trim()) { observation.focus(); return; }
        const card = button.closest('.candidate');
        const next = card.querySelector('[data-stage="' + button.dataset.unlock + '"]');
        observation.readOnly = true;
        observation.setAttribute('aria-readonly', 'true');
        next.hidden = false;
        button.disabled = true;
        next.scrollIntoView({behavior:'smooth',block:'start'});
      });
    }
    for (const button of document.querySelectorAll('[data-export-draft]')) {
      button.addEventListener('click', () => {
        const card = button.closest('.candidate');
        const finalObservation = card.querySelector('[data-observation="luna-reason"]');
        if (!finalObservation.value.trim()) { finalObservation.focus(); return; }
        finalObservation.readOnly = true;
        finalObservation.setAttribute('aria-readonly', 'true');
        const draft = {
          ...draftContext,
          candidateOrdinal: Number(card.dataset.candidateOrdinal),
          observations: {
            secondOnlyUnderstanding:
              card.querySelector('[data-observation="second-only"]').value,
            concreteMeaningIncrementDescription:
              card.querySelector('[data-observation="first-then-second"]').value,
            lunaReasonDisclosureAssessment: finalObservation.value
          }
        };
        const blob = new Blob([JSON.stringify(draft, null, 2) + '\\n'], {
          type: 'application/json'
        });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = 'comparison-review-draft-candidate-' + draft.candidateOrdinal + '.json';
        link.click();
        URL.revokeObjectURL(link.href);
      });
    }
  </script>
</body>
</html>
`;
  return {
    htmlBytes: Buffer.from(html, 'utf8'),
    candidateCount: parsed.candidates.length,
    primaryCandidateCount: PRIMARY_CANDIDATE_COUNT
  };
}

export async function writeDistantConnectionComparisonHumanReviewPageV001FromFiles(
  input: WriteDistantConnectionComparisonHumanReviewPageV001FromFilesInput
): Promise<DistantConnectionComparisonHumanReviewPageV001> {
  const [planBytes, candidateResponseBytes, b6RunManifestBytes, candidateReviewResultBytes] =
    await Promise.all([
      readFile(path.join(input.workspaceRoot, input.planPath)),
      readFile(path.join(input.workspaceRoot, input.candidateResponsePath)),
      readFile(path.join(input.workspaceRoot, input.b6RunManifestPath)),
      readFile(path.join(input.workspaceRoot, input.candidateReviewResultPath))
    ]);
  const page = buildDistantConnectionComparisonHumanReviewPageV001({
    ...input,
    planBytes,
    candidateResponseBytes,
    b6RunManifestBytes,
    candidateReviewResultBytes
  });
  const outputAbsolute = path.join(input.workspaceRoot, input.outputPath);
  await mkdir(path.dirname(outputAbsolute), {recursive: true});
  await writeFile(outputAbsolute, page.htmlBytes, {flag: 'wx'});
  return page;
}

export async function writeDistantConnectionComparisonHumanReviewPlanV001FromFiles(
  input: Omit<BuildDistantConnectionComparisonHumanReviewPlanV001Input,
    'newCandidateResponseBytes' | 'oldExactRequestBytes' | 'knownGoodHumanReviewResultBytes'> & {
      workspaceRoot: string;
      outputPath: string;
    }
): Promise<DistantConnectionComparisonHumanReviewPlanV001> {
  const [newCandidateResponseBytes, oldExactRequestBytes, knownGoodHumanReviewResultBytes] =
  await Promise.all([
    readFile(path.join(input.workspaceRoot, input.newCandidateResponsePath)),
    readFile(path.join(input.workspaceRoot, input.oldExactRequestPath)),
    readFile(path.join(input.workspaceRoot, input.knownGoodHumanReviewResultPath))
  ]);
  const value = buildDistantConnectionComparisonHumanReviewPlanV001({
    ...input,
    newCandidateResponseBytes,
    oldExactRequestBytes,
    knownGoodHumanReviewResultBytes
  });
  const outputAbsolute = path.join(input.workspaceRoot, input.outputPath);
  await mkdir(path.dirname(outputAbsolute), {recursive: true});
  await writeFile(
    outputAbsolute,
    serializeDistantConnectionComparisonHumanReviewPlanV001(value),
    {flag: 'wx'}
  );
  return value;
}
