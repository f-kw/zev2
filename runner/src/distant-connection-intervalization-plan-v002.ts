import {createHash} from 'node:crypto';
import {mkdir, readFile, writeFile} from 'node:fs/promises';
import path from 'node:path';

import {
  DISTANT_CONNECTION_LUNA_RESPONSE_SCHEMA_V001,
  DISTANT_CONNECTION_LUNA_SOURCE_PACKAGE_SCHEMA_V001,
  decodeDistantConnectionLunaResponseV001,
  decodeDistantConnectionLunaSourcePackageV001,
  type DistantConnectionCandidateV001
} from './distant-connection-luna-source-package-v001.js';
import {
  SEMANTIC_UTTERANCE_ARTIFACT_SCHEMA_V001,
  assertSemanticUtteranceArtifactV001,
  type SemanticUtteranceArtifactV001,
  type SemanticUtteranceV001
} from './semantic-utterance-artifact-v001.js';

export const DISTANT_CONNECTION_INTERVALIZATION_PLAN_SCHEMA_V002 =
  'distant-connection-intervalization-plan-v002';

export const DISTANT_CONNECTION_INTERVAL_EXPANSION_REASONS_V002 = Object.freeze([
  'candidate-utterance-containment',
  'cause-visual',
  'minimal-introduction-context',
  'natural-ending'
] as const);

export type DistantConnectionIntervalExpansionReasonV002 =
  typeof DISTANT_CONNECTION_INTERVAL_EXPANSION_REASONS_V002[number];

export class DistantConnectionIntervalizationPlanErrorV002 extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DistantConnectionIntervalizationPlanErrorV002';
  }
}

type Binding = {path: string; schemaVersion: string; fileSha256: string};
type RecordValue = Record<string, unknown>;

export type DistantConnectionSelectedIntervalV002 = {
  sourceStartMs: number;
  sourceEndMs: number;
  includedSemanticUtteranceIds: string[];
  expansionReasons: DistantConnectionIntervalExpansionReasonV002[];
  reason: string;
};

export type DistantConnectionCandidateIntervalizationV002 = {
  candidateId: string;
  sourceVideoId: string;
  formalCandidate: {
    firstPartSemanticUtteranceIds: string[];
    secondPartSemanticUtteranceIds: string[];
  };
  firstPart: DistantConnectionSelectedIntervalV002;
  secondPart: DistantConnectionSelectedIntervalV002;
  shortFormViabilityObservation: string;
  candidateMeaningChanged: false;
};

export type DistantConnectionIntervalizationPlanV002 = {
  schemaVersion: typeof DISTANT_CONNECTION_INTERVALIZATION_PLAN_SCHEMA_V002;
  sourceVideoId: string;
  sourceBindings: {
    candidateResponse: Binding;
    semanticUtterance: Binding;
    sourcePackage: Binding;
  };
  candidateCount: number;
  candidates: DistantConnectionCandidateIntervalizationV002[];
  responsibilityPrinciple: string;
};

export type DistantConnectionIntervalizationDecisionV002 = {
  candidateId: string;
  firstPart: DistantConnectionSelectedIntervalV002;
  secondPart: DistantConnectionSelectedIntervalV002;
  shortFormViabilityObservation: string;
};

export type BuildDistantConnectionIntervalizationPlanV002Input = {
  candidateResponsePath: string;
  candidateResponseBytes: Uint8Array;
  expectedCandidateResponseSha256: string;
  semanticUtterancePath: string;
  semanticUtteranceBytes: Uint8Array;
  expectedSemanticUtteranceSha256: string;
  sourcePackagePath: string;
  sourcePackageBytes: Uint8Array;
  expectedSourcePackageSha256: string;
  decisions: DistantConnectionIntervalizationDecisionV002[];
};

export type BuildDistantConnectionIntervalizationPlanV002FromFilesInput = Omit<
  BuildDistantConnectionIntervalizationPlanV002Input,
  'candidateResponseBytes' | 'semanticUtteranceBytes' | 'sourcePackageBytes'
> & {workspaceRoot: string};

const SHA256 = /^[0-9a-f]{64}$/u;
const RESPONSIBILITY_PRINCIPLE =
  '正式候補は意味上の前半・後半発話を所有する。一般区間化計画は候補を変更せず動画で使用する前半・後半区間と拡張理由を所有し、候補価値・品質・採否を判断しない。';

