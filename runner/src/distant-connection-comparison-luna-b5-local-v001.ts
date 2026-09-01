import {createHash} from 'node:crypto';

import {
  DISTANT_CONNECTION_COMPARISON_INDEX_RESPONSE_SCHEMA_V001,
  DISTANT_CONNECTION_COMPARISON_SOURCE_PACKAGE_SCHEMA_V001,
  decodeDistantConnectionComparisonSourcePackageV001,
  serializeDistantConnectionComparisonSourcePackageV001,
  type DistantConnectionComparisonSourcePackageV001
} from './distant-connection-comparison-source-package-v001.js';

export const DISTANT_CONNECTION_COMPARISON_INDEXED_MODEL_INPUT_SCHEMA_V001 =
  'distant-connection-comparison-indexed-model-input-v001';
export const DISTANT_CONNECTION_COMPARISON_EXACT_REQUEST_SCHEMA_V001 =
  'openai-responses-distant-connection-comparison-request-v001';
export const DISTANT_CONNECTION_COMPARISON_B5_LOCAL_MANIFEST_SCHEMA_V001 =
  'distant-connection-comparison-luna-b5-local-manifest-v001';

export const DISTANT_CONNECTION_COMPARISON_REQUEST_SETTINGS_V001 = Object.freeze({
  providerId: 'openai-api',
  modelId: 'gpt-5.6-luna',
  operationId: 'responses',
  reasoningEffort: 'medium',
  responseFormatName: 'distant_connection_comparison_index_response_v001',
  store: false
} as const);

export const DISTANT_CONNECTION_COMPARISON_LUNA_B5_ERROR_CODES_V001 = Object.freeze([
  'SOURCE_PACKAGE_INVALID',
  'SOURCE_PACKAGE_PATH_MISMATCH',
  'SOURCE_PACKAGE_SHA_MISMATCH',
  'INDEXED_MODEL_INPUT_INVALID',
  'INDEXED_MODEL_INPUT_SHA_MISMATCH',
  'INDEXED_MODEL_INPUT_BINDING_MISMATCH',
  'REQUEST_SETTINGS_MISMATCH',
  'REQUEST_INVALID',
  'RESPONSE_SCHEMA_BINDING_MISMATCH',
  'MANIFEST_INVALID',
  'B6_REQUEST_BINDING_MISMATCH',
  'INDEX_RESPONSE_INVALID',
  'INDEX_NOT_INTEGER',
  'INDEX_OUT_OF_RANGE',
  'INDEX_DUPLICATE',
  'INDEX_ORDER_REVERSED',
  'ANCHOR_DIRECTION_MISMATCH',
  'CANDIDATE_REFERENCE_DUPLICATE'
] as const);

export type DistantConnectionComparisonLunaB5ErrorCodeV001 =
  typeof DISTANT_CONNECTION_COMPARISON_LUNA_B5_ERROR_CODES_V001[number];

export class DistantConnectionComparisonLunaB5ErrorV001 extends Error {
  readonly code: DistantConnectionComparisonLunaB5ErrorCodeV001;

  constructor(
    code: DistantConnectionComparisonLunaB5ErrorCodeV001,
    message: string,
    options?: ErrorOptions
  ) {
    super(message, options);
    this.name = 'DistantConnectionComparisonLunaB5ErrorV001';
    this.code = code;
  }
}

export type DistantConnectionComparisonFormalBindingV001 = {
  path: string;
  schemaVersion: string;
  fileSha256: string;
};

export type DistantConnectionComparisonRequestSettingsV001 =
  typeof DISTANT_CONNECTION_COMPARISON_REQUEST_SETTINGS_V001;

export type DistantConnectionComparisonIndexCandidateV001 = {
  anchorIndex: number;
  firstPartUtteranceIndexes: number[];
  secondPartUtteranceIndexes: number[];
  addedUnderstanding: string;
  direction: 'past' | 'future';
};

export type DistantConnectionComparisonIndexResponseV001 = {
  schemaVersion: typeof DISTANT_CONNECTION_COMPARISON_INDEX_RESPONSE_SCHEMA_V001;
  candidates: DistantConnectionComparisonIndexCandidateV001[];
};

export type DistantConnectionComparisonIndexedModelInputV001 = {
  schemaVersion: typeof DISTANT_CONNECTION_COMPARISON_INDEXED_MODEL_INPUT_SCHEMA_V001;
  sourcePackageBinding: DistantConnectionComparisonFormalBindingV001;
  indexBase: 0;
  explorationTask: {
    objective: string;
    anchorInstruction: string;
    returnInstruction: string;
    boundaryMeaning: string;
  };
  utteranceCount: number;
  anchorCount: number;
  utterances: Array<{
    utteranceIndex: number;
    text: string;
    sourceStartMs: number;
    sourceEndMs: number;
  }>;
  anchors: Array<{
    anchorIndex: number;
    utteranceIndex: number;
  }>;
  responseContract: {
    schemaVersion: typeof DISTANT_CONNECTION_COMPARISON_INDEX_RESPONSE_SCHEMA_V001;
    jsonSchema: Record<string, unknown>;
  };
};

export type DistantConnectionComparisonModelVisiblePayloadV001 = {
  indexBase: 0;
  explorationTask: DistantConnectionComparisonIndexedModelInputV001['explorationTask'];
  utterances: DistantConnectionComparisonIndexedModelInputV001['utterances'];
  anchors: DistantConnectionComparisonIndexedModelInputV001['anchors'];
  responseContract: DistantConnectionComparisonIndexedModelInputV001['responseContract'];
};

export type DistantConnectionComparisonExactRequestV001 = {
  model: 'gpt-5.6-luna';
  instructions: string;
  input: string;
  reasoning: {effort: 'medium'};
  text: {
    format: {
      type: 'json_schema';
      name: 'distant_connection_comparison_index_response_v001';
      strict: true;
      schema: Record<string, unknown>;
    };
  };
  store: false;
};

