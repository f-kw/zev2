import {createHash} from 'node:crypto';

import {
  DISTANT_CONNECTION_LUNA_RESPONSE_SCHEMA_V001
} from './distant-connection-luna-source-package-v001.js';
import {
  DISTANT_CONNECTION_LUNA_SOURCE_PACKAGE_SCHEMA_V002,
  decodeDistantConnectionLunaSourcePackageV002,
  validateDistantConnectionLunaResponseV002,
  type DistantConnectionLunaFormalFileBindingV002,
  type DistantConnectionLunaResponseV002,
  type DistantConnectionLunaSourcePackageV002
} from './distant-connection-luna-source-package-v002.js';

export const DISTANT_CONNECTION_LUNA_INDEXED_MODEL_INPUT_SCHEMA_V001 =
  'distant-connection-luna-indexed-model-input-v001';
export const DISTANT_CONNECTION_LUNA_INDEX_RESPONSE_SCHEMA_V001 =
  'distant-connection-luna-index-response-v001';

export const DISTANT_CONNECTION_LUNA_INDEX_REFERENCE_ERROR_CODES_V001 = Object.freeze([
  'SOURCE_PACKAGE_INVALID',
  'SOURCE_PACKAGE_PATH_MISMATCH',
  'INDEXED_MODEL_INPUT_INVALID',
  'INDEXED_MODEL_INPUT_SOURCE_MISMATCH',
  'INDEX_RESPONSE_INVALID',
  'INDEX_NOT_INTEGER',
  'INDEX_OUT_OF_RANGE',
  'INDEX_DUPLICATE',
  'INDEX_ORDER_REVERSED',
  'ANCHOR_DIRECTION_MISMATCH',
  'CANDIDATE_REFERENCE_DUPLICATE',
  'FORMAL_RESPONSE_INVALID'
] as const);

export type DistantConnectionLunaIndexReferenceErrorCodeV001 =
  typeof DISTANT_CONNECTION_LUNA_INDEX_REFERENCE_ERROR_CODES_V001[number];

export class DistantConnectionLunaIndexReferenceErrorV001 extends Error {
  readonly code: DistantConnectionLunaIndexReferenceErrorCodeV001;

  constructor(
    code: DistantConnectionLunaIndexReferenceErrorCodeV001,
    message: string,
    options?: ErrorOptions
  ) {
    super(message, options);
    this.name = 'DistantConnectionLunaIndexReferenceErrorV001';
    this.code = code;
  }
}

export type DistantConnectionLunaIndexCandidateV001 = {
  anchorIndex: number;
  firstPartUtteranceIndexes: number[];
  secondPartUtteranceIndexes: number[];
  addedUnderstanding: string;
  direction: 'past' | 'future';
};

export type DistantConnectionLunaIndexResponseV001 = {
  schemaVersion: typeof DISTANT_CONNECTION_LUNA_INDEX_RESPONSE_SCHEMA_V001;
  candidates: DistantConnectionLunaIndexCandidateV001[];
};

export type DistantConnectionLunaIndexedModelInputV001 = {
  schemaVersion: typeof DISTANT_CONNECTION_LUNA_INDEXED_MODEL_INPUT_SCHEMA_V001;
  sourcePackageBinding: DistantConnectionLunaFormalFileBindingV002;
  indexBase: 0;
  explorationTask: {
    objective: string;
    anchorInstruction: string;
    returnInstruction: string;
    boundaryMeaning: string;
  };
  learningContext: {
    humanVerdict: 'rejected';
    rejectionPrimaryCause: 'candidate-selection';
    rejectionReason: string;
    selectionStatus: 'not-selected';
    rejectedCandidate: DistantConnectionLunaIndexCandidateV001;
    priorUseCount: number;
  };
  utteranceCount: number;
  anchorCount: number;
  utterances: Array<{
    utteranceIndex: number;
    text: string;
    sourceStartMs: number;
    sourceEndMs: number;
    sourceSegmentIds: number[];
  }>;
  anchors: Array<{
    anchorIndex: number;
    utteranceIndex: number;
  }>;
  responseContract: {
    schemaVersion: typeof DISTANT_CONNECTION_LUNA_INDEX_RESPONSE_SCHEMA_V001;
    jsonSchema: Record<string, unknown>;
  };
};