function fail(message: string): never {
  throw new DistantConnectionIntervalizationPlanErrorV002(message);
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
    if (error instanceof DistantConnectionIntervalizationPlanErrorV002) throw error;
    fail(`${label}がJSONとして読めません`);
  }
}

function assertExpectedSha(actual: string, expected: string, label: string): void {
  if (!SHA256.test(expected) || actual !== expected) {
    fail(`${label}のSHA-256が指定正本と一致しません`);
  }
}

function sourceVideoIdFromUri(sourceUri: string): string {
  const base = path.basename(sourceUri);
  const extension = path.extname(base);
  const sourceVideoId = extension.length > 0 ? base.slice(0, -extension.length) : base;
  if (sourceVideoId.length === 0) fail('正式意味発話の元動画IDを解決できません');
  return sourceVideoId;
}

function assertBinding(value: unknown, label: string): asserts value is Binding {
  if (!isRecord(value)
    || !hasExactKeys(value, ['path', 'schemaVersion', 'fileSha256'])
    || typeof value.path !== 'string'
    || value.path.length === 0
    || typeof value.schemaVersion !== 'string'
    || value.schemaVersion.length === 0
    || typeof value.fileSha256 !== 'string'
    || !SHA256.test(value.fileSha256)) {
    fail(`${label}が不正です`);
  }
}

function assertStringArray(value: unknown, label: string): asserts value is string[] {
  if (!Array.isArray(value)
    || value.length === 0
    || value.some((item) => typeof item !== 'string' || item.length === 0)
    || new Set(value).size !== value.length) {
    fail(`${label}が空・不正・重複しています`);
  }
}

function assertSelectedIntervalShape(
  value: unknown,
  label: string
): asserts value is DistantConnectionSelectedIntervalV002 {
  if (!isRecord(value)
    || !hasExactKeys(value, [
      'sourceStartMs',
      'sourceEndMs',
      'includedSemanticUtteranceIds',
      'expansionReasons',
      'reason'
    ])
    || !Number.isSafeInteger(value.sourceStartMs)
    || !Number.isSafeInteger(value.sourceEndMs)
    || (value.sourceStartMs as number) < 0
    || (value.sourceEndMs as number) <= (value.sourceStartMs as number)
    || !Array.isArray(value.expansionReasons)
    || value.expansionReasons.length === 0
    || new Set(value.expansionReasons).size !== value.expansionReasons.length
    || value.expansionReasons.some((reason) =>
      !DISTANT_CONNECTION_INTERVAL_EXPANSION_REASONS_V002.includes(
        reason as DistantConnectionIntervalExpansionReasonV002
      ))
    || !value.expansionReasons.includes('candidate-utterance-containment')
    || typeof value.reason !== 'string'
    || value.reason.trim().length === 0) {
    fail(`${label}の時刻・拡張理由・説明が不正です`);
  }
  assertStringArray(value.includedSemanticUtteranceIds, `${label}の包含発話ID`);
}

function resolveIntervalUtterances(
  interval: DistantConnectionSelectedIntervalV002,
  utterances: SemanticUtteranceV001[],
  byId: Map<string, SemanticUtteranceV001>,
  label: string
): SemanticUtteranceV001[] {
  assertSelectedIntervalShape(interval, label);
  const included = interval.includedSemanticUtteranceIds.map((id) =>
    byId.get(id) ?? fail(`${label}が未知の正式発話ID ${id} を参照しています`));
  for (let index = 1; index < included.length; index += 1) {
    if (included[index].ordinal <= included[index - 1].ordinal) {
      fail(`${label}の正式発話IDが時系列順ではありません`);
    }
  }
  const overlapping = utterances.filter((row) =>
    row.sourceEndMs > interval.sourceStartMs && row.sourceStartMs < interval.sourceEndMs);
  if (overlapping.some((row) =>
    row.sourceStartMs < interval.sourceStartMs || row.sourceEndMs > interval.sourceEndMs)) {
    fail(`${label}が正式発話の途中で切れています`);
  }
  const expectedIds = overlapping.map((row) => row.utteranceId);
  if (JSON.stringify(expectedIds) !== JSON.stringify(interval.includedSemanticUtteranceIds)) {
    fail(`${label}内の正式発話が欠落・余分・順序不一致です`);
  }
  return included;
}

function assertFormalContainment(
  formalIds: string[],
  intervalIds: string[],
  label: string
): void {
  const selected = new Set(intervalIds);
  if (!formalIds.every((id) => selected.has(id))) {
    fail(`${label}が正式候補発話を包含していません`);
  }
}