export type DistantConnectionComparisonB5LocalManifestV001 = {
  schemaVersion: typeof DISTANT_CONNECTION_COMPARISON_B5_LOCAL_MANIFEST_SCHEMA_V001;
  sourcePackageBinding: DistantConnectionComparisonFormalBindingV001;
  indexedModelInputBinding: DistantConnectionComparisonFormalBindingV001;
  requestBinding: DistantConnectionComparisonFormalBindingV001;
  requestSettings: DistantConnectionComparisonRequestSettingsV001;
  b6ContinuationContract: {
    requiredRequestBinding: DistantConnectionComparisonFormalBindingV001;
  };
};

export type BuildDistantConnectionComparisonIndexedModelInputV001 = {
  sourcePackagePath: string;
  sourcePackageBytes: Uint8Array;
};

export type BuildDistantConnectionComparisonB5LocalArtifactsV001 = {
  sourcePackageBinding: DistantConnectionComparisonFormalBindingV001;
  sourcePackageBytes: Uint8Array;
  indexedModelInputBinding: DistantConnectionComparisonFormalBindingV001;
  indexedModelInputBytes: Uint8Array;
  requestPath: string;
  requestSettings: DistantConnectionComparisonRequestSettingsV001;
};

export type DistantConnectionComparisonResolvedCandidateV001 = {
  candidateId: string;
  sourceVideoId: string;
  anchorId: string;
  firstPartUtteranceIds: string[];
  secondPartUtteranceIds: string[];
  addedUnderstanding: string;
  direction: 'past' | 'future';
};

type RecordValue = Record<string, unknown>;

const SHA256 = /^[0-9a-f]{64}$/u;
const FORMAL_ID = /^[A-Za-z0-9][A-Za-z0-9._-]*$/u;
const WORKSPACE_RELATIVE_PATH =
  /^(?!\/)(?!\.\/)(?!.*(?:^|\/)\.\.(?:\/|$))(?!.*\\)(?!.*\/\/)[^\0]+$/u;
const INDEX_CANDIDATE_KEYS = [
  'anchorIndex',
  'firstPartUtteranceIndexes',
  'secondPartUtteranceIndexes',
  'addedUnderstanding',
  'direction'
] as const;
const REQUEST_INSTRUCTIONS_PREFIX =
  'indexed model inputのexplorationTaskに従って遠方接続候補を探索し、responseContract.jsonSchemaに適合するJSONだけを返してください。anchorIndexはanchors配列の位置、utteranceIndexはutterances配列の位置で、いずれも0始まりです。anchorと発話はこのindexだけで参照してください。範囲外indexを補完、推測、類似照合しないでください。返答indexから入力要素への対応付けと候補識別子の生成はローカルの決定論的処理だけが行います。';
const MODEL_BOUNDARY_MEANING =
  '返答では各候補にanchorIndex、firstPartUtteranceIndexes、secondPartUtteranceIndexesを必ず含め、入力配列の0-based範囲内の整数だけで参照してください。これらのindexは意味探索の根拠であり、完成動画の最終切り出し位置ではありません。範囲外の値を補完、推測、類似照合せず、参照解決は後続の決定論的ローカル処理へ任せてください。導入文脈や自然な終端は後続の区間化が決めます。';