export type BuildDistantConnectionLunaIndexedModelInputV001 = {
  sourcePackagePath: string;
  sourcePackageBytes: Uint8Array;
};

export type ResolveDistantConnectionLunaIndexResponseFromBytesInputV001 =
  BuildDistantConnectionLunaIndexedModelInputV001 & {
    indexedModelInputBytes: Uint8Array;
    indexResponseBytes: Uint8Array;
  };

export type ResolvedDistantConnectionLunaIndexResponseV001 = {
  indexedModelInput: DistantConnectionLunaIndexedModelInputV001;
  indexResponse: DistantConnectionLunaIndexResponseV001;
  indexResponseBytes: Buffer;
  response: DistantConnectionLunaResponseV002;
  responseBytes: Buffer;
};

type RecordValue = Record<string, unknown>;

const SHA256 = /^[0-9a-f]{64}$/u;
const WORKSPACE_RELATIVE_PATH =
  /^(?!\/)(?!\.\/)(?!.*(?:^|\/)\.\.(?:\/|$))(?!.*\\)(?!.*\/\/)[^\0]+$/u;
const INDEX_CANDIDATE_KEYS = [
  'anchorIndex',
  'firstPartUtteranceIndexes',
  'secondPartUtteranceIndexes',
  'addedUnderstanding',
  'direction'
] as const;

function fail(
  code: DistantConnectionLunaIndexReferenceErrorCodeV001,
  message: string,
  cause?: unknown
): never {
  throw new DistantConnectionLunaIndexReferenceErrorV001(
    code,
    message,
    cause === undefined ? undefined : {cause}
  );
}