function assertExpansionReasonMatchesBounds(
  interval: DistantConnectionSelectedIntervalV002,
  formalRows: SemanticUtteranceV001[],
  label: string
): void {
  const formalStartMs = formalRows[0].sourceStartMs;
  const formalEndMs = formalRows.at(-1)!.sourceEndMs;
  const expanded = interval.sourceStartMs < formalStartMs || interval.sourceEndMs > formalEndMs;
  const hasExpansionReason = interval.expansionReasons.some((reason) =>
    reason !== 'candidate-utterance-containment');
  if (expanded !== hasExpansionReason) {
    fail(`${label}の区間拡張有無と拡張理由が一致しません`);
  }
}

function validateDecision(
  candidate: DistantConnectionCandidateV001,
  decision: DistantConnectionIntervalizationDecisionV002,
  semantic: SemanticUtteranceArtifactV001,
  sourceVideoId: string
): DistantConnectionCandidateIntervalizationV002 {
  if (!isRecord(decision)
    || !hasExactKeys(decision, [
      'candidateId', 'firstPart', 'secondPart', 'shortFormViabilityObservation'
    ])
    || decision.candidateId !== candidate.candidateId
    || typeof decision.shortFormViabilityObservation !== 'string'
    || decision.shortFormViabilityObservation.trim().length === 0) {
    fail(`${candidate.candidateId}の区間化判断が不正または順序不一致です`);
  }
  const byId = new Map(semantic.utterances.map((row) => [row.utteranceId, row]));
  const firstIncluded = resolveIntervalUtterances(
    decision.firstPart,
    semantic.utterances,
    byId,
    `${candidate.candidateId}の前半区間`
  );
  const secondIncluded = resolveIntervalUtterances(
    decision.secondPart,
    semantic.utterances,
    byId,
    `${candidate.candidateId}の後半区間`
  );
  const firstFormal = candidate.firstPartSemanticUtteranceIds.map((id) =>
    byId.get(id) ?? fail(`${candidate.candidateId}の前半が未知の正式発話を参照しています`));
  const secondFormal = candidate.secondPartSemanticUtteranceIds.map((id) =>
    byId.get(id) ?? fail(`${candidate.candidateId}の後半が未知の正式発話を参照しています`));
  assertFormalContainment(
    candidate.firstPartSemanticUtteranceIds,
    decision.firstPart.includedSemanticUtteranceIds,
    `${candidate.candidateId}の前半区間`
  );
  assertFormalContainment(
    candidate.secondPartSemanticUtteranceIds,
    decision.secondPart.includedSemanticUtteranceIds,
    `${candidate.candidateId}の後半区間`
  );
  assertExpansionReasonMatchesBounds(decision.firstPart, firstFormal, `${candidate.candidateId}の前半`);
  assertExpansionReasonMatchesBounds(decision.secondPart, secondFormal, `${candidate.candidateId}の後半`);
  if (decision.firstPart.sourceEndMs >= decision.secondPart.sourceStartMs
    || firstIncluded.at(-1)!.ordinal >= secondIncluded[0].ordinal) {
    fail(`${candidate.candidateId}の前半・後半の時系列順が不正です`);
  }
  return {
    candidateId: candidate.candidateId,
    sourceVideoId,
    formalCandidate: {
      firstPartSemanticUtteranceIds: [...candidate.firstPartSemanticUtteranceIds],
      secondPartSemanticUtteranceIds: [...candidate.secondPartSemanticUtteranceIds]
    },
    firstPart: decision.firstPart,
    secondPart: decision.secondPart,
    shortFormViabilityObservation: decision.shortFormViabilityObservation,
    candidateMeaningChanged: false
  };
}

