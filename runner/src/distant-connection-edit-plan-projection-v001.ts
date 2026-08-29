import {createHash} from 'node:crypto';

import {
  DISTANT_CONNECTION_INTERVALIZATION_PLAN_SCHEMA_V002,
  assertDistantConnectionIntervalizationPlanV002,
  type DistantConnectionIntervalizationPlanV002
} from './distant-connection-intervalization-plan-v002.js';

export const DISTANT_CONNECTION_EDIT_PLAN_PROJECTION_SCHEMA_V001 =
  'distant-connection-edit-plan-projection-v001';

export class DistantConnectionEditPlanProjectionErrorV001 extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DistantConnectionEditPlanProjectionErrorV001';
  }
}

type RecordValue = Record<string, unknown>;
type Binding = {path: string; schemaVersion: string; fileSha256: string};

export type DistantConnectionEditPlanProjectionSegmentV001 = {
  part: 'first' | 'second';
  sourceStartMs: number;
  sourceEndMs: number;
  includedSemanticUtteranceIds: string[];
  expansionReasons: string[];
  reason: string;
};

export type DistantConnectionEditPlanProjectionV001 = {
  kind: 'edit_plan_json';
  schemaVersion: typeof DISTANT_CONNECTION_EDIT_PLAN_PROJECTION_SCHEMA_V001;
  projectionId: string;
  sourceVideoId: string;
  candidateId: string;
  sourceBindings: {
    intervalizationPlan: Binding;
    candidateResponse: Binding;
    semanticUtterance: Binding;
    sourceVideo: {path: string; sourceUri: string; fileSha256: string};
  };
  segments: [
    DistantConnectionEditPlanProjectionSegmentV001,
    DistantConnectionEditPlanProjectionSegmentV001
  ];
  responsibilityPrinciple: string;
};

export type BuildDistantConnectionEditPlanProjectionsV001Input = {
  intervalizationPlanPath: string;
  intervalizationPlanBytes: Uint8Array;
  expectedIntervalizationPlanSha256: string;
  candidateResponsePath: string;
  candidateResponseBytes: Uint8Array;
  expectedCandidateResponseSha256: string;
  semanticUtterancePath: string;
  semanticUtteranceBytes: Uint8Array;
  expectedSemanticUtteranceSha256: string;
  sourceVideoPath: string;
  sourceVideoUri: string;
  sourceVideoSha256: string;
  expectedSourceVideoSha256: string;
};

const SHA256 = /^[0-9a-f]{64}$/u;
const RESPONSIBILITY =
  '本projectionは一般区間化計画v002の候補別first・second区間を、既存基礎映像builderが来歴として受理するedit_plan_jsonへ無変更投影する。区間判断・候補採否・描画責務は所有しない。';

function fail(message: string): never {
  throw new DistantConnectionEditPlanProjectionErrorV001(message);
}