function isRecord(value: unknown): value is RecordValue {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function hasExactKeys(value: RecordValue, keys: readonly string[]): boolean {
  const actual = Object.keys(value);
  return actual.length === keys.length && keys.every((key) => Object.hasOwn(value, key));
}

function sha256(bytes: Uint8Array): string {
  return createHash('sha256').update(bytes).digest('hex');
}

function assertPositiveCount(value: unknown, label: string): asserts value is number {
  if (!Number.isSafeInteger(value) || (value as number) < 1) {
    fail('INDEXED_MODEL_INPUT_INVALID', `${label}が正の安全な整数ではありません`);
  }
}

function assertSourcePackageBinding(
  value: unknown
): asserts value is DistantConnectionLunaFormalFileBindingV002 {
  if (!isRecord(value)
    || !hasExactKeys(value, ['path', 'schemaVersion', 'fileSha256'])
    || typeof value.path !== 'string'
    || !WORKSPACE_RELATIVE_PATH.test(value.path)
    || value.schemaVersion !== DISTANT_CONNECTION_LUNA_SOURCE_PACKAGE_SCHEMA_V002
    || typeof value.fileSha256 !== 'string'
    || !SHA256.test(value.fileSha256)) {
    fail('INDEXED_MODEL_INPUT_INVALID', 'index参照入力のsource package bindingが不正です');
  }
}

function assertIndex(
  value: unknown,
  maximum: number,
  label: string
): asserts value is number {
  if (!Number.isSafeInteger(value)) {
    fail('INDEX_NOT_INTEGER', `${label}が安全な整数ではありません`);
  }
  if ((value as number) < 0 || (value as number) > maximum) {
    fail('INDEX_OUT_OF_RANGE', `${label}が0-based参照範囲外です`);
  }
}

function assertOrderedIndexes(
  value: unknown,
  maximum: number,
  label: string
): asserts value is number[] {
  if (!Array.isArray(value) || value.length === 0) {
    fail('INDEX_RESPONSE_INVALID', `${label}が空でない配列ではありません`);
  }
  const seen = new Set<number>();
  let previous = -1;
  for (const [position, index] of value.entries()) {
    assertIndex(index, maximum, `${label}${position + 1}件目`);
    if (seen.has(index)) {
      fail('INDEX_DUPLICATE', `${label}に同じ0-based発話indexがあります`);
    }
    if (index <= previous) {
      fail('INDEX_ORDER_REVERSED', `${label}が0-based発話indexの昇順ではありません`);
    }
    seen.add(index);
    previous = index;
  }
}

function assertIndexCandidate(
  value: unknown,
  utteranceCount: number,
  anchors: DistantConnectionLunaIndexedModelInputV001['anchors'],
  label: string
): asserts value is DistantConnectionLunaIndexCandidateV001 {
  if (!isRecord(value)
    || !hasExactKeys(value, INDEX_CANDIDATE_KEYS)
    || typeof value.addedUnderstanding !== 'string'
    || value.addedUnderstanding.length === 0
    || (value.direction !== 'past' && value.direction !== 'future')) {
    fail('INDEX_RESPONSE_INVALID', `${label}の構造または値が不正です`);
  }
  assertIndex(value.anchorIndex, anchors.length - 1, `${label}のanchorIndex`);
  assertOrderedIndexes(
    value.firstPartUtteranceIndexes,
    utteranceCount - 1,
    `${label}の前半発話index`
  );
  assertOrderedIndexes(
    value.secondPartUtteranceIndexes,
    utteranceCount - 1,
    `${label}の後半発話index`
  );
  const firstIndexes = value.firstPartUtteranceIndexes;
  const secondIndexes = value.secondPartUtteranceIndexes;
  const firstSet = new Set(firstIndexes);
  if (secondIndexes.some((index) => firstSet.has(index))) {
    fail('INDEX_DUPLICATE', `${label}の前半と後半が同じ発話indexを参照しています`);
  }
  if (firstIndexes[firstIndexes.length - 1]! >= secondIndexes[0]!) {
    fail('INDEX_ORDER_REVERSED', `${label}の前半と後半が時系列順ではありません`);
  }
  const anchorUtteranceIndex = anchors[value.anchorIndex]!.utteranceIndex;
  const expectedPart = value.direction === 'past' ? secondIndexes : firstIndexes;
  if (!expectedPart.includes(anchorUtteranceIndex)) {
    fail('ANCHOR_DIRECTION_MISMATCH', `${label}のdirectionとanchor所属側が一致しません`);
  }
}

function projectExplorationTask(
  sourcePackage: DistantConnectionLunaSourcePackageV002
): DistantConnectionLunaIndexedModelInputV001['explorationTask'] {
  const returnInstruction = sourcePackage.explorationTask.returnInstruction
    .replaceAll('正式意味発話ID群', '0-based発話index群');
  const boundaryMeaning = sourcePackage.explorationTask.boundaryMeaning
    .replaceAll('正式意味発話ID', '0-based発話index');
  if (returnInstruction.includes('正式意味発話ID')
    || boundaryMeaning.includes('正式意味発話ID')) {
    fail('SOURCE_PACKAGE_INVALID', '探索指示を0-based index参照へ決定的に投影できません');
  }
  return {
    objective: sourcePackage.explorationTask.objective,
    anchorInstruction: sourcePackage.explorationTask.anchorInstruction,
    returnInstruction,
    boundaryMeaning
  };
}

function decodeBoundSourcePackage(
  input: BuildDistantConnectionLunaIndexedModelInputV001
): DistantConnectionLunaSourcePackageV002 {
  if (typeof input.sourcePackagePath !== 'string'
    || !WORKSPACE_RELATIVE_PATH.test(input.sourcePackagePath)) {
    fail('SOURCE_PACKAGE_PATH_MISMATCH', 'source package pathがworkspace相対pathではありません');
  }
  let sourcePackage: DistantConnectionLunaSourcePackageV002;
  try {
    sourcePackage = decodeDistantConnectionLunaSourcePackageV002(input.sourcePackageBytes);
  } catch (error) {
    fail('SOURCE_PACKAGE_INVALID', 'source packageが正式v002契約に適合しません', error);
  }
  if (sourcePackage.responseContract.sourcePackagePath !== input.sourcePackagePath) {
    fail('SOURCE_PACKAGE_PATH_MISMATCH', 'source packageの正式pathと指定pathが一致しません');
  }
  return sourcePackage;
}

export function buildDistantConnectionLunaIndexResponseJsonSchemaV001(
  utteranceCount: number,
  anchorCount: number
): Record<string, unknown> {
  assertPositiveCount(utteranceCount, '正式意味発話件数');
  assertPositiveCount(anchorCount, 'アンカー件数');
  const utteranceIndex = {type: 'integer', minimum: 0, maximum: utteranceCount - 1};
  return {
    type: 'object',
    additionalProperties: false,
    required: ['schemaVersion', 'candidates'],
    properties: {
      schemaVersion: {
        type: 'string',
        const: DISTANT_CONNECTION_LUNA_INDEX_RESPONSE_SCHEMA_V001
      },
      candidates: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: false,
          required: [...INDEX_CANDIDATE_KEYS],
          properties: {
            anchorIndex: {type: 'integer', minimum: 0, maximum: anchorCount - 1},
            firstPartUtteranceIndexes: {
              type: 'array',
              minItems: 1,
              items: {...utteranceIndex}
            },
            secondPartUtteranceIndexes: {
              type: 'array',
              minItems: 1,
              items: {...utteranceIndex}
            },
            addedUnderstanding: {type: 'string', minLength: 1},
            direction: {type: 'string', enum: ['past', 'future']}
          }
        }
      }
    }
  };
}