export function buildDistantConnectionIntervalizationPlanV002(
  input: BuildDistantConnectionIntervalizationPlanV002Input
): DistantConnectionIntervalizationPlanV002 {
  const candidateResponseSha256 = sha256(input.candidateResponseBytes);
  const semanticUtteranceSha256 = sha256(input.semanticUtteranceBytes);
  const sourcePackageSha256 = sha256(input.sourcePackageBytes);
  assertExpectedSha(
    candidateResponseSha256,
    input.expectedCandidateResponseSha256,
    '正式候補成果物'
  );
  assertExpectedSha(
    semanticUtteranceSha256,
    input.expectedSemanticUtteranceSha256,
    '正式意味発話成果物'
  );
  assertExpectedSha(sourcePackageSha256, input.expectedSourcePackageSha256, 'Luna正式入力');

  const semantic = parseJson(input.semanticUtteranceBytes, '正式意味発話成果物');
  assertSemanticUtteranceArtifactV001(semantic);
  const sourcePackage = decodeDistantConnectionLunaSourcePackageV001(input.sourcePackageBytes);
  if (sourcePackage.semanticUtteranceBinding.path !== input.semanticUtterancePath
    || sourcePackage.semanticUtteranceBinding.fileSha256 !== semanticUtteranceSha256) {
    fail('Luna正式入力が指定された正式意味発話成果物を束縛していません');
  }
  const response = decodeDistantConnectionLunaResponseV001(input.candidateResponseBytes, {
    sourcePackagePath: input.sourcePackagePath,
    sourcePackageBytes: input.sourcePackageBytes
  });
  const semanticSourceVideoId = sourceVideoIdFromUri(semantic.sourceUri);
  if (response.sourceVideoId !== sourcePackage.sourceVideoId
    || response.sourceVideoId !== semanticSourceVideoId) {
    fail('正式候補・正式入力・正式意味発話の元動画IDが一致しません');
  }
  if (response.candidates.length === 0
    || input.decisions.length !== response.candidates.length) {
    fail('全正式候補をちょうど1回区間化する必要があります');
  }
  const decisionIds = input.decisions.map((decision) => decision.candidateId);
  if (new Set(decisionIds).size !== decisionIds.length) {
    fail('区間化判断のcandidate IDが重複しています');
  }
  const candidateIds = response.candidates.map((candidate) => candidate.candidateId);
  if (JSON.stringify(decisionIds) !== JSON.stringify(candidateIds)) {
    fail('区間化判断のcandidate ID・完全被覆・順序が正式候補と一致しません');
  }
  const candidates = response.candidates.map((candidate, index) => validateDecision(
    candidate,
    input.decisions[index],
    semantic,
    response.sourceVideoId
  ));
  const result: DistantConnectionIntervalizationPlanV002 = {
    schemaVersion: DISTANT_CONNECTION_INTERVALIZATION_PLAN_SCHEMA_V002,
    sourceVideoId: response.sourceVideoId,
    sourceBindings: {
      candidateResponse: {
        path: input.candidateResponsePath,
        schemaVersion: DISTANT_CONNECTION_LUNA_RESPONSE_SCHEMA_V001,
        fileSha256: candidateResponseSha256
      },
      semanticUtterance: {
        path: input.semanticUtterancePath,
        schemaVersion: SEMANTIC_UTTERANCE_ARTIFACT_SCHEMA_V001,
        fileSha256: semanticUtteranceSha256
      },
      sourcePackage: {
        path: input.sourcePackagePath,
        schemaVersion: DISTANT_CONNECTION_LUNA_SOURCE_PACKAGE_SCHEMA_V001,
        fileSha256: sourcePackageSha256
      }
    },
    candidateCount: candidates.length,
    candidates,
    responsibilityPrinciple: RESPONSIBILITY_PRINCIPLE
  };
  assertDistantConnectionIntervalizationPlanV002(result);
  return result;
}