function isRecord(value: unknown): value is RecordValue {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function exactKeys(value: RecordValue, keys: string[]): boolean {
  const actual = Object.keys(value);
  return actual.length === keys.length && actual.every((key, index) => key === keys[index]);
}

function sha256(bytes: Uint8Array): string {
  return createHash('sha256').update(bytes).digest('hex');
}

function parse(bytes: Uint8Array, label: string): RecordValue {
  try {
    const value: unknown = JSON.parse(Buffer.from(bytes).toString('utf8'));
    if (!isRecord(value)) fail(`${label}のrootがobjectではありません`);
    return value;
  } catch (error) {
    if (error instanceof DistantConnectionEditPlanProjectionErrorV001) throw error;
    fail(`${label}がJSONとして読めません`);
  }
}

function assertExpectedSha(bytes: Uint8Array, expected: string, label: string): string {
  const actual = sha256(bytes);
  if (!SHA256.test(expected) || actual !== expected) fail(`${label}のSHA-256が一致しません`);
  return actual;
}

function assertBinding(value: unknown, label: string): asserts value is Binding {
  if (!isRecord(value)
    || !exactKeys(value, ['path', 'schemaVersion', 'fileSha256'])
    || typeof value.path !== 'string'
    || value.path.length === 0
    || typeof value.schemaVersion !== 'string'
    || value.schemaVersion.length === 0
    || typeof value.fileSha256 !== 'string'
    || !SHA256.test(value.fileSha256)) fail(`${label}が不正です`);
}

function inspectSources(input: BuildDistantConnectionEditPlanProjectionsV001Input) {
  const planSha = assertExpectedSha(
    input.intervalizationPlanBytes,
    input.expectedIntervalizationPlanSha256,
    '一般区間化計画'
  );
  const candidateSha = assertExpectedSha(
    input.candidateResponseBytes,
    input.expectedCandidateResponseSha256,
    '正式候補'
  );
  const semanticSha = assertExpectedSha(
    input.semanticUtteranceBytes,
    input.expectedSemanticUtteranceSha256,
    '正式意味発話'
  );
  if (!SHA256.test(input.sourceVideoSha256)
    || input.sourceVideoSha256 !== input.expectedSourceVideoSha256) {
    fail('元動画SHA-256が一致しません');
  }
  const planValue = parse(input.intervalizationPlanBytes, '一般区間化計画');
  assertDistantConnectionIntervalizationPlanV002(planValue);
  const plan = planValue as DistantConnectionIntervalizationPlanV002;
  const candidates = parse(input.candidateResponseBytes, '正式候補');
  const semantic = parse(input.semanticUtteranceBytes, '正式意味発話');
  if (candidates.schemaVersion !== 'distant-connection-luna-response-v001'
    || candidates.sourceVideoId !== plan.sourceVideoId
    || !Array.isArray(candidates.candidates)
    || semantic.schemaVersion !== 'semantic-utterance-artifact-v001'
    || semantic.sourceUri !== input.sourceVideoUri
    || plan.sourceBindings.candidateResponse.path !== input.candidateResponsePath
    || plan.sourceBindings.candidateResponse.fileSha256 !== candidateSha
    || plan.sourceBindings.semanticUtterance.path !== input.semanticUtterancePath
    || plan.sourceBindings.semanticUtterance.fileSha256 !== semanticSha) {
    fail('一般区間化計画・正式候補・正式意味発話・元動画のbindingが一致しません');
  }
  const candidateIds = candidates.candidates.map((candidate, index) => {
    if (!isRecord(candidate)
      || typeof candidate.candidateId !== 'string'
      || !Array.isArray(candidate.firstPartSemanticUtteranceIds)
      || !Array.isArray(candidate.secondPartSemanticUtteranceIds)) {
      fail(`正式候補${index + 1}件目が不正です`);
    }
    const planCandidate = plan.candidates[index];
    if (planCandidate?.candidateId !== candidate.candidateId
      || JSON.stringify(planCandidate.formalCandidate.firstPartSemanticUtteranceIds)
        !== JSON.stringify(candidate.firstPartSemanticUtteranceIds)
      || JSON.stringify(planCandidate.formalCandidate.secondPartSemanticUtteranceIds)
        !== JSON.stringify(candidate.secondPartSemanticUtteranceIds)) {
      fail('一般区間化計画が正式候補を同順で完全被覆していません');
    }
    return candidate.candidateId;
  });
  if (candidateIds.length !== plan.candidates.length
    || new Set(candidateIds).size !== candidateIds.length) {
    fail('正式候補に欠落または重複があります');
  }
  return {plan, planSha, candidateSha, semanticSha};
}

export function buildDistantConnectionEditPlanProjectionsV001(
  input: BuildDistantConnectionEditPlanProjectionsV001Input
): DistantConnectionEditPlanProjectionV001[] {
  const inspected = inspectSources(input);
  return inspected.plan.candidates.map((candidate) => {
    const projection: DistantConnectionEditPlanProjectionV001 = {
      kind: 'edit_plan_json',
      schemaVersion: DISTANT_CONNECTION_EDIT_PLAN_PROJECTION_SCHEMA_V001,
      projectionId: `${inspected.plan.sourceVideoId}-${candidate.candidateId}-edit-plan-projection-v001`,
      sourceVideoId: inspected.plan.sourceVideoId,
      candidateId: candidate.candidateId,
      sourceBindings: {
        intervalizationPlan: {
          path: input.intervalizationPlanPath,
          schemaVersion: DISTANT_CONNECTION_INTERVALIZATION_PLAN_SCHEMA_V002,
          fileSha256: inspected.planSha
        },
        candidateResponse: {...inspected.plan.sourceBindings.candidateResponse},
        semanticUtterance: {...inspected.plan.sourceBindings.semanticUtterance},
        sourceVideo: {
          path: input.sourceVideoPath,
          sourceUri: input.sourceVideoUri,
          fileSha256: input.sourceVideoSha256
        }
      },
      segments: [
        {
          part: 'first',
          sourceStartMs: candidate.firstPart.sourceStartMs,
          sourceEndMs: candidate.firstPart.sourceEndMs,
          includedSemanticUtteranceIds: [...candidate.firstPart.includedSemanticUtteranceIds],
          expansionReasons: [...candidate.firstPart.expansionReasons],
          reason: candidate.firstPart.reason
        },
        {
          part: 'second',
          sourceStartMs: candidate.secondPart.sourceStartMs,
          sourceEndMs: candidate.secondPart.sourceEndMs,
          includedSemanticUtteranceIds: [...candidate.secondPart.includedSemanticUtteranceIds],
          expansionReasons: [...candidate.secondPart.expansionReasons],
          reason: candidate.secondPart.reason
        }
      ],
      responsibilityPrinciple: RESPONSIBILITY
    };
    assertDistantConnectionEditPlanProjectionV001(projection);
    return projection;
  });
}

function assertSegment(value: unknown, expectedPart: 'first' | 'second', label: string): void {
  if (!isRecord(value)
    || !exactKeys(value, [
      'part', 'sourceStartMs', 'sourceEndMs', 'includedSemanticUtteranceIds',
      'expansionReasons', 'reason'
    ])
    || value.part !== expectedPart
    || !Number.isSafeInteger(value.sourceStartMs)
    || !Number.isSafeInteger(value.sourceEndMs)
    || (value.sourceStartMs as number) < 0
    || (value.sourceEndMs as number) <= (value.sourceStartMs as number)
    || !Array.isArray(value.includedSemanticUtteranceIds)
    || value.includedSemanticUtteranceIds.length === 0
    || value.includedSemanticUtteranceIds.some((id) => typeof id !== 'string' || id.length === 0)
    || new Set(value.includedSemanticUtteranceIds).size !== value.includedSemanticUtteranceIds.length
    || !Array.isArray(value.expansionReasons)
    || value.expansionReasons.length === 0
    || value.expansionReasons.some((reason) => typeof reason !== 'string' || reason.length === 0)
    || typeof value.reason !== 'string'
    || value.reason.length === 0) fail(`${label}が不正です`);
}

export function assertDistantConnectionEditPlanProjectionV001(
  value: unknown
): asserts value is DistantConnectionEditPlanProjectionV001 {
  if (!isRecord(value)
    || !exactKeys(value, [
      'kind', 'schemaVersion', 'projectionId', 'sourceVideoId', 'candidateId',
      'sourceBindings', 'segments', 'responsibilityPrinciple'
    ])
    || value.kind !== 'edit_plan_json'
    || value.schemaVersion !== DISTANT_CONNECTION_EDIT_PLAN_PROJECTION_SCHEMA_V001
    || typeof value.projectionId !== 'string'
    || value.projectionId.length === 0
    || typeof value.sourceVideoId !== 'string'
    || value.sourceVideoId.length === 0
    || typeof value.candidateId !== 'string'
    || value.candidateId.length === 0
    || value.responsibilityPrinciple !== RESPONSIBILITY
    || !isRecord(value.sourceBindings)
    || !exactKeys(value.sourceBindings, [
      'intervalizationPlan', 'candidateResponse', 'semanticUtterance', 'sourceVideo'
    ])
    || !Array.isArray(value.segments)
    || value.segments.length !== 2) fail('edit plan projectionのroot構造・固定責務が不正です');
  assertBinding(value.sourceBindings.intervalizationPlan, '一般区間化計画binding');
  assertBinding(value.sourceBindings.candidateResponse, '正式候補binding');
  assertBinding(value.sourceBindings.semanticUtterance, '正式意味発話binding');
  const sourceVideo = value.sourceBindings.sourceVideo;
  if (!isRecord(sourceVideo)
    || !exactKeys(sourceVideo, ['path', 'sourceUri', 'fileSha256'])
    || typeof sourceVideo.path !== 'string'
    || sourceVideo.path.length === 0
    || typeof sourceVideo.sourceUri !== 'string'
    || sourceVideo.sourceUri.length === 0
    || typeof sourceVideo.fileSha256 !== 'string'
    || !SHA256.test(sourceVideo.fileSha256)) fail('元動画bindingが不正です');
  assertSegment(value.segments[0], 'first', '前半projection区間');
  assertSegment(value.segments[1], 'second', '後半projection区間');
  const first = value.segments[0] as DistantConnectionEditPlanProjectionSegmentV001;
  const second = value.segments[1] as DistantConnectionEditPlanProjectionSegmentV001;
  if (first.sourceEndMs >= second.sourceStartMs) fail('first→second時刻順が不正です');
}

export function validateDistantConnectionEditPlanProjectionsAgainstSourcesV001(
  projections: DistantConnectionEditPlanProjectionV001[],
  input: BuildDistantConnectionEditPlanProjectionsV001Input
): void {
  const rebuilt = buildDistantConnectionEditPlanProjectionsV001(input);
  if (projections.length !== rebuilt.length
    || projections.some((projection, index) => {
      assertDistantConnectionEditPlanProjectionV001(projection);
      return !serializeDistantConnectionEditPlanProjectionV001(projection)
        .equals(serializeDistantConnectionEditPlanProjectionV001(rebuilt[index]));
    })) fail('projectionが正本入力からの決定的再生成結果と一致しません');
}

export function serializeDistantConnectionEditPlanProjectionV001(
  projection: DistantConnectionEditPlanProjectionV001
): Buffer {
  assertDistantConnectionEditPlanProjectionV001(projection);
  return Buffer.from(`${JSON.stringify(projection, null, 2)}\n`, 'utf8');
}