function fail(
  code: DistantConnectionComparisonLunaB5ErrorCodeV001,
  message: string,
  cause?: unknown
): never {
  throw new DistantConnectionComparisonLunaB5ErrorV001(
    code,
    message,
    cause === undefined ? undefined : {cause}
  );
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

function assertWorkspaceRelativePath(
  value: unknown,
  label: string,
  code: DistantConnectionComparisonLunaB5ErrorCodeV001 = 'REQUEST_INVALID'
): asserts value is string {
  if (typeof value !== 'string' || !WORKSPACE_RELATIVE_PATH.test(value)) {
    fail(code, `${label}はworkspace相対pathである必要があります`);
  }
}

function assertFormalBinding(
  value: unknown,
  label: string,
  code: DistantConnectionComparisonLunaB5ErrorCodeV001
): asserts value is DistantConnectionComparisonFormalBindingV001 {
  if (!isRecord(value)
    || !hasExactKeys(value, ['path', 'schemaVersion', 'fileSha256'])
    || typeof value.path !== 'string'
    || !WORKSPACE_RELATIVE_PATH.test(value.path)
    || typeof value.schemaVersion !== 'string'
    || !FORMAL_ID.test(value.schemaVersion)
    || typeof value.fileSha256 !== 'string'
    || !SHA256.test(value.fileSha256)) {
    fail(code, `${label}が不正です`);
  }
}

function assertPositiveCount(value: unknown, label: string): asserts value is number {
  if (!Number.isSafeInteger(value) || (value as number) < 1) {
    fail('INDEXED_MODEL_INPUT_INVALID', `${label}が正の安全な整数ではありません`);
  }
}

function assertRequestSettings(
  value: unknown
): asserts value is DistantConnectionComparisonRequestSettingsV001 {
  if (!isRecord(value)
    || !hasExactKeys(value, [
      'providerId',
      'modelId',
      'operationId',
      'reasoningEffort',
      'responseFormatName',
      'store'
    ])
    || JSON.stringify(value) !== JSON.stringify(
      DISTANT_CONNECTION_COMPARISON_REQUEST_SETTINGS_V001
    )) {
    fail(
      'REQUEST_SETTINGS_MISMATCH',
      'provider/model/operation/reasoning/structured output/store設定が固定値と一致しません'
    );
  }
}

function decodeBoundSourcePackage(
  input: BuildDistantConnectionComparisonIndexedModelInputV001
): DistantConnectionComparisonSourcePackageV001 {
  assertWorkspaceRelativePath(
    input.sourcePackagePath,
    'source package path',
    'SOURCE_PACKAGE_PATH_MISMATCH'
  );
  let sourcePackage: DistantConnectionComparisonSourcePackageV001;
  try {
    sourcePackage = decodeDistantConnectionComparisonSourcePackageV001(
      input.sourcePackageBytes
    );
  } catch (error) {
    fail('SOURCE_PACKAGE_INVALID', '比較用source packageを正式契約として読めません', error);
  }
  if (!serializeDistantConnectionComparisonSourcePackageV001(sourcePackage)
    .equals(Buffer.from(input.sourcePackageBytes))) {
    fail('SOURCE_PACKAGE_INVALID', 'source packageがcanonical formal byteではありません');
  }
  if (sourcePackage.responseContract.sourcePackagePath !== input.sourcePackagePath) {
    fail('SOURCE_PACKAGE_PATH_MISMATCH', 'source packageの正式pathと指定pathが一致しません');
  }
  return sourcePackage;
}

function projectExplorationTask(
  sourcePackage: DistantConnectionComparisonSourcePackageV001
): DistantConnectionComparisonIndexedModelInputV001['explorationTask'] {
  const project = (value: string): string => value
    .replaceAll('正式意味発話ID群', '0-based発話index配列')
    .replaceAll('正式発話ID群', '0-based発話index配列')
    .replaceAll('正式意味発話ID', '0-based発話index')
    .replaceAll('正式発話ID', '0-based発話index')
    .replaceAll('アンカーID', '0-based anchorIndex');
  const projected = {
    objective: project(sourcePackage.explorationTask.objective),
    anchorInstruction: project(sourcePackage.explorationTask.anchorInstruction),
    returnInstruction: project(sourcePackage.explorationTask.returnInstruction),
    boundaryMeaning: MODEL_BOUNDARY_MEANING
  };
  const projectedText = JSON.stringify(projected);
  if (/正式(?:意味)?発話ID|正式anchor ID|正式ID|candidate ID|アンカーID/u.test(
    projectedText
  )) {
    fail('SOURCE_PACKAGE_INVALID', '探索指示を0-based indexだけへ決定的に投影できません');
  }
  for (const utterance of sourcePackage.utterances) {
    if (projectedText.includes(utterance.utteranceId)) {
      fail('SOURCE_PACKAGE_INVALID', '探索指示に素材固有の正式発話IDが含まれています');
    }
  }
  for (const anchor of sourcePackage.anchors) {
    if (projectedText.includes(anchor.anchorId)) {
      fail('SOURCE_PACKAGE_INVALID', '探索指示に素材固有の正式anchor IDが含まれています');
    }
  }
  return projected;
}

export function buildDistantConnectionComparisonIndexResponseJsonSchemaV001(
  utteranceCount: number,
  anchorCount: number
): Record<string, unknown> {
  assertPositiveCount(utteranceCount, '発話件数');
  assertPositiveCount(anchorCount, 'アンカー件数');
  const utteranceIndex = {type: 'integer', minimum: 0, maximum: utteranceCount - 1};
  return {
    type: 'object',
    additionalProperties: false,
    required: ['schemaVersion', 'candidates'],
    properties: {
      schemaVersion: {
        type: 'string',
        const: DISTANT_CONNECTION_COMPARISON_INDEX_RESPONSE_SCHEMA_V001
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

export function buildDistantConnectionComparisonIndexedModelInputV001(
  input: BuildDistantConnectionComparisonIndexedModelInputV001
): DistantConnectionComparisonIndexedModelInputV001 {
  const sourcePackage = decodeBoundSourcePackage(input);
  const utteranceIndexById = new Map(
    sourcePackage.utterances.map((utterance, index) => [utterance.utteranceId, index])
  );
  const modelInput: DistantConnectionComparisonIndexedModelInputV001 = {
    schemaVersion: DISTANT_CONNECTION_COMPARISON_INDEXED_MODEL_INPUT_SCHEMA_V001,
    sourcePackageBinding: {
      path: input.sourcePackagePath,
      schemaVersion: DISTANT_CONNECTION_COMPARISON_SOURCE_PACKAGE_SCHEMA_V001,
      fileSha256: sha256(input.sourcePackageBytes)
    },
    indexBase: 0,
    explorationTask: projectExplorationTask(sourcePackage),
    utteranceCount: sourcePackage.utteranceCount,
    anchorCount: sourcePackage.anchorCount,
    utterances: sourcePackage.utterances.map((utterance, utteranceIndex) => ({
      utteranceIndex,
      text: utterance.text,
      sourceStartMs: utterance.sourceStartMs,
      sourceEndMs: utterance.sourceEndMs
    })),
    anchors: sourcePackage.anchors.map((anchor, anchorIndex) => {
      const utteranceIndex = utteranceIndexById.get(anchor.utteranceId);
      if (utteranceIndex === undefined) {
        fail('SOURCE_PACKAGE_INVALID', 'anchorを0-based発話indexへ投影できません');
      }
      return {anchorIndex, utteranceIndex};
    }),
    responseContract: {
      schemaVersion: DISTANT_CONNECTION_COMPARISON_INDEX_RESPONSE_SCHEMA_V001,
      jsonSchema: buildDistantConnectionComparisonIndexResponseJsonSchemaV001(
        sourcePackage.utteranceCount,
        sourcePackage.anchorCount
      )
    }
  };
  assertDistantConnectionComparisonIndexedModelInputV001(modelInput);
  return modelInput;
}

function assertIndex(value: unknown, maximum: number, label: string): asserts value is number {
  if (!Number.isSafeInteger(value)) {
    fail('INDEX_NOT_INTEGER', `${label}が安全な整数ではありません`);
  }
  if ((value as number) < 0 || (value as number) > maximum) {
    fail('INDEX_OUT_OF_RANGE', `${label}が0-based参照範囲外です`);
  }
}

export function assertDistantConnectionComparisonIndexedModelInputV001(
  value: unknown
): asserts value is DistantConnectionComparisonIndexedModelInputV001 {
  if (!isRecord(value)
    || !hasExactKeys(value, [
      'schemaVersion',
      'sourcePackageBinding',
      'indexBase',
      'explorationTask',
      'utteranceCount',
      'anchorCount',
      'utterances',
      'anchors',
      'responseContract'
    ])
    || value.schemaVersion !== DISTANT_CONNECTION_COMPARISON_INDEXED_MODEL_INPUT_SCHEMA_V001
    || value.indexBase !== 0) {
    fail('INDEXED_MODEL_INPUT_INVALID', '比較用index入力のroot構造または版が不正です');
  }
  assertFormalBinding(
    value.sourcePackageBinding,
    'source package binding',
    'INDEXED_MODEL_INPUT_INVALID'
  );
  if (value.sourcePackageBinding.schemaVersion
    !== DISTANT_CONNECTION_COMPARISON_SOURCE_PACKAGE_SCHEMA_V001) {
    fail('INDEXED_MODEL_INPUT_INVALID', 'source package bindingの版が不正です');
  }
  assertPositiveCount(value.utteranceCount, '発話件数');
  assertPositiveCount(value.anchorCount, 'アンカー件数');
  if (!Array.isArray(value.utterances)
    || value.utterances.length !== value.utteranceCount
    || !Array.isArray(value.anchors)
    || value.anchors.length !== value.anchorCount) {
    fail('INDEXED_MODEL_INPUT_INVALID', '比較用index入力の配列と件数が一致しません');
  }
  for (const [index, utterance] of value.utterances.entries()) {
    if (!isRecord(utterance)
      || !hasExactKeys(utterance, [
        'utteranceIndex', 'text', 'sourceStartMs', 'sourceEndMs'
      ])
      || utterance.utteranceIndex !== index
      || typeof utterance.text !== 'string'
      || utterance.text.trim().length === 0
      || !Number.isSafeInteger(utterance.sourceStartMs)
      || (utterance.sourceStartMs as number) < 0
      || !Number.isSafeInteger(utterance.sourceEndMs)
      || (utterance.sourceEndMs as number) < (utterance.sourceStartMs as number)) {
      fail('INDEXED_MODEL_INPUT_INVALID', `発話index ${index} の構造または値が不正です`);
    }
  }
  let previousStartMs = -1;
  let previousEndMs = -1;
  for (const utterance of value.utterances) {
    if (utterance.sourceStartMs < previousStartMs
      || (utterance.sourceStartMs === previousStartMs
        && utterance.sourceEndMs < previousEndMs)) {
      fail('INDEXED_MODEL_INPUT_INVALID', '比較用index入力の発話時系列が逆転しています');
    }
    previousStartMs = utterance.sourceStartMs;
    previousEndMs = utterance.sourceEndMs;
  }
  const anchoredUtteranceIndexes = new Set<number>();
  for (const [index, anchor] of value.anchors.entries()) {
    if (!isRecord(anchor)
      || !hasExactKeys(anchor, ['anchorIndex', 'utteranceIndex'])
      || anchor.anchorIndex !== index) {
      fail('INDEXED_MODEL_INPUT_INVALID', `anchorIndex ${index} の構造が不正です`);
    }
    assertIndex(anchor.utteranceIndex, value.utteranceCount - 1, `anchorIndex ${index}`);
    if (anchoredUtteranceIndexes.has(anchor.utteranceIndex)) {
      fail('INDEXED_MODEL_INPUT_INVALID', '複数anchorが同じ発話indexを参照しています');
    }
    anchoredUtteranceIndexes.add(anchor.utteranceIndex);
  }
  if (!isRecord(value.explorationTask)
    || !hasExactKeys(value.explorationTask, [
      'objective', 'anchorInstruction', 'returnInstruction', 'boundaryMeaning'
    ])
    || Object.values(value.explorationTask).some(
      (instruction) => typeof instruction !== 'string' || instruction.length === 0
    )
    || /learningContext|正式(?:意味)?発話ID|正式anchor ID|正式ID|candidate ID|アンカーID/u.test(
      JSON.stringify(value.explorationTask)
    )) {
    fail('INDEXED_MODEL_INPUT_INVALID', '比較用index入力の一般探索指示が不正です');
  }
  if (!isRecord(value.responseContract)
    || !hasExactKeys(value.responseContract, ['schemaVersion', 'jsonSchema'])
    || value.responseContract.schemaVersion
      !== DISTANT_CONNECTION_COMPARISON_INDEX_RESPONSE_SCHEMA_V001
    || JSON.stringify(value.responseContract.jsonSchema) !== JSON.stringify(
      buildDistantConnectionComparisonIndexResponseJsonSchemaV001(
        value.utteranceCount,
        value.anchorCount
      )
    )) {
    fail('INDEXED_MODEL_INPUT_INVALID', '比較用index返答schemaが件数境界と一致しません');
  }
}

export function serializeDistantConnectionComparisonIndexedModelInputV001(
  value: DistantConnectionComparisonIndexedModelInputV001
): Buffer {
  assertDistantConnectionComparisonIndexedModelInputV001(value);
  return Buffer.from(`${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

export function decodeDistantConnectionComparisonIndexedModelInputV001(
  bytes: Uint8Array
): DistantConnectionComparisonIndexedModelInputV001 {
  let value: unknown;
  try {
    value = JSON.parse(Buffer.from(bytes).toString('utf8'));
  } catch (error) {
    fail('INDEXED_MODEL_INPUT_INVALID', '比較用index入力をJSONとして読めません', error);
  }
  assertDistantConnectionComparisonIndexedModelInputV001(value);
  if (!serializeDistantConnectionComparisonIndexedModelInputV001(value)
    .equals(Buffer.from(bytes))) {
    fail('INDEXED_MODEL_INPUT_INVALID', '比較用index入力がcanonical formal byteではありません');
  }
  return value;
}

export function validateDistantConnectionComparisonIndexedModelInputAgainstSourceV001(
  value: DistantConnectionComparisonIndexedModelInputV001,
  input: BuildDistantConnectionComparisonIndexedModelInputV001
): void {
  assertDistantConnectionComparisonIndexedModelInputV001(value);
  const rebuilt = buildDistantConnectionComparisonIndexedModelInputV001(input);
  if (!serializeDistantConnectionComparisonIndexedModelInputV001(value)
    .equals(serializeDistantConnectionComparisonIndexedModelInputV001(rebuilt))) {
    fail(
      'INDEXED_MODEL_INPUT_BINDING_MISMATCH',
      '比較用index入力がsource packageからの決定的再構築結果と一致しません'
    );
  }
}

export function buildDistantConnectionComparisonModelVisiblePayloadV001(
  indexedModelInput: DistantConnectionComparisonIndexedModelInputV001
): DistantConnectionComparisonModelVisiblePayloadV001 {
  assertDistantConnectionComparisonIndexedModelInputV001(indexedModelInput);
  return {
    indexBase: 0,
    explorationTask: structuredClone(indexedModelInput.explorationTask),
    utterances: structuredClone(indexedModelInput.utterances),
    anchors: structuredClone(indexedModelInput.anchors),
    responseContract: structuredClone(indexedModelInput.responseContract)
  };
}

export function serializeDistantConnectionComparisonModelVisiblePayloadV001(
  indexedModelInput: DistantConnectionComparisonIndexedModelInputV001
): Buffer {
  const payload = buildDistantConnectionComparisonModelVisiblePayloadV001(
    indexedModelInput
  );
  return Buffer.from(`${JSON.stringify(payload, null, 2)}\n`, 'utf8');
}

function assertIndexArray(
  value: unknown,
  maximum: number,
  label: string
): asserts value is number[] {
  if (!Array.isArray(value) || value.length === 0) {
    fail('INDEX_RESPONSE_INVALID', `${label}は空でない配列である必要があります`);
  }
  const seen = new Set<number>();
  let previous = -1;
  for (const [position, index] of value.entries()) {
    assertIndex(index, maximum, `${label}${position + 1}件目`);
    if (seen.has(index)) {
      fail('INDEX_DUPLICATE', `${label}に重複した発話indexがあります`);
    }
    if (index <= previous) {
      fail('INDEX_ORDER_REVERSED', `${label}が発話indexの昇順ではありません`);
    }
    seen.add(index);
    previous = index;
  }
}

function assertIndexCandidate(
  value: unknown,
  indexedModelInput: DistantConnectionComparisonIndexedModelInputV001,
  label: string
): asserts value is DistantConnectionComparisonIndexCandidateV001 {
  if (!isRecord(value)
    || !hasExactKeys(value, INDEX_CANDIDATE_KEYS)
    || typeof value.addedUnderstanding !== 'string'
    || value.addedUnderstanding.trim().length === 0
    || (value.direction !== 'past' && value.direction !== 'future')) {
    fail('INDEX_RESPONSE_INVALID', `${label}の構造または値が不正です`);
  }
  assertIndex(value.anchorIndex, indexedModelInput.anchorCount - 1, `${label}のanchorIndex`);
  assertIndexArray(
    value.firstPartUtteranceIndexes,
    indexedModelInput.utteranceCount - 1,
    `${label}の前半発話index`
  );
  assertIndexArray(
    value.secondPartUtteranceIndexes,
    indexedModelInput.utteranceCount - 1,
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
  const anchorUtteranceIndex = indexedModelInput.anchors[value.anchorIndex]!.utteranceIndex;
  const anchorSide = value.direction === 'future' ? firstIndexes : secondIndexes;
  if (!anchorSide.includes(anchorUtteranceIndex)) {
    fail('ANCHOR_DIRECTION_MISMATCH', `${label}のdirectionとanchor所属側が一致しません`);
  }
}

export function assertDistantConnectionComparisonIndexResponseV001(
  value: unknown,
  indexedModelInput: DistantConnectionComparisonIndexedModelInputV001
): asserts value is DistantConnectionComparisonIndexResponseV001 {
  assertDistantConnectionComparisonIndexedModelInputV001(indexedModelInput);
  if (!isRecord(value)
    || !hasExactKeys(value, ['schemaVersion', 'candidates'])
    || value.schemaVersion !== DISTANT_CONNECTION_COMPARISON_INDEX_RESPONSE_SCHEMA_V001
    || !Array.isArray(value.candidates)) {
    fail('INDEX_RESPONSE_INVALID', '比較用index返答のroot構造または版が不正です');
  }
  const seenReferences = new Set<string>();
  for (const [index, candidate] of value.candidates.entries()) {
    assertIndexCandidate(candidate, indexedModelInput, `候補${index + 1}件目`);
    const reference = JSON.stringify({
      anchorIndex: candidate.anchorIndex,
      firstPartUtteranceIndexes: candidate.firstPartUtteranceIndexes,
      secondPartUtteranceIndexes: candidate.secondPartUtteranceIndexes,
      direction: candidate.direction
    });
    if (seenReferences.has(reference)) {
      fail('CANDIDATE_REFERENCE_DUPLICATE', '同じindex参照の候補が重複しています');
    }
    seenReferences.add(reference);
  }
}

export function serializeDistantConnectionComparisonIndexResponseV001(
  value: DistantConnectionComparisonIndexResponseV001,
  indexedModelInput: DistantConnectionComparisonIndexedModelInputV001
): Buffer {
  assertDistantConnectionComparisonIndexResponseV001(value, indexedModelInput);
  return Buffer.from(`${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

export function decodeDistantConnectionComparisonIndexResponseV001(
  bytes: Uint8Array,
  indexedModelInput: DistantConnectionComparisonIndexedModelInputV001
): DistantConnectionComparisonIndexResponseV001 {
  let value: unknown;
  try {
    value = JSON.parse(Buffer.from(bytes).toString('utf8'));
  } catch (error) {
    fail('INDEX_RESPONSE_INVALID', '比較用index返答をJSONとして読めません', error);
  }
  assertDistantConnectionComparisonIndexResponseV001(value, indexedModelInput);
  if (!serializeDistantConnectionComparisonIndexResponseV001(value, indexedModelInput)
    .equals(Buffer.from(bytes))) {
    fail('INDEX_RESPONSE_INVALID', '比較用index返答がcanonical formal byteではありません');
  }
  return value;
}

export function deriveDistantConnectionComparisonCandidateIdV001(
  sourceVideoId: string,
  sourcePackageSha256: string,
  candidate: DistantConnectionComparisonIndexCandidateV001
): string {
  if (typeof sourceVideoId !== 'string' || sourceVideoId.length === 0
    || !SHA256.test(sourcePackageSha256)) {
    fail('SOURCE_PACKAGE_INVALID', 'candidate ID導出用のsource identityが不正です');
  }
  const identity = {
    sourceVideoId,
    sourcePackageSha256,
    anchorIndex: candidate.anchorIndex,
    firstPartUtteranceIndexes: [...candidate.firstPartUtteranceIndexes],
    secondPartUtteranceIndexes: [...candidate.secondPartUtteranceIndexes],
    direction: candidate.direction
  };
  return `candidate-${sha256(Buffer.from(JSON.stringify(identity), 'utf8'))}`;
}

export function resolveDistantConnectionComparisonIndexResponseV001(
  response: DistantConnectionComparisonIndexResponseV001,
  indexedModelInput: DistantConnectionComparisonIndexedModelInputV001,
  sourceInput: BuildDistantConnectionComparisonIndexedModelInputV001
): DistantConnectionComparisonResolvedCandidateV001[] {
  validateDistantConnectionComparisonIndexedModelInputAgainstSourceV001(
    indexedModelInput,
    sourceInput
  );
  assertDistantConnectionComparisonIndexResponseV001(response, indexedModelInput);
  const sourcePackage = decodeBoundSourcePackage(sourceInput);
  return response.candidates.map((candidate) => ({
    candidateId: deriveDistantConnectionComparisonCandidateIdV001(
      sourcePackage.sourceVideoId,
      sha256(sourceInput.sourcePackageBytes),
      candidate
    ),
    sourceVideoId: sourcePackage.sourceVideoId,
    anchorId: sourcePackage.anchors[candidate.anchorIndex]!.anchorId,
    firstPartUtteranceIds: candidate.firstPartUtteranceIndexes.map(
      (index) => sourcePackage.utterances[index]!.utteranceId
    ),
    secondPartUtteranceIds: candidate.secondPartUtteranceIndexes.map(
      (index) => sourcePackage.utterances[index]!.utteranceId
    ),
    addedUnderstanding: candidate.addedUnderstanding,
    direction: candidate.direction
  }));
}

function buildRequestInstructions(): string {
  return REQUEST_INSTRUCTIONS_PREFIX;
}

function assertSourceExecutionPlan(
  sourcePackage: DistantConnectionComparisonSourcePackageV001,
  settings: DistantConnectionComparisonRequestSettingsV001
): void {
  if (JSON.stringify(sourcePackage.plannedExecution) !== JSON.stringify({
    providerId: settings.providerId,
    modelId: settings.modelId,
    operationId: settings.operationId,
    reasoningEffort: settings.reasoningEffort,
    store: settings.store
  })) {
    fail('REQUEST_SETTINGS_MISMATCH', 'source packageの実行予定値が固定request設定と一致しません');
  }
}

function buildExactRequest(
  indexedModelInput: DistantConnectionComparisonIndexedModelInputV001,
  settings: DistantConnectionComparisonRequestSettingsV001
): DistantConnectionComparisonExactRequestV001 {
  return {
    model: settings.modelId,
    instructions: buildRequestInstructions(),
    input: serializeDistantConnectionComparisonModelVisiblePayloadV001(
      indexedModelInput
    ).toString('utf8'),
    reasoning: {effort: settings.reasoningEffort},
    text: {
      format: {
        type: 'json_schema',
        name: settings.responseFormatName,
        strict: true,
        schema: structuredClone(indexedModelInput.responseContract.jsonSchema)
      }
    },
    store: settings.store
  };
}

export function assertDistantConnectionComparisonExactRequestV001(
  value: unknown,
  indexedModelInput: DistantConnectionComparisonIndexedModelInputV001,
  indexedModelInputBinding: DistantConnectionComparisonFormalBindingV001
): asserts value is DistantConnectionComparisonExactRequestV001 {
  assertDistantConnectionComparisonIndexedModelInputV001(indexedModelInput);
  assertFormalBinding(
    indexedModelInputBinding,
    'indexed model input binding',
    'INDEXED_MODEL_INPUT_INVALID'
  );
  const indexedBytes = serializeDistantConnectionComparisonIndexedModelInputV001(
    indexedModelInput
  );
  const modelVisiblePayloadBytes =
    serializeDistantConnectionComparisonModelVisiblePayloadV001(indexedModelInput);
  if (indexedModelInputBinding.schemaVersion
      !== DISTANT_CONNECTION_COMPARISON_INDEXED_MODEL_INPUT_SCHEMA_V001
    || indexedModelInputBinding.fileSha256 !== sha256(indexedBytes)) {
    fail('INDEXED_MODEL_INPUT_BINDING_MISMATCH', 'request検査用index入力bindingがbyteと一致しません');
  }
  if (!isRecord(value)
    || !hasExactKeys(value, ['model', 'instructions', 'input', 'reasoning', 'text', 'store'])
    || value.model !== DISTANT_CONNECTION_COMPARISON_REQUEST_SETTINGS_V001.modelId
    || value.instructions !== buildRequestInstructions()
    || value.input !== modelVisiblePayloadBytes.toString('utf8')
    || value.store !== false
    || !isRecord(value.reasoning)
    || !hasExactKeys(value.reasoning, ['effort'])
    || value.reasoning.effort
      !== DISTANT_CONNECTION_COMPARISON_REQUEST_SETTINGS_V001.reasoningEffort
    || !isRecord(value.text)
    || !hasExactKeys(value.text, ['format'])
    || !isRecord(value.text.format)
    || !hasExactKeys(value.text.format, ['type', 'name', 'strict', 'schema'])
    || value.text.format.type !== 'json_schema'
    || value.text.format.name
      !== DISTANT_CONNECTION_COMPARISON_REQUEST_SETTINGS_V001.responseFormatName
    || value.text.format.strict !== true) {
    fail('REQUEST_INVALID', '比較用Luna exact requestの構造または固定値が不正です');
  }
  if (JSON.stringify(value.text.format.schema)
    !== JSON.stringify(indexedModelInput.responseContract.jsonSchema)) {
    fail('RESPONSE_SCHEMA_BINDING_MISMATCH', 'provider返答schemaがindex入力と一致しません');
  }
}

export function serializeDistantConnectionComparisonExactRequestV001(
  value: DistantConnectionComparisonExactRequestV001,
  indexedModelInput: DistantConnectionComparisonIndexedModelInputV001,
  indexedModelInputBinding: DistantConnectionComparisonFormalBindingV001
): Buffer {
  assertDistantConnectionComparisonExactRequestV001(
    value,
    indexedModelInput,
    indexedModelInputBinding
  );
  return Buffer.from(`${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

export function decodeDistantConnectionComparisonExactRequestV001(
  bytes: Uint8Array,
  indexedModelInput: DistantConnectionComparisonIndexedModelInputV001,
  indexedModelInputBinding: DistantConnectionComparisonFormalBindingV001
): DistantConnectionComparisonExactRequestV001 {
  let value: unknown;
  try {
    value = JSON.parse(Buffer.from(bytes).toString('utf8'));
  } catch (error) {
    fail('REQUEST_INVALID', '比較用Luna exact requestをJSONとして読めません', error);
  }
  assertDistantConnectionComparisonExactRequestV001(
    value,
    indexedModelInput,
    indexedModelInputBinding
  );
  if (!serializeDistantConnectionComparisonExactRequestV001(
    value,
    indexedModelInput,
    indexedModelInputBinding
  ).equals(Buffer.from(bytes))) {
    fail('REQUEST_INVALID', '比較用Luna exact requestがcanonical formal byteではありません');
  }
  return value;
}

export function assertDistantConnectionComparisonB5LocalManifestV001(
  value: unknown
): asserts value is DistantConnectionComparisonB5LocalManifestV001 {
  if (!isRecord(value)
    || !hasExactKeys(value, [
      'schemaVersion',
      'sourcePackageBinding',
      'indexedModelInputBinding',
      'requestBinding',
      'requestSettings',
      'b6ContinuationContract'
    ])
    || value.schemaVersion
      !== DISTANT_CONNECTION_COMPARISON_B5_LOCAL_MANIFEST_SCHEMA_V001) {
    fail('MANIFEST_INVALID', '比較用B5 manifestのroot構造または版が不正です');
  }
  assertFormalBinding(value.sourcePackageBinding, 'source package binding', 'MANIFEST_INVALID');
  assertFormalBinding(
    value.indexedModelInputBinding,
    'indexed model input binding',
    'MANIFEST_INVALID'
  );
  assertFormalBinding(value.requestBinding, 'exact request binding', 'MANIFEST_INVALID');
  assertRequestSettings(value.requestSettings);
  if (value.sourcePackageBinding.schemaVersion
      !== DISTANT_CONNECTION_COMPARISON_SOURCE_PACKAGE_SCHEMA_V001
    || value.indexedModelInputBinding.schemaVersion
      !== DISTANT_CONNECTION_COMPARISON_INDEXED_MODEL_INPUT_SCHEMA_V001
    || value.requestBinding.schemaVersion
      !== DISTANT_CONNECTION_COMPARISON_EXACT_REQUEST_SCHEMA_V001
    || !isRecord(value.b6ContinuationContract)
    || !hasExactKeys(value.b6ContinuationContract, ['requiredRequestBinding'])) {
    fail('MANIFEST_INVALID', '比較用B5 manifestのbinding版またはB6継続契約が不正です');
  }
  assertFormalBinding(
    value.b6ContinuationContract.requiredRequestBinding,
    'B6 required request binding',
    'MANIFEST_INVALID'
  );
  if (JSON.stringify(value.b6ContinuationContract.requiredRequestBinding)
    !== JSON.stringify(value.requestBinding)) {
    fail('MANIFEST_INVALID', 'B6継続時のrequest bindingがB5 requestと一致しません');
  }
}

export function serializeDistantConnectionComparisonB5LocalManifestV001(
  value: DistantConnectionComparisonB5LocalManifestV001
): Buffer {
  assertDistantConnectionComparisonB5LocalManifestV001(value);
  return Buffer.from(`${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

export function decodeDistantConnectionComparisonB5LocalManifestV001(
  bytes: Uint8Array
): DistantConnectionComparisonB5LocalManifestV001 {
  let value: unknown;
  try {
    value = JSON.parse(Buffer.from(bytes).toString('utf8'));
  } catch (error) {
    fail('MANIFEST_INVALID', '比較用B5 manifestをJSONとして読めません', error);
  }
  assertDistantConnectionComparisonB5LocalManifestV001(value);
  if (!serializeDistantConnectionComparisonB5LocalManifestV001(value)
    .equals(Buffer.from(bytes))) {
    fail('MANIFEST_INVALID', '比較用B5 manifestがcanonical formal byteではありません');
  }
  return value;
}

export function buildDistantConnectionComparisonB5LocalArtifactsV001(
  input: BuildDistantConnectionComparisonB5LocalArtifactsV001
): {
    request: DistantConnectionComparisonExactRequestV001;
    requestBytes: Buffer;
    manifest: DistantConnectionComparisonB5LocalManifestV001;
    manifestBytes: Buffer;
  } {
  assertWorkspaceRelativePath(input.requestPath, 'exact request path');
  assertRequestSettings(input.requestSettings);
  assertFormalBinding(
    input.sourcePackageBinding,
    'source package binding',
    'SOURCE_PACKAGE_INVALID'
  );
  if (input.sourcePackageBinding.schemaVersion
      !== DISTANT_CONNECTION_COMPARISON_SOURCE_PACKAGE_SCHEMA_V001) {
    fail('SOURCE_PACKAGE_INVALID', 'source package bindingの版が不正です');
  }
  if (input.sourcePackageBinding.fileSha256 !== sha256(input.sourcePackageBytes)) {
    fail('SOURCE_PACKAGE_SHA_MISMATCH', 'source package SHAが実byteと一致しません');
  }
  const sourcePackage = decodeBoundSourcePackage({
    sourcePackagePath: input.sourcePackageBinding.path,
    sourcePackageBytes: input.sourcePackageBytes
  });
  assertFormalBinding(
    input.indexedModelInputBinding,
    'indexed model input binding',
    'INDEXED_MODEL_INPUT_INVALID'
  );
  if (input.indexedModelInputBinding.schemaVersion
      !== DISTANT_CONNECTION_COMPARISON_INDEXED_MODEL_INPUT_SCHEMA_V001) {
    fail('INDEXED_MODEL_INPUT_INVALID', 'indexed model input bindingの版が不正です');
  }
  if (input.indexedModelInputBinding.fileSha256 !== sha256(input.indexedModelInputBytes)) {
    fail('INDEXED_MODEL_INPUT_SHA_MISMATCH', 'indexed model input SHAが実byteと一致しません');
  }
  const indexedModelInput = decodeDistantConnectionComparisonIndexedModelInputV001(
    input.indexedModelInputBytes
  );
  validateDistantConnectionComparisonIndexedModelInputAgainstSourceV001(
    indexedModelInput,
    {
      sourcePackagePath: input.sourcePackageBinding.path,
      sourcePackageBytes: input.sourcePackageBytes
    }
  );
  if (JSON.stringify(indexedModelInput.sourcePackageBinding)
    !== JSON.stringify(input.sourcePackageBinding)) {
    fail('INDEXED_MODEL_INPUT_BINDING_MISMATCH', 'index入力内のsource bindingが実入力と一致しません');
  }
  assertSourceExecutionPlan(sourcePackage, input.requestSettings);
  const request = buildExactRequest(
    indexedModelInput,
    input.requestSettings
  );
  const requestBytes = serializeDistantConnectionComparisonExactRequestV001(
    request,
    indexedModelInput,
    input.indexedModelInputBinding
  );
  const requestBinding: DistantConnectionComparisonFormalBindingV001 = {
    path: input.requestPath,
    schemaVersion: DISTANT_CONNECTION_COMPARISON_EXACT_REQUEST_SCHEMA_V001,
    fileSha256: sha256(requestBytes)
  };
  const manifest: DistantConnectionComparisonB5LocalManifestV001 = {
    schemaVersion: DISTANT_CONNECTION_COMPARISON_B5_LOCAL_MANIFEST_SCHEMA_V001,
    sourcePackageBinding: structuredClone(input.sourcePackageBinding),
    indexedModelInputBinding: structuredClone(input.indexedModelInputBinding),
    requestBinding,
    requestSettings: structuredClone(input.requestSettings),
    b6ContinuationContract: {requiredRequestBinding: structuredClone(requestBinding)}
  };
  const manifestBytes = serializeDistantConnectionComparisonB5LocalManifestV001(manifest);
  return {request, requestBytes, manifest, manifestBytes};
}

export function validateDistantConnectionComparisonB5LocalArtifactsV001(
  artifacts: ReturnType<typeof buildDistantConnectionComparisonB5LocalArtifactsV001>,
  input: BuildDistantConnectionComparisonB5LocalArtifactsV001
): void {
  const indexedModelInput = decodeDistantConnectionComparisonIndexedModelInputV001(
    input.indexedModelInputBytes
  );
  const requestBytesFromObject = serializeDistantConnectionComparisonExactRequestV001(
    artifacts.request,
    indexedModelInput,
    input.indexedModelInputBinding
  );
  if (!requestBytesFromObject.equals(artifacts.requestBytes)) {
    fail('REQUEST_INVALID', 'request objectとrequest formal byteが一致しません');
  }
  const manifestBytesFromObject =
    serializeDistantConnectionComparisonB5LocalManifestV001(artifacts.manifest);
  if (!manifestBytesFromObject.equals(artifacts.manifestBytes)) {
    fail('MANIFEST_INVALID', 'manifest objectとmanifest formal byteが一致しません');
  }
  const rebuilt = buildDistantConnectionComparisonB5LocalArtifactsV001(input);
  if (!rebuilt.requestBytes.equals(artifacts.requestBytes)
    || !rebuilt.manifestBytes.equals(artifacts.manifestBytes)) {
    fail('REQUEST_INVALID', 'B5成果物が同じ入力からの決定的再構築結果と一致しません');
  }
}

export function assertDistantConnectionComparisonB6RequestBindingV001(
  manifest: DistantConnectionComparisonB5LocalManifestV001,
  requestBinding: DistantConnectionComparisonFormalBindingV001,
  requestBytes: Uint8Array
): void {
  assertDistantConnectionComparisonB5LocalManifestV001(manifest);
  assertFormalBinding(requestBinding, 'B6 request binding', 'B6_REQUEST_BINDING_MISMATCH');
  if (requestBinding.fileSha256 !== sha256(requestBytes)
    || JSON.stringify(requestBinding)
      !== JSON.stringify(manifest.b6ContinuationContract.requiredRequestBinding)) {
    fail('B6_REQUEST_BINDING_MISMATCH', 'B6がB5と同一exact requestを使用していません');
  }
}