export function assertDistantConnectionIntervalizationPlanV002(
  value: unknown
): asserts value is DistantConnectionIntervalizationPlanV002 {
  if (!isRecord(value)
    || !hasExactKeys(value, [
      'schemaVersion',
      'sourceVideoId',
      'sourceBindings',
      'candidateCount',
      'candidates',
      'responsibilityPrinciple'
    ])
    || value.schemaVersion !== DISTANT_CONNECTION_INTERVALIZATION_PLAN_SCHEMA_V002
    || typeof value.sourceVideoId !== 'string'
    || value.sourceVideoId.length === 0
    || !Number.isSafeInteger(value.candidateCount)
    || (value.candidateCount as number) <= 0
    || !Array.isArray(value.candidates)
    || value.candidates.length !== value.candidateCount
    || value.responsibilityPrinciple !== RESPONSIBILITY_PRINCIPLE
    || !isRecord(value.sourceBindings)
    || !hasExactKeys(value.sourceBindings, [
      'candidateResponse', 'semanticUtterance', 'sourcePackage'
    ])) {
    fail('一般区間化計画のroot構造・固定責務が不正です');
  }
  assertBinding(value.sourceBindings.candidateResponse, '正式候補binding');
  assertBinding(value.sourceBindings.semanticUtterance, '正式意味発話binding');
  assertBinding(value.sourceBindings.sourcePackage, 'Luna正式入力binding');
  const ids: string[] = [];
  for (const [index, candidate] of value.candidates.entries()) {
    if (!isRecord(candidate)
      || !hasExactKeys(candidate, [
        'candidateId',
        'sourceVideoId',
        'formalCandidate',
        'firstPart',
        'secondPart',
        'shortFormViabilityObservation',
        'candidateMeaningChanged'
      ])
      || typeof candidate.candidateId !== 'string'
      || candidate.candidateId.length === 0
      || candidate.sourceVideoId !== value.sourceVideoId
      || !isRecord(candidate.formalCandidate)
      || !hasExactKeys(candidate.formalCandidate, [
        'firstPartSemanticUtteranceIds', 'secondPartSemanticUtteranceIds'
      ])
      || typeof candidate.shortFormViabilityObservation !== 'string'
      || candidate.shortFormViabilityObservation.trim().length === 0
      || candidate.candidateMeaningChanged !== false) {
      fail(`候補${index + 1}件目の一般区間化計画が不正です`);
    }
    assertStringArray(
      candidate.formalCandidate.firstPartSemanticUtteranceIds,
      `候補${index + 1}件目の正式前半発話ID`
    );
    assertStringArray(
      candidate.formalCandidate.secondPartSemanticUtteranceIds,
      `候補${index + 1}件目の正式後半発話ID`
    );
    assertSelectedIntervalShape(candidate.firstPart, `候補${index + 1}件目の前半区間`);
    assertSelectedIntervalShape(candidate.secondPart, `候補${index + 1}件目の後半区間`);
    if (candidate.firstPart.sourceEndMs >= candidate.secondPart.sourceStartMs) {
      fail(`候補${index + 1}件目の前半・後半時刻順が不正です`);
    }
    ids.push(candidate.candidateId);
  }
  if (new Set(ids).size !== ids.length) fail('一般区間化計画のcandidate IDが重複しています');
}

export function serializeDistantConnectionIntervalizationPlanV002(
  plan: DistantConnectionIntervalizationPlanV002
): Buffer {
  assertDistantConnectionIntervalizationPlanV002(plan);
  return Buffer.from(`${JSON.stringify(plan, null, 2)}\n`, 'utf8');
}

export function validateDistantConnectionIntervalizationPlanAgainstSourcesV002(
  plan: DistantConnectionIntervalizationPlanV002,
  input: BuildDistantConnectionIntervalizationPlanV002Input
): void {
  assertDistantConnectionIntervalizationPlanV002(plan);
  const rebuilt = buildDistantConnectionIntervalizationPlanV002(input);
  if (!serializeDistantConnectionIntervalizationPlanV002(plan)
    .equals(serializeDistantConnectionIntervalizationPlanV002(rebuilt))) {
    fail('一般区間化計画が指定正本と区間判断からの決定的再生成結果に一致しません');
  }
}

export async function buildDistantConnectionIntervalizationPlanV002FromFiles(
  input: BuildDistantConnectionIntervalizationPlanV002FromFilesInput
): Promise<DistantConnectionIntervalizationPlanV002> {
  const [candidateResponseBytes, semanticUtteranceBytes, sourcePackageBytes] = await Promise.all([
    readFile(path.join(input.workspaceRoot, input.candidateResponsePath)),
    readFile(path.join(input.workspaceRoot, input.semanticUtterancePath)),
    readFile(path.join(input.workspaceRoot, input.sourcePackagePath))
  ]);
  return buildDistantConnectionIntervalizationPlanV002({
    ...input,
    candidateResponseBytes,
    semanticUtteranceBytes,
    sourcePackageBytes
  });
}

export async function writeDistantConnectionIntervalizationPlanV002FromFiles(
  input: BuildDistantConnectionIntervalizationPlanV002FromFilesInput & {outputPath: string}
): Promise<DistantConnectionIntervalizationPlanV002> {
  const plan = await buildDistantConnectionIntervalizationPlanV002FromFiles(input);
  const outputAbsolute = path.join(input.workspaceRoot, input.outputPath);
  await mkdir(path.dirname(outputAbsolute), {recursive: true});
  await writeFile(outputAbsolute, serializeDistantConnectionIntervalizationPlanV002(plan), {
    flag: 'wx'
  });
  return plan;
}