export function buildDistantConnectionLunaIndexedModelInputV001(
  input: BuildDistantConnectionLunaIndexedModelInputV001
): DistantConnectionLunaIndexedModelInputV001 {
  const sourcePackage = decodeBoundSourcePackage(input);
  const utteranceIndexById = new Map(
    sourcePackage.utterances.map((utterance, index) => [utterance.utteranceId, index])
  );
  const anchorIndexById = new Map(
    sourcePackage.anchors.map((anchor, index) => [anchor.anchorId, index])
  );
  const rejected = sourcePackage.learningContext.rejectedCandidate;
  const rejectedAnchorIndex = anchorIndexById.get(rejected.anchorId);
  const rejectedFirstIndexes = rejected.firstPartSemanticUtteranceIds.map(
    (utteranceId) => utteranceIndexById.get(utteranceId)
  );
  const rejectedSecondIndexes = rejected.secondPartSemanticUtteranceIds.map(
    (utteranceId) => utteranceIndexById.get(utteranceId)
  );
  if (rejectedAnchorIndex === undefined
    || rejectedFirstIndexes.some((index) => index === undefined)
    || rejectedSecondIndexes.some((index) => index === undefined)) {
    fail('SOURCE_PACKAGE_INVALID', '不採用候補を0-based index参照へ投影できません');
  }
  const value: DistantConnectionLunaIndexedModelInputV001 = {
    schemaVersion: DISTANT_CONNECTION_LUNA_INDEXED_MODEL_INPUT_SCHEMA_V001,
    sourcePackageBinding: {
      path: input.sourcePackagePath,
      schemaVersion: DISTANT_CONNECTION_LUNA_SOURCE_PACKAGE_SCHEMA_V002,
      fileSha256: sha256(input.sourcePackageBytes)
    },
    indexBase: 0,
    explorationTask: projectExplorationTask(sourcePackage),
    learningContext: {
      humanVerdict: sourcePackage.learningContext.humanVerdict,
      rejectionPrimaryCause: sourcePackage.learningContext.rejectionPrimaryCause,
      rejectionReason: sourcePackage.learningContext.rejectionReason,
      selectionStatus: sourcePackage.learningContext.selectionStatus,
      rejectedCandidate: {
        anchorIndex: rejectedAnchorIndex,
        firstPartUtteranceIndexes: rejectedFirstIndexes as number[],
        secondPartUtteranceIndexes: rejectedSecondIndexes as number[],
        addedUnderstanding: rejected.addedUnderstanding,
        direction: rejected.direction
      },
      priorUseCount: sourcePackage.learningContext.priorUseCount
    },
    utteranceCount: sourcePackage.utteranceCount,
    anchorCount: sourcePackage.anchorCount,
    utterances: sourcePackage.utterances.map((utterance, utteranceIndex) => ({
      utteranceIndex,
      text: utterance.text,
      sourceStartMs: utterance.sourceStartMs,
      sourceEndMs: utterance.sourceEndMs,
      sourceSegmentIds: [...utterance.sourceSegmentIds]
    })),
    anchors: sourcePackage.anchors.map((anchor, anchorIndex) => {
      const utteranceIndex = utteranceIndexById.get(anchor.semanticUtteranceId);
      if (utteranceIndex === undefined) {
        fail('SOURCE_PACKAGE_INVALID', 'アンカーを0-based発話indexへ投影できません');
      }
      return {anchorIndex, utteranceIndex};
    }),
    responseContract: {
      schemaVersion: DISTANT_CONNECTION_LUNA_INDEX_RESPONSE_SCHEMA_V001,
      jsonSchema: buildDistantConnectionLunaIndexResponseJsonSchemaV001(
        sourcePackage.utteranceCount,
        sourcePackage.anchorCount
      )
    }
  };
  assertDistantConnectionLunaIndexedModelInputV001(value);
  return value;
}

export function assertDistantConnectionLunaIndexedModelInputV001(
  value: unknown
): asserts value is DistantConnectionLunaIndexedModelInputV001 {
  if (!isRecord(value)
    || !hasExactKeys(value, [
      'schemaVersion',
      'sourcePackageBinding',
      'indexBase',
      'explorationTask',
      'learningContext',
      'utteranceCount',
      'anchorCount',
      'utterances',
      'anchors',
      'responseContract'
    ])
    || value.schemaVersion !== DISTANT_CONNECTION_LUNA_INDEXED_MODEL_INPUT_SCHEMA_V001
    || value.indexBase !== 0) {
    fail('INDEXED_MODEL_INPUT_INVALID', 'index参照入力のroot構造または版が不正です');
  }
  assertSourcePackageBinding(value.sourcePackageBinding);
  assertPositiveCount(value.utteranceCount, 'index参照入力の正式意味発話件数');
  assertPositiveCount(value.anchorCount, 'index参照入力のアンカー件数');
  if (!Array.isArray(value.utterances)
    || value.utterances.length !== value.utteranceCount
    || !Array.isArray(value.anchors)
    || value.anchors.length !== value.anchorCount) {
    fail('INDEXED_MODEL_INPUT_INVALID', 'index参照入力の配列と件数が一致しません');
  }
  for (const [index, utterance] of value.utterances.entries()) {
    if (!isRecord(utterance)
      || !hasExactKeys(utterance, [
        'utteranceIndex', 'text', 'sourceStartMs', 'sourceEndMs', 'sourceSegmentIds'
      ])
      || utterance.utteranceIndex !== index
      || typeof utterance.text !== 'string'
      || utterance.text.length === 0
      || !Number.isSafeInteger(utterance.sourceStartMs)
      || (utterance.sourceStartMs as number) < 0
      || !Number.isSafeInteger(utterance.sourceEndMs)
      || (utterance.sourceEndMs as number) < (utterance.sourceStartMs as number)
      || !Array.isArray(utterance.sourceSegmentIds)
      || utterance.sourceSegmentIds.length === 0
      || utterance.sourceSegmentIds.some(
        (segmentId) => !Number.isSafeInteger(segmentId) || (segmentId as number) <= 0
      )) {
      fail('INDEXED_MODEL_INPUT_INVALID', `index参照入力の発話${index + 1}件目が不正です`);
    }
  }
  const anchorUtteranceIndexes = new Set<number>();
  for (const [index, anchor] of value.anchors.entries()) {
    if (!isRecord(anchor)
      || !hasExactKeys(anchor, ['anchorIndex', 'utteranceIndex'])
      || anchor.anchorIndex !== index) {
      fail('INDEXED_MODEL_INPUT_INVALID', `index参照入力のアンカー${index + 1}件目が不正です`);
    }
    assertIndex(anchor.utteranceIndex, value.utteranceCount - 1, `アンカー${index + 1}件目の発話index`);
    if (anchorUtteranceIndexes.has(anchor.utteranceIndex)) {
      fail('INDEXED_MODEL_INPUT_INVALID', '複数アンカーが同じ発話indexを参照しています');
    }
    anchorUtteranceIndexes.add(anchor.utteranceIndex);
  }
  if (!isRecord(value.explorationTask)
    || !hasExactKeys(value.explorationTask, [
      'objective', 'anchorInstruction', 'returnInstruction', 'boundaryMeaning'
    ])
    || Object.values(value.explorationTask).some(
      (instruction) => typeof instruction !== 'string' || instruction.length === 0
    )
    || (value.explorationTask.returnInstruction as string).includes('正式意味発話ID')
    || (value.explorationTask.boundaryMeaning as string).includes('正式意味発話ID')) {
    fail('INDEXED_MODEL_INPUT_INVALID', 'index参照入力の探索指示が不正です');
  }
  if (!isRecord(value.learningContext)
    || !hasExactKeys(value.learningContext, [
      'humanVerdict',
      'rejectionPrimaryCause',
      'rejectionReason',
      'selectionStatus',
      'rejectedCandidate',
      'priorUseCount'
    ])
    || value.learningContext.humanVerdict !== 'rejected'
    || value.learningContext.rejectionPrimaryCause !== 'candidate-selection'
    || typeof value.learningContext.rejectionReason !== 'string'
    || value.learningContext.rejectionReason.length === 0
    || value.learningContext.selectionStatus !== 'not-selected'
    || !Number.isSafeInteger(value.learningContext.priorUseCount)
    || (value.learningContext.priorUseCount as number) < 0) {
    fail('INDEXED_MODEL_INPUT_INVALID', 'index参照入力の学習文脈が不正です');
  }
  assertIndexCandidate(
    value.learningContext.rejectedCandidate,
    value.utteranceCount,
    value.anchors as DistantConnectionLunaIndexedModelInputV001['anchors'],
    'index参照入力の不採用候補'
  );
  if (!isRecord(value.responseContract)
    || !hasExactKeys(value.responseContract, ['schemaVersion', 'jsonSchema'])
    || value.responseContract.schemaVersion !== DISTANT_CONNECTION_LUNA_INDEX_RESPONSE_SCHEMA_V001
    || !isRecord(value.responseContract.jsonSchema)
    || JSON.stringify(value.responseContract.jsonSchema) !== JSON.stringify(
      buildDistantConnectionLunaIndexResponseJsonSchemaV001(
        value.utteranceCount,
        value.anchorCount
      )
    )) {
    fail('INDEXED_MODEL_INPUT_INVALID', 'index参照入力の返答契約が件数境界と一致しません');
  }
}

export function serializeDistantConnectionLunaIndexedModelInputV001(
  value: DistantConnectionLunaIndexedModelInputV001
): Buffer {
  assertDistantConnectionLunaIndexedModelInputV001(value);
  return Buffer.from(`${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

export function decodeDistantConnectionLunaIndexedModelInputV001(
  bytes: Uint8Array
): DistantConnectionLunaIndexedModelInputV001 {
  let value: unknown;
  try {
    value = JSON.parse(Buffer.from(bytes).toString('utf8'));
  } catch (error) {
    fail('INDEXED_MODEL_INPUT_INVALID', 'index参照入力がJSONとして読めません', error);
  }
  assertDistantConnectionLunaIndexedModelInputV001(value);
  return value;
}

export function validateDistantConnectionLunaIndexedModelInputAgainstSourceV001(
  value: DistantConnectionLunaIndexedModelInputV001,
  input: BuildDistantConnectionLunaIndexedModelInputV001
): void {
  assertDistantConnectionLunaIndexedModelInputV001(value);
  const rebuilt = buildDistantConnectionLunaIndexedModelInputV001(input);
  if (!serializeDistantConnectionLunaIndexedModelInputV001(value).equals(
    serializeDistantConnectionLunaIndexedModelInputV001(rebuilt)
  )) {
    fail(
      'INDEXED_MODEL_INPUT_SOURCE_MISMATCH',
      'index参照入力が指定source packageからの決定的再構築結果と一致しません'
    );
  }
}

export function assertDistantConnectionLunaIndexResponseV001(
  value: unknown,
  indexedModelInput: DistantConnectionLunaIndexedModelInputV001
): asserts value is DistantConnectionLunaIndexResponseV001 {
  assertDistantConnectionLunaIndexedModelInputV001(indexedModelInput);
  if (!isRecord(value)
    || !hasExactKeys(value, ['schemaVersion', 'candidates'])
    || value.schemaVersion !== DISTANT_CONNECTION_LUNA_INDEX_RESPONSE_SCHEMA_V001
    || !Array.isArray(value.candidates)) {
    fail('INDEX_RESPONSE_INVALID', 'index返答のroot構造または版が不正です');
  }
  for (const [index, candidate] of value.candidates.entries()) {
    assertIndexCandidate(
      candidate,
      indexedModelInput.utteranceCount,
      indexedModelInput.anchors,
      `index返答の候補${index + 1}件目`
    );
  }
}

export function serializeDistantConnectionLunaIndexResponseV001(
  value: DistantConnectionLunaIndexResponseV001,
  indexedModelInput: DistantConnectionLunaIndexedModelInputV001
): Buffer {
  assertDistantConnectionLunaIndexResponseV001(value, indexedModelInput);
  return Buffer.from(`${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

export function decodeDistantConnectionLunaIndexResponseV001(
  bytes: Uint8Array,
  indexedModelInput: DistantConnectionLunaIndexedModelInputV001
): DistantConnectionLunaIndexResponseV001 {
  let value: unknown;
  try {
    value = JSON.parse(Buffer.from(bytes).toString('utf8'));
  } catch (error) {
    fail('INDEX_RESPONSE_INVALID', 'index返答がJSONとして読めません', error);
  }
  assertDistantConnectionLunaIndexResponseV001(value, indexedModelInput);
  return value;
}

export function deriveDistantConnectionCandidateIdFromIndexReferenceV001(
  candidate: DistantConnectionLunaIndexCandidateV001
): string {
  const canonicalReference = {
    anchorIndex: candidate.anchorIndex,
    firstPartUtteranceIndexes: [...candidate.firstPartUtteranceIndexes],
    secondPartUtteranceIndexes: [...candidate.secondPartUtteranceIndexes],
    direction: candidate.direction
  };
  return `candidate-${sha256(Buffer.from(JSON.stringify(canonicalReference), 'utf8'))}`;
}

export function resolveDistantConnectionLunaIndexResponseV001(
  indexResponse: DistantConnectionLunaIndexResponseV001,
  indexedModelInput: DistantConnectionLunaIndexedModelInputV001,
  input: BuildDistantConnectionLunaIndexedModelInputV001
): DistantConnectionLunaResponseV002 {
  validateDistantConnectionLunaIndexedModelInputAgainstSourceV001(indexedModelInput, input);
  assertDistantConnectionLunaIndexResponseV001(indexResponse, indexedModelInput);
  const sourcePackage = decodeBoundSourcePackage(input);
  const seenCandidateIds = new Set<string>();
  const candidates = indexResponse.candidates.map((candidate) => {
    const candidateId = deriveDistantConnectionCandidateIdFromIndexReferenceV001(candidate);
    if (seenCandidateIds.has(candidateId)) {
      fail('CANDIDATE_REFERENCE_DUPLICATE', '同一内容のindex候補参照が重複しています');
    }
    seenCandidateIds.add(candidateId);
    return {
      candidateId,
      anchorId: sourcePackage.anchors[candidate.anchorIndex]!.anchorId,
      firstPartSemanticUtteranceIds: candidate.firstPartUtteranceIndexes.map(
        (index) => sourcePackage.utterances[index]!.utteranceId
      ),
      secondPartSemanticUtteranceIds: candidate.secondPartUtteranceIndexes.map(
        (index) => sourcePackage.utterances[index]!.utteranceId
      ),
      addedUnderstanding: candidate.addedUnderstanding,
      direction: candidate.direction
    };
  });
  const response: DistantConnectionLunaResponseV002 = {
    schemaVersion: DISTANT_CONNECTION_LUNA_RESPONSE_SCHEMA_V001,
    sourceVideoId: sourcePackage.sourceVideoId,
    sourcePackageBinding: {
      path: input.sourcePackagePath,
      schemaVersion: DISTANT_CONNECTION_LUNA_SOURCE_PACKAGE_SCHEMA_V002,
      fileSha256: sha256(input.sourcePackageBytes)
    },
    candidates
  };
  try {
    validateDistantConnectionLunaResponseV002(response, input);
  } catch (error) {
    fail('FORMAL_RESPONSE_INVALID', 'index参照から作った正式候補が既存v002検査を通りません', error);
  }
  return response;
}

export function resolveDistantConnectionLunaIndexResponseFromBytesV001(
  input: ResolveDistantConnectionLunaIndexResponseFromBytesInputV001
): ResolvedDistantConnectionLunaIndexResponseV001 {
  const indexedModelInput = decodeDistantConnectionLunaIndexedModelInputV001(
    input.indexedModelInputBytes
  );
  validateDistantConnectionLunaIndexedModelInputAgainstSourceV001(indexedModelInput, input);
  const indexResponse = decodeDistantConnectionLunaIndexResponseV001(
    input.indexResponseBytes,
    indexedModelInput
  );
  const response = resolveDistantConnectionLunaIndexResponseV001(
    indexResponse,
    indexedModelInput,
    input
  );
  return {
    indexedModelInput,
    indexResponse,
    indexResponseBytes: serializeDistantConnectionLunaIndexResponseV001(
      indexResponse,
      indexedModelInput
    ),
    response,
    responseBytes: Buffer.from(`${JSON.stringify(response, null, 2)}\n`, 'utf8')
  };
}
