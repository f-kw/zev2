import {createHash} from 'node:crypto';
import {mkdir, readFile, writeFile} from 'node:fs/promises';
import path from 'node:path';

import {
  DISTANT_CONNECTION_LUNA_INDEXED_MODEL_INPUT_SCHEMA_V001,
  decodeDistantConnectionLunaIndexedModelInputV001,
  serializeDistantConnectionLunaIndexedModelInputV001,
  validateDistantConnectionLunaIndexedModelInputAgainstSourceV001,
  type DistantConnectionLunaIndexedModelInputV001
} from './distant-connection-luna-index-reference-v001.js';
import {
  DISTANT_CONNECTION_LUNA_SOURCE_PACKAGE_SCHEMA_V002,
  decodeDistantConnectionLunaSourcePackageV002,
  serializeDistantConnectionLunaSourcePackageV002,
  type DistantConnectionLunaFormalFileBindingV002,
  type DistantConnectionLunaSourcePackageV002
} from './distant-connection-luna-source-package-v002.js';

export const DISTANT_CONNECTION_LUNA_REQUEST_SCHEMA_V003 =
  'openai-responses-distant-connection-request-v003';
export const DISTANT_CONNECTION_LUNA_B5_LOCAL_MANIFEST_SCHEMA_V003 =
  'distant-connection-luna-b5-local-manifest-v003';
export const DISTANT_CONNECTION_LUNA_B5_MEASUREMENT_SCHEMA_V003 =
  'distant-connection-luna-b5-measurement-v003';

export type DistantConnectionLunaRequestSettingsV003 = {
  providerId: 'openai-api';
  modelId: 'gpt-5.6-luna';
  operationId: 'responses';
  reasoningEffort: 'medium';
  responseFormatName: 'distant_connection_index_response_v001';
  store: false;
};

export const DISTANT_CONNECTION_LUNA_REQUEST_SETTINGS_V003:
Readonly<DistantConnectionLunaRequestSettingsV003> = Object.freeze({
  providerId: 'openai-api',
  modelId: 'gpt-5.6-luna',
  operationId: 'responses',
  reasoningEffort: 'medium',
  responseFormatName: 'distant_connection_index_response_v001',
  store: false
});

export const DISTANT_CONNECTION_LUNA_B5_ERROR_CODES_V003 = Object.freeze([
  'SOURCE_PACKAGE_INVALID',
  'SOURCE_PACKAGE_SHA_MISMATCH',
  'INDEXED_MODEL_INPUT_INVALID',
  'INDEXED_MODEL_INPUT_SHA_MISMATCH',
  'INDEXED_MODEL_INPUT_BINDING_MISMATCH',
  'REQUEST_SETTINGS_MISMATCH',
  'REQUEST_INVALID',
  'RESPONSE_SCHEMA_BINDING_MISMATCH',
  'REQUEST_BINDING_MISMATCH',
  'MANIFEST_INVALID',
  'MEASUREMENT_RESULT_INVALID',
  'PRICE_SNAPSHOT_INVALID',
  'COST_EVALUATION_INVALID',
  'B6_REQUEST_BINDING_MISMATCH'
] as const);

export type DistantConnectionLunaB5ErrorCodeV003 =
  typeof DISTANT_CONNECTION_LUNA_B5_ERROR_CODES_V003[number];

export class DistantConnectionLunaB5LocalErrorV003 extends Error {
  readonly code: DistantConnectionLunaB5ErrorCodeV003;

  constructor(code: DistantConnectionLunaB5ErrorCodeV003, message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'DistantConnectionLunaB5LocalErrorV003';
    this.code = code;
  }
}

export type DistantConnectionLunaExactRequestV003 = {
  model: 'gpt-5.6-luna';
  instructions: string;
  input: string;
  reasoning: {effort: 'medium'};
  text: {
    format: {
      type: 'json_schema';
      name: 'distant_connection_index_response_v001';
      strict: true;
      schema: Record<string, unknown>;
    };
  };
  store: false;
};

export type DistantConnectionLunaB5LocalManifestV003 = {
  schemaVersion: typeof DISTANT_CONNECTION_LUNA_B5_LOCAL_MANIFEST_SCHEMA_V003;
  sourcePackageBinding: DistantConnectionLunaFormalFileBindingV002;
  indexedModelInputBinding: DistantConnectionLunaFormalFileBindingV002;
  requestBinding: DistantConnectionLunaFormalFileBindingV002;
  requestSettings: DistantConnectionLunaRequestSettingsV003;
  measurementContract: {
    schemaVersion: typeof DISTANT_CONNECTION_LUNA_B5_MEASUREMENT_SCHEMA_V003;
    jsonSchema: Record<string, unknown>;
  };
  b6ContinuationContract: {
    requiredRequestBinding: DistantConnectionLunaFormalFileBindingV002;
  };
};

export type DistantConnectionLunaB5MeasurementV003 = {
  schemaVersion: typeof DISTANT_CONNECTION_LUNA_B5_MEASUREMENT_SCHEMA_V003;
  sourcePackageBinding: DistantConnectionLunaFormalFileBindingV002;
  indexedModelInputBinding: DistantConnectionLunaFormalFileBindingV002;
  requestBinding: DistantConnectionLunaFormalFileBindingV002;
  providerId: 'openai-api';
  modelId: 'gpt-5.6-luna';
  tokenMeasurement: {
    rawResponseBinding: DistantConnectionLunaFormalFileBindingV002;
    inputTokens: number;
  };
  costEvaluation: {
    priceSnapshotBinding: DistantConnectionLunaFormalFileBindingV002;
    maximumNanoUsd: number;
    projectedNanoUsd: number;
    decision: 'passed' | 'stopped';
  };
};

export type DistantConnectionLunaB5CostAdmissionV003 = {
  inputTokens: number;
  contextWindowTokens: 1_050_000;
  contextUsage: {numeratorTokens: number; denominatorTokens: 1_050_000};
  withinContextWindow: boolean;
  longContextPricing: {
    thresholdTokens: 272_000;
    applies: boolean;
  };
  maximumOutputTokens: 128_000;
  maximumInputPriceNanoUsdPerToken: number;
  outputPriceNanoUsdPerToken: number;
  projectedInputNanoUsd: number;
  projectedMaximumOutputNanoUsd: number;
  projectedNanoUsd: number;
  maximumNanoUsd: number;
  withinMaximumCost: boolean;
  decision: 'passed' | 'stopped';
  priceSnapshotBinding: DistantConnectionLunaFormalFileBindingV002;
};

export type BuildDistantConnectionLunaB5CostAdmissionInputV003 = {
  inputTokens: number;
  priceSnapshotPath: string;
  priceSnapshotBytes: Uint8Array;
  expectedPriceSnapshotSha256: string;
  maximumNanoUsd: number;
};

export type BuildDistantConnectionLunaB5MeasurementInputV003 = {
  manifestBytes: Uint8Array;
  rawResponsePath: string;
  rawResponseBytes: Uint8Array;
  costAdmission: DistantConnectionLunaB5CostAdmissionV003;
};

export type BuildDistantConnectionLunaB5LocalInputV003 = {
  sourcePackageBinding: DistantConnectionLunaFormalFileBindingV002;
  sourcePackageBytes: Uint8Array;
  indexedModelInputBinding: DistantConnectionLunaFormalFileBindingV002;
  indexedModelInputBytes: Uint8Array;
  requestPath: string;
  requestSettings: DistantConnectionLunaRequestSettingsV003;
};

export type BuildDistantConnectionLunaB5LocalFromFileInputV003 = Omit<
  BuildDistantConnectionLunaB5LocalInputV003,
  'sourcePackageBytes' | 'indexedModelInputBytes'
> & {workspaceRoot: string};

type WriteDistantConnectionLunaB5LocalArtifactsInputV003 =
  BuildDistantConnectionLunaB5LocalFromFileInputV003 & {manifestPath: string};

type RecordValue = Record<string, unknown>;

const SHA256 = /^[0-9a-f]{64}$/u;
const FORMAL_ID = /^[A-Za-z0-9][A-Za-z0-9._-]*$/u;
const WORKSPACE_RELATIVE_PATH =
  /^(?!\/)(?!\.\/)(?!.*(?:^|\/)\.\.(?:\/|$))(?!.*\\)(?!.*\/\/)[^\0]+$/u;
const REQUEST_INSTRUCTIONS_PREFIX =
  'indexed model inputのexplorationTaskとlearningContextに従って遠方接続候補を探索し、responseContract.jsonSchemaに適合するJSONだけを返してください。anchorIndexはanchors配列の位置、utteranceIndexはutterances配列の位置で、いずれも0始まりです。anchorと正式意味発話はこのindexだけで参照し、formal IDを返答へ記述しないでください。範囲外indexを補完または推測しないでください。返答indexからformal IDへの解決はローカル処理が行います。';

function fail(
  code: DistantConnectionLunaB5ErrorCodeV003,
  message: string,
  cause?: unknown
): never {
  throw new DistantConnectionLunaB5LocalErrorV003(
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

function hasExactKeys(value: RecordValue, keys: string[]): boolean {
  const actual = Object.keys(value);
  return actual.length === keys.length && actual.every((key, index) => key === keys[index]);
}

function assertPath(value: unknown, label: string): asserts value is string {
  if (typeof value !== 'string' || !WORKSPACE_RELATIVE_PATH.test(value)) {
    fail('REQUEST_INVALID', `${label}はworkspace相対pathである必要があります`);
  }
}

function assertFormalBinding(
  value: unknown,
  label: string,
  code: DistantConnectionLunaB5ErrorCodeV003 = 'MANIFEST_INVALID'
): asserts value is DistantConnectionLunaFormalFileBindingV002 {
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

function assertRequestSettings(
  value: unknown
): asserts value is DistantConnectionLunaRequestSettingsV003 {
  if (!isRecord(value)
    || !hasExactKeys(value, [
      'providerId',
      'modelId',
      'operationId',
      'reasoningEffort',
      'responseFormatName',
      'store'
    ])
    || JSON.stringify(value) !== JSON.stringify(DISTANT_CONNECTION_LUNA_REQUEST_SETTINGS_V003)) {
    fail('REQUEST_SETTINGS_MISMATCH', 'provider/model/operation/reasoning設定が承認済み値と一致しません');
  }
}

function decodeBoundSourcePackage(
  input: BuildDistantConnectionLunaB5LocalInputV003
): DistantConnectionLunaSourcePackageV002 {
  assertFormalBinding(input.sourcePackageBinding, 'source package binding', 'SOURCE_PACKAGE_INVALID');
  if (input.sourcePackageBinding.schemaVersion
    !== DISTANT_CONNECTION_LUNA_SOURCE_PACKAGE_SCHEMA_V002) {
    fail('SOURCE_PACKAGE_INVALID', 'source package bindingのschema版がv002ではありません');
  }
  if (input.sourcePackageBinding.fileSha256 !== sha256(input.sourcePackageBytes)) {
    fail('SOURCE_PACKAGE_SHA_MISMATCH', 'source package byteのSHA-256がbindingと一致しません');
  }
  let sourcePackage: DistantConnectionLunaSourcePackageV002;
  try {
    sourcePackage = decodeDistantConnectionLunaSourcePackageV002(input.sourcePackageBytes);
  } catch (error) {
    fail('SOURCE_PACKAGE_INVALID', 'source packageがv002正式契約に適合しません', error);
  }
  if (sourcePackage.responseContract.sourcePackagePath !== input.sourcePackageBinding.path
    || !serializeDistantConnectionLunaSourcePackageV002(sourcePackage)
      .equals(Buffer.from(input.sourcePackageBytes))) {
    fail('SOURCE_PACKAGE_INVALID', 'source packageのpathまたは正式byte表現がbindingと一致しません');
  }
  return sourcePackage;
}

function decodeBoundIndexedModelInput(
  input: BuildDistantConnectionLunaB5LocalInputV003
): DistantConnectionLunaIndexedModelInputV001 {
  assertFormalBinding(
    input.indexedModelInputBinding,
    'indexed model input binding',
    'INDEXED_MODEL_INPUT_INVALID'
  );
  if (input.indexedModelInputBinding.schemaVersion
    !== DISTANT_CONNECTION_LUNA_INDEXED_MODEL_INPUT_SCHEMA_V001) {
    fail('INDEXED_MODEL_INPUT_INVALID', 'indexed model input bindingのschema版がv001ではありません');
  }
  if (input.indexedModelInputBinding.fileSha256 !== sha256(input.indexedModelInputBytes)) {
    fail(
      'INDEXED_MODEL_INPUT_SHA_MISMATCH',
      'indexed model input byteのSHA-256がbindingと一致しません'
    );
  }
  let indexedModelInput: DistantConnectionLunaIndexedModelInputV001;
  try {
    indexedModelInput = decodeDistantConnectionLunaIndexedModelInputV001(
      input.indexedModelInputBytes
    );
  } catch (error) {
    fail('INDEXED_MODEL_INPUT_INVALID', 'indexed model inputがv001正式契約に適合しません', error);
  }
  if (!serializeDistantConnectionLunaIndexedModelInputV001(indexedModelInput)
    .equals(Buffer.from(input.indexedModelInputBytes))) {
    fail('INDEXED_MODEL_INPUT_INVALID', 'indexed model inputが正式byte表現ではありません');
  }
  try {
    validateDistantConnectionLunaIndexedModelInputAgainstSourceV001(indexedModelInput, {
      sourcePackagePath: input.sourcePackageBinding.path,
      sourcePackageBytes: input.sourcePackageBytes
    });
  } catch (error) {
    fail(
      'INDEXED_MODEL_INPUT_BINDING_MISMATCH',
      'indexed model inputが指定source packageからの決定的導出値と一致しません',
      error
    );
  }
  if (JSON.stringify(indexedModelInput.sourcePackageBinding)
    !== JSON.stringify(input.sourcePackageBinding)) {
    fail(
      'INDEXED_MODEL_INPUT_BINDING_MISMATCH',
      'indexed model input内のsource package bindingが実入力と一致しません'
    );
  }
  return indexedModelInput;
}

function assertSourceExecutionPlan(
  sourcePackage: DistantConnectionLunaSourcePackageV002,
  settings: DistantConnectionLunaRequestSettingsV003
): void {
  if (sourcePackage.plannedExecution.providerId !== settings.providerId
    || sourcePackage.plannedExecution.modelId !== settings.modelId
    || sourcePackage.plannedExecution.operationId !== settings.operationId) {
    fail('REQUEST_SETTINGS_MISMATCH', 'source packageの実行予定値とexact request設定が一致しません');
  }
}

function buildRequestInstructions(
  sourcePackageBinding: DistantConnectionLunaFormalFileBindingV002,
  indexedModelInputBinding: DistantConnectionLunaFormalFileBindingV002
): string {
  return `${REQUEST_INSTRUCTIONS_PREFIX} 正式binding: ${JSON.stringify({
    sourcePackageBinding,
    indexedModelInputBinding
  })}`;
}

function providerResponseSchema(
  indexedModelInput: DistantConnectionLunaIndexedModelInputV001
): Record<string, unknown> {
  const schema = structuredClone(indexedModelInput.responseContract.jsonSchema);
  const properties = isRecord(schema.properties) ? schema.properties : undefined;
  const candidates = properties && isRecord(properties.candidates)
    ? properties.candidates
    : undefined;
  const items = candidates && isRecord(candidates.items) ? candidates.items : undefined;
  const candidateProperties = items && isRecord(items.properties) ? items.properties : undefined;
  const anchorIndex = candidateProperties && isRecord(candidateProperties.anchorIndex)
    ? candidateProperties.anchorIndex
    : undefined;
  const firstPart = candidateProperties && isRecord(candidateProperties.firstPartUtteranceIndexes)
    ? candidateProperties.firstPartUtteranceIndexes
    : undefined;
  const secondPart = candidateProperties && isRecord(candidateProperties.secondPartUtteranceIndexes)
    ? candidateProperties.secondPartUtteranceIndexes
    : undefined;
  if (!anchorIndex || anchorIndex.type !== 'integer'
    || !Number.isSafeInteger(anchorIndex.minimum)
    || !Number.isSafeInteger(anchorIndex.maximum)
    || !firstPart || firstPart.minItems !== 1
    || !isRecord(firstPart.items) || firstPart.items.type !== 'integer'
    || !Number.isSafeInteger(firstPart.items.minimum)
    || !Number.isSafeInteger(firstPart.items.maximum)
    || !secondPart || secondPart.minItems !== 1
    || !isRecord(secondPart.items) || secondPart.items.type !== 'integer'
    || !Number.isSafeInteger(secondPart.items.minimum)
    || !Number.isSafeInteger(secondPart.items.maximum)) {
    fail(
      'RESPONSE_SCHEMA_BINDING_MISMATCH',
      'provider向けindex返答schemaをindexed model inputから導出できません'
    );
  }
  return schema;
}

function buildExactRequest(
  indexedModelInput: DistantConnectionLunaIndexedModelInputV001,
  indexedModelInputBytes: Uint8Array,
  sourcePackageBinding: DistantConnectionLunaFormalFileBindingV002,
  indexedModelInputBinding: DistantConnectionLunaFormalFileBindingV002,
  settings: DistantConnectionLunaRequestSettingsV003
): DistantConnectionLunaExactRequestV003 {
  return {
    model: settings.modelId,
    instructions: buildRequestInstructions(sourcePackageBinding, indexedModelInputBinding),
    input: Buffer.from(indexedModelInputBytes).toString('utf8'),
    reasoning: {effort: settings.reasoningEffort},
    text: {
      format: {
        type: 'json_schema',
        name: settings.responseFormatName,
        strict: true,
        schema: providerResponseSchema(indexedModelInput)
      }
    },
    store: settings.store
  };
}

function formalBindingSchema(binding?: DistantConnectionLunaFormalFileBindingV002) {
  return {
    type: 'object',
    additionalProperties: false,
    required: ['path', 'schemaVersion', 'fileSha256'],
    properties: {
      path: binding ? {type: 'string', const: binding.path} : {type: 'string'},
      schemaVersion: binding
        ? {type: 'string', const: binding.schemaVersion}
        : {type: 'string'},
      fileSha256: binding
        ? {type: 'string', const: binding.fileSha256}
        : {type: 'string', pattern: '^[0-9a-f]{64}$'}
    }
  };
}

function buildMeasurementJsonSchema(
  sourcePackageBinding: DistantConnectionLunaFormalFileBindingV002,
  indexedModelInputBinding: DistantConnectionLunaFormalFileBindingV002,
  requestBinding: DistantConnectionLunaFormalFileBindingV002,
  settings: DistantConnectionLunaRequestSettingsV003
): Record<string, unknown> {
  return {
    type: 'object',
    additionalProperties: false,
    required: [
      'schemaVersion',
      'sourcePackageBinding',
      'indexedModelInputBinding',
      'requestBinding',
      'providerId',
      'modelId',
      'tokenMeasurement',
      'costEvaluation'
    ],
    properties: {
      schemaVersion: {
        type: 'string',
        const: DISTANT_CONNECTION_LUNA_B5_MEASUREMENT_SCHEMA_V003
      },
      sourcePackageBinding: formalBindingSchema(sourcePackageBinding),
      indexedModelInputBinding: formalBindingSchema(indexedModelInputBinding),
      requestBinding: formalBindingSchema(requestBinding),
      providerId: {type: 'string', const: settings.providerId},
      modelId: {type: 'string', const: settings.modelId},
      tokenMeasurement: {
        type: 'object',
        additionalProperties: false,
        required: ['rawResponseBinding', 'inputTokens'],
        properties: {
          rawResponseBinding: formalBindingSchema(),
          inputTokens: {type: 'integer', minimum: 0}
        }
      },
      costEvaluation: {
        type: 'object',
        additionalProperties: false,
        required: [
          'priceSnapshotBinding', 'maximumNanoUsd', 'projectedNanoUsd', 'decision'
        ],
        properties: {
          priceSnapshotBinding: formalBindingSchema(),
          maximumNanoUsd: {type: 'integer', minimum: 0},
          projectedNanoUsd: {type: 'integer', minimum: 0},
          decision: {type: 'string', enum: ['passed', 'stopped']}
        }
      }
    }
  };
}

function buildManifest(
  sourcePackageBinding: DistantConnectionLunaFormalFileBindingV002,
  indexedModelInputBinding: DistantConnectionLunaFormalFileBindingV002,
  requestPath: string,
  requestBytes: Uint8Array,
  settings: DistantConnectionLunaRequestSettingsV003
): DistantConnectionLunaB5LocalManifestV003 {
  const requestBinding = {
    path: requestPath,
    schemaVersion: DISTANT_CONNECTION_LUNA_REQUEST_SCHEMA_V003,
    fileSha256: sha256(requestBytes)
  };
  return {
    schemaVersion: DISTANT_CONNECTION_LUNA_B5_LOCAL_MANIFEST_SCHEMA_V003,
    sourcePackageBinding: structuredClone(sourcePackageBinding),
    indexedModelInputBinding: structuredClone(indexedModelInputBinding),
    requestBinding,
    requestSettings: structuredClone(settings),
    measurementContract: {
      schemaVersion: DISTANT_CONNECTION_LUNA_B5_MEASUREMENT_SCHEMA_V003,
      jsonSchema: buildMeasurementJsonSchema(
        sourcePackageBinding,
        indexedModelInputBinding,
        requestBinding,
        settings
      )
    },
    b6ContinuationContract: {requiredRequestBinding: structuredClone(requestBinding)}
  };
}

export function buildDistantConnectionLunaB5LocalArtifactsFromBytesV003(
  input: BuildDistantConnectionLunaB5LocalInputV003
): {
    request: DistantConnectionLunaExactRequestV003;
    requestBytes: Buffer;
    manifest: DistantConnectionLunaB5LocalManifestV003;
    manifestBytes: Buffer;
  } {
  assertPath(input.requestPath, 'exact request path');
  assertRequestSettings(input.requestSettings);
  const sourcePackage = decodeBoundSourcePackage(input);
  const indexedModelInput = decodeBoundIndexedModelInput(input);
  assertSourceExecutionPlan(sourcePackage, input.requestSettings);
  const request = buildExactRequest(
    indexedModelInput,
    input.indexedModelInputBytes,
    input.sourcePackageBinding,
    input.indexedModelInputBinding,
    input.requestSettings
  );
  const requestBytes = serializeDistantConnectionLunaExactRequestV003(
    request,
    indexedModelInput,
    input.indexedModelInputBinding
  );
  const manifest = buildManifest(
    input.sourcePackageBinding,
    input.indexedModelInputBinding,
    input.requestPath,
    requestBytes,
    input.requestSettings
  );
  const manifestBytes = serializeDistantConnectionLunaB5LocalManifestV003(manifest);
  return {request, requestBytes, manifest, manifestBytes};
}

export async function buildDistantConnectionLunaB5LocalArtifactsFromFileV003(
  input: BuildDistantConnectionLunaB5LocalFromFileInputV003
): Promise<ReturnType<typeof buildDistantConnectionLunaB5LocalArtifactsFromBytesV003>> {
  assertFormalBinding(input.sourcePackageBinding, 'source package binding', 'SOURCE_PACKAGE_INVALID');
  assertFormalBinding(
    input.indexedModelInputBinding,
    'indexed model input binding',
    'INDEXED_MODEL_INPUT_INVALID'
  );
  assertPath(input.requestPath, 'exact request path');
  const [sourcePackageBytes, indexedModelInputBytes] = await Promise.all([
    readFile(path.join(input.workspaceRoot, input.sourcePackageBinding.path)),
    readFile(path.join(input.workspaceRoot, input.indexedModelInputBinding.path))
  ]);
  return buildDistantConnectionLunaB5LocalArtifactsFromBytesV003({
    sourcePackageBinding: input.sourcePackageBinding,
    sourcePackageBytes,
    indexedModelInputBinding: input.indexedModelInputBinding,
    indexedModelInputBytes,
    requestPath: input.requestPath,
    requestSettings: input.requestSettings
  });
}

export function assertDistantConnectionLunaExactRequestV003(
  value: unknown,
  indexedModelInput: DistantConnectionLunaIndexedModelInputV001,
  indexedModelInputBinding: DistantConnectionLunaFormalFileBindingV002
): asserts value is DistantConnectionLunaExactRequestV003 {
  assertFormalBinding(
    indexedModelInputBinding,
    'indexed model input binding',
    'INDEXED_MODEL_INPUT_INVALID'
  );
  const indexedModelInputBytes = serializeDistantConnectionLunaIndexedModelInputV001(
    indexedModelInput
  );
  if (indexedModelInputBinding.schemaVersion
      !== DISTANT_CONNECTION_LUNA_INDEXED_MODEL_INPUT_SCHEMA_V001
    || indexedModelInputBinding.fileSha256 !== sha256(indexedModelInputBytes)) {
    fail(
      'INDEXED_MODEL_INPUT_BINDING_MISMATCH',
      'exact request検査用indexed model input bindingがbyteと一致しません'
    );
  }
  const sourcePackageBinding = indexedModelInput.sourcePackageBinding;
  if (!isRecord(value)
    || !hasExactKeys(value, ['model', 'instructions', 'input', 'reasoning', 'text', 'store'])
    || value.model !== DISTANT_CONNECTION_LUNA_REQUEST_SETTINGS_V003.modelId
    || value.instructions !== buildRequestInstructions(
      sourcePackageBinding,
      indexedModelInputBinding
    )
    || value.input !== indexedModelInputBytes.toString('utf8')
    || value.store !== false
    || !isRecord(value.reasoning)
    || !hasExactKeys(value.reasoning, ['effort'])
    || value.reasoning.effort !== DISTANT_CONNECTION_LUNA_REQUEST_SETTINGS_V003.reasoningEffort
    || !isRecord(value.text)
    || !hasExactKeys(value.text, ['format'])
    || !isRecord(value.text.format)
    || !hasExactKeys(value.text.format, ['type', 'name', 'strict', 'schema'])
    || value.text.format.type !== 'json_schema'
    || value.text.format.name
      !== DISTANT_CONNECTION_LUNA_REQUEST_SETTINGS_V003.responseFormatName
    || value.text.format.strict !== true) {
    fail('REQUEST_INVALID', 'Luna exact request v003の構造または固定値が不正です');
  }
  if (JSON.stringify(value.text.format.schema)
    !== JSON.stringify(providerResponseSchema(indexedModelInput))) {
    fail('RESPONSE_SCHEMA_BINDING_MISMATCH', '返答schemaがindexed model inputの契約と一致しません');
  }
}

export function serializeDistantConnectionLunaExactRequestV003(
  value: DistantConnectionLunaExactRequestV003,
  indexedModelInput: DistantConnectionLunaIndexedModelInputV001,
  indexedModelInputBinding: DistantConnectionLunaFormalFileBindingV002
): Buffer {
  assertDistantConnectionLunaExactRequestV003(
    value,
    indexedModelInput,
    indexedModelInputBinding
  );
  return Buffer.from(`${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

export function decodeDistantConnectionLunaExactRequestV003(
  bytes: Uint8Array,
  indexedModelInput: DistantConnectionLunaIndexedModelInputV001,
  indexedModelInputBinding: DistantConnectionLunaFormalFileBindingV002
): DistantConnectionLunaExactRequestV003 {
  let value: unknown;
  try {
    value = JSON.parse(Buffer.from(bytes).toString('utf8'));
  } catch (error) {
    fail('REQUEST_INVALID', 'Luna exact request v003がJSONとして読めません', error);
  }
  assertDistantConnectionLunaExactRequestV003(
    value,
    indexedModelInput,
    indexedModelInputBinding
  );
  if (!serializeDistantConnectionLunaExactRequestV003(
    value,
    indexedModelInput,
    indexedModelInputBinding
  ).equals(Buffer.from(bytes))) {
    fail('REQUEST_INVALID', 'Luna exact request v003が正式byte表現ではありません');
  }
  return value;
}

export function assertDistantConnectionLunaB5LocalManifestV003(
  value: unknown
): asserts value is DistantConnectionLunaB5LocalManifestV003 {
  if (!isRecord(value)
    || !hasExactKeys(value, [
      'schemaVersion',
      'sourcePackageBinding',
      'indexedModelInputBinding',
      'requestBinding',
      'requestSettings',
      'measurementContract',
      'b6ContinuationContract'
    ])
    || value.schemaVersion !== DISTANT_CONNECTION_LUNA_B5_LOCAL_MANIFEST_SCHEMA_V003) {
    fail('MANIFEST_INVALID', 'B5 local manifest v003のroot構造が不正です');
  }
  assertFormalBinding(value.sourcePackageBinding, 'source package binding');
  assertFormalBinding(value.indexedModelInputBinding, 'indexed model input binding');
  assertFormalBinding(value.requestBinding, 'exact request binding');
  assertRequestSettings(value.requestSettings);
  if (value.sourcePackageBinding.schemaVersion
      !== DISTANT_CONNECTION_LUNA_SOURCE_PACKAGE_SCHEMA_V002
    || value.indexedModelInputBinding.schemaVersion
      !== DISTANT_CONNECTION_LUNA_INDEXED_MODEL_INPUT_SCHEMA_V001
    || value.requestBinding.schemaVersion !== DISTANT_CONNECTION_LUNA_REQUEST_SCHEMA_V003
    || !isRecord(value.measurementContract)
    || !hasExactKeys(value.measurementContract, ['schemaVersion', 'jsonSchema'])
    || value.measurementContract.schemaVersion
      !== DISTANT_CONNECTION_LUNA_B5_MEASUREMENT_SCHEMA_V003
    || !isRecord(value.b6ContinuationContract)
    || !hasExactKeys(value.b6ContinuationContract, ['requiredRequestBinding'])) {
    fail('MANIFEST_INVALID', 'B5 local manifest v003のbindingまたは後続契約が不正です');
  }
  assertFormalBinding(
    value.b6ContinuationContract.requiredRequestBinding,
    'B6必須request binding'
  );
  if (JSON.stringify(value.b6ContinuationContract.requiredRequestBinding)
      !== JSON.stringify(value.requestBinding)
    || JSON.stringify(value.measurementContract.jsonSchema)
      !== JSON.stringify(buildMeasurementJsonSchema(
        value.sourcePackageBinding,
        value.indexedModelInputBinding,
        value.requestBinding,
        value.requestSettings
      ))) {
    fail('MANIFEST_INVALID', 'manifestのrequest bindingまたは計測契約が導出値と一致しません');
  }
}

export function serializeDistantConnectionLunaB5LocalManifestV003(
  value: DistantConnectionLunaB5LocalManifestV003
): Buffer {
  assertDistantConnectionLunaB5LocalManifestV003(value);
  return Buffer.from(`${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

export function decodeDistantConnectionLunaB5LocalManifestV003(
  bytes: Uint8Array
): DistantConnectionLunaB5LocalManifestV003 {
  let value: unknown;
  try {
    value = JSON.parse(Buffer.from(bytes).toString('utf8'));
  } catch (error) {
    fail('MANIFEST_INVALID', 'B5 local manifest v003がJSONとして読めません', error);
  }
  assertDistantConnectionLunaB5LocalManifestV003(value);
  if (!serializeDistantConnectionLunaB5LocalManifestV003(value).equals(Buffer.from(bytes))) {
    fail('MANIFEST_INVALID', 'B5 local manifest v003が正式byte表現ではありません');
  }
  return value;
}

export function buildDistantConnectionLunaB5CostAdmissionV003(
  input: BuildDistantConnectionLunaB5CostAdmissionInputV003
): DistantConnectionLunaB5CostAdmissionV003 {
  assertPath(input.priceSnapshotPath, '価格snapshot path');
  if (typeof input.expectedPriceSnapshotSha256 !== 'string'
    || !SHA256.test(input.expectedPriceSnapshotSha256)
    || sha256(input.priceSnapshotBytes) !== input.expectedPriceSnapshotSha256) {
    fail('PRICE_SNAPSHOT_INVALID', '価格snapshotのSHA-256が指定値と一致しません');
  }
  if (!Number.isSafeInteger(input.inputTokens) || input.inputTokens < 0
    || !Number.isSafeInteger(input.maximumNanoUsd) || input.maximumNanoUsd < 0) {
    fail('COST_EVALUATION_INVALID', '入力token数または費用上限が不正です');
  }
  let snapshot: unknown;
  try {
    snapshot = JSON.parse(Buffer.from(input.priceSnapshotBytes).toString('utf8'));
  } catch (error) {
    fail('PRICE_SNAPSHOT_INVALID', '価格snapshotがJSONとして読めません', error);
  }
  if (!isRecord(snapshot)
    || snapshot.recordVersion !== 'openai-gpt-5-6-luna-official-snapshot-v001'
    || !isRecord(snapshot.model)
    || snapshot.model.modelId !== 'gpt-5.6-luna'
    || snapshot.model.contextWindowTokens !== 1_050_000
    || snapshot.model.maxOutputTokens !== 128_000
    || !isRecord(snapshot.standardPricingUsdPerMillionTokens)
    || snapshot.standardPricingUsdPerMillionTokens.input !== 0.2
    || snapshot.standardPricingUsdPerMillionTokens.cachedInput !== 0.02
    || snapshot.standardPricingUsdPerMillionTokens.outputIncludingReasoning !== 1.2
    || snapshot.standardPricingUsdPerMillionTokens.longContextRule
      !== 'Prompts over 272K input tokens are priced at 2x input and 1.5x output for the full request.'
    || snapshot.standardPricingUsdPerMillionTokens.cacheWriteRule
      !== 'Cache writes are billed at 1.25x the uncached input rate.') {
    fail('PRICE_SNAPSHOT_INVALID', '価格snapshotが固定済みLuna仕様と一致しません');
  }

  const longContextPricingApplies = input.inputTokens > 272_000;
  const longInputMultiplier = longContextPricingApplies ? 2 : 1;
  const outputMultiplierNumerator = longContextPricingApplies ? 3 : 2;
  const uncachedInputPriceNanoUsdPerToken = 200;
  const cacheWritePriceNanoUsdPerToken = 250;
  const maximumInputPriceNanoUsdPerToken = Math.max(
    uncachedInputPriceNanoUsdPerToken,
    cacheWritePriceNanoUsdPerToken
  ) * longInputMultiplier;
  const outputPriceNanoUsdPerToken = 1_200 * outputMultiplierNumerator / 2;
  const projectedInputNanoUsd = input.inputTokens * maximumInputPriceNanoUsdPerToken;
  const projectedMaximumOutputNanoUsd = 128_000 * outputPriceNanoUsdPerToken;
  const projectedNanoUsd = projectedInputNanoUsd + projectedMaximumOutputNanoUsd;
  if (![maximumInputPriceNanoUsdPerToken, outputPriceNanoUsdPerToken,
    projectedInputNanoUsd, projectedMaximumOutputNanoUsd, projectedNanoUsd]
    .every(Number.isSafeInteger)) {
    fail('COST_EVALUATION_INVALID', '最大費用投影が安全な整数範囲を超えました');
  }
  const withinContextWindow = input.inputTokens <= 1_050_000;
  const withinMaximumCost = projectedNanoUsd <= input.maximumNanoUsd;
  return {
    inputTokens: input.inputTokens,
    contextWindowTokens: 1_050_000,
    contextUsage: {
      numeratorTokens: input.inputTokens,
      denominatorTokens: 1_050_000
    },
    withinContextWindow,
    longContextPricing: {
      thresholdTokens: 272_000,
      applies: longContextPricingApplies
    },
    maximumOutputTokens: 128_000,
    maximumInputPriceNanoUsdPerToken,
    outputPriceNanoUsdPerToken,
    projectedInputNanoUsd,
    projectedMaximumOutputNanoUsd,
    projectedNanoUsd,
    maximumNanoUsd: input.maximumNanoUsd,
    withinMaximumCost,
    decision: withinContextWindow && withinMaximumCost ? 'passed' : 'stopped',
    priceSnapshotBinding: {
      path: input.priceSnapshotPath,
      schemaVersion: snapshot.recordVersion,
      fileSha256: input.expectedPriceSnapshotSha256
    }
  };
}

export function assertDistantConnectionLunaB5MeasurementV003(
  value: unknown,
  manifest: DistantConnectionLunaB5LocalManifestV003
): asserts value is DistantConnectionLunaB5MeasurementV003 {
  if (!isRecord(value) || !hasExactKeys(value, [
    'schemaVersion',
    'sourcePackageBinding',
    'indexedModelInputBinding',
    'requestBinding',
    'providerId',
    'modelId',
    'tokenMeasurement',
    'costEvaluation'
  ])
    || value.schemaVersion !== DISTANT_CONNECTION_LUNA_B5_MEASUREMENT_SCHEMA_V003
    || value.providerId !== manifest.requestSettings.providerId
    || value.modelId !== manifest.requestSettings.modelId) {
    fail('MEASUREMENT_RESULT_INVALID', 'B5 v003計測成果物のroot構造が不正です');
  }
  assertFormalBinding(
    value.sourcePackageBinding,
    '計測時source package binding',
    'MEASUREMENT_RESULT_INVALID'
  );
  assertFormalBinding(
    value.indexedModelInputBinding,
    '計測時indexed model input binding',
    'MEASUREMENT_RESULT_INVALID'
  );
  assertFormalBinding(
    value.requestBinding,
    '計測時request binding',
    'MEASUREMENT_RESULT_INVALID'
  );
  if (JSON.stringify(value.sourcePackageBinding) !== JSON.stringify(manifest.sourcePackageBinding)
    || JSON.stringify(value.indexedModelInputBinding)
      !== JSON.stringify(manifest.indexedModelInputBinding)
    || JSON.stringify(value.requestBinding) !== JSON.stringify(manifest.requestBinding)
    || !isRecord(value.tokenMeasurement)
    || !hasExactKeys(value.tokenMeasurement, ['rawResponseBinding', 'inputTokens'])
    || !Number.isSafeInteger(value.tokenMeasurement.inputTokens)
    || (value.tokenMeasurement.inputTokens as number) < 0
    || !isRecord(value.costEvaluation)
    || !hasExactKeys(value.costEvaluation, [
      'priceSnapshotBinding', 'maximumNanoUsd', 'projectedNanoUsd', 'decision'
    ])
    || !Number.isSafeInteger(value.costEvaluation.maximumNanoUsd)
    || (value.costEvaluation.maximumNanoUsd as number) < 0
    || !Number.isSafeInteger(value.costEvaluation.projectedNanoUsd)
    || (value.costEvaluation.projectedNanoUsd as number) < 0
    || (value.costEvaluation.decision !== 'passed'
      && value.costEvaluation.decision !== 'stopped')) {
    fail('MEASUREMENT_RESULT_INVALID', 'B5 v003計測値・費用判定・bindingが不正です');
  }
  assertFormalBinding(
    value.tokenMeasurement.rawResponseBinding,
    'token計測raw response binding',
    'MEASUREMENT_RESULT_INVALID'
  );
  assertFormalBinding(
    value.costEvaluation.priceSnapshotBinding,
    '価格snapshot binding',
    'MEASUREMENT_RESULT_INVALID'
  );
  const projectedNanoUsd = value.costEvaluation.projectedNanoUsd as number;
  const maximumNanoUsd = value.costEvaluation.maximumNanoUsd as number;
  if ((projectedNanoUsd <= maximumNanoUsd) !== (value.costEvaluation.decision === 'passed')) {
    fail('MEASUREMENT_RESULT_INVALID', '費用投影と上限判定が一致しません');
  }
}

export function buildDistantConnectionLunaB5MeasurementV003(
  input: BuildDistantConnectionLunaB5MeasurementInputV003
): DistantConnectionLunaB5MeasurementV003 {
  assertPath(input.rawResponsePath, 'token計測raw response path');
  const manifest = decodeDistantConnectionLunaB5LocalManifestV003(input.manifestBytes);
  let raw: unknown;
  try {
    raw = JSON.parse(Buffer.from(input.rawResponseBytes).toString('utf8'));
  } catch (error) {
    fail('MEASUREMENT_RESULT_INVALID', 'token計測raw responseがJSONとして読めません', error);
  }
  if (!isRecord(raw)
    || !hasExactKeys(raw, ['object', 'input_tokens'])
    || raw.object !== 'response.input_tokens'
    || !Number.isSafeInteger(raw.input_tokens)
    || (raw.input_tokens as number) < 0
    || raw.input_tokens !== input.costAdmission.inputTokens) {
    fail('MEASUREMENT_RESULT_INVALID', 'token計測raw responseと費用評価のtoken数が一致しません');
  }
  const measurement: DistantConnectionLunaB5MeasurementV003 = {
    schemaVersion: DISTANT_CONNECTION_LUNA_B5_MEASUREMENT_SCHEMA_V003,
    sourcePackageBinding: structuredClone(manifest.sourcePackageBinding),
    indexedModelInputBinding: structuredClone(manifest.indexedModelInputBinding),
    requestBinding: structuredClone(manifest.requestBinding),
    providerId: manifest.requestSettings.providerId,
    modelId: manifest.requestSettings.modelId,
    tokenMeasurement: {
      rawResponseBinding: {
        path: input.rawResponsePath,
        schemaVersion: 'openai-responses-input-token-count-response-v001',
        fileSha256: sha256(input.rawResponseBytes)
      },
      inputTokens: input.costAdmission.inputTokens
    },
    costEvaluation: {
      priceSnapshotBinding: structuredClone(input.costAdmission.priceSnapshotBinding),
      maximumNanoUsd: input.costAdmission.maximumNanoUsd,
      projectedNanoUsd: input.costAdmission.projectedNanoUsd,
      decision: input.costAdmission.withinMaximumCost ? 'passed' : 'stopped'
    }
  };
  assertDistantConnectionLunaB5MeasurementV003(measurement, manifest);
  return measurement;
}

export function serializeDistantConnectionLunaB5MeasurementV003(
  value: DistantConnectionLunaB5MeasurementV003,
  manifest: DistantConnectionLunaB5LocalManifestV003
): Buffer {
  assertDistantConnectionLunaB5MeasurementV003(value, manifest);
  return Buffer.from(`${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

export function decodeDistantConnectionLunaB5MeasurementV003(
  bytes: Uint8Array,
  manifest: DistantConnectionLunaB5LocalManifestV003
): DistantConnectionLunaB5MeasurementV003 {
  let value: unknown;
  try {
    value = JSON.parse(Buffer.from(bytes).toString('utf8'));
  } catch (error) {
    fail('MEASUREMENT_RESULT_INVALID', 'B5 v003計測成果物がJSONとして読めません', error);
  }
  assertDistantConnectionLunaB5MeasurementV003(value, manifest);
  if (!serializeDistantConnectionLunaB5MeasurementV003(value, manifest)
    .equals(Buffer.from(bytes))) {
    fail('MEASUREMENT_RESULT_INVALID', 'B5 v003計測成果物が正式byte表現ではありません');
  }
  return value;
}

export function validateDistantConnectionLunaB5LocalArtifactsV003(
  artifacts: {
    request: unknown;
    requestBytes: Uint8Array;
    manifest: unknown;
    manifestBytes: Uint8Array;
  },
  input: BuildDistantConnectionLunaB5LocalInputV003
): void {
  decodeBoundSourcePackage(input);
  const indexedModelInput = decodeBoundIndexedModelInput(input);
  assertDistantConnectionLunaExactRequestV003(
    artifacts.request,
    indexedModelInput,
    input.indexedModelInputBinding
  );
  assertDistantConnectionLunaB5LocalManifestV003(artifacts.manifest);
  const rebuilt = buildDistantConnectionLunaB5LocalArtifactsFromBytesV003(input);
  if (!Buffer.from(artifacts.requestBytes).equals(rebuilt.requestBytes)
    || !Buffer.from(artifacts.manifestBytes).equals(rebuilt.manifestBytes)
    || !serializeDistantConnectionLunaExactRequestV003(
      artifacts.request as DistantConnectionLunaExactRequestV003,
      indexedModelInput,
      input.indexedModelInputBinding
    ).equals(rebuilt.requestBytes)
    || !serializeDistantConnectionLunaB5LocalManifestV003(
      artifacts.manifest as DistantConnectionLunaB5LocalManifestV003
    ).equals(rebuilt.manifestBytes)) {
    fail(
      'REQUEST_BINDING_MISMATCH',
      'B5 local成果物がsource packageとindexed model inputからの決定的再構築結果と一致しません'
    );
  }
}

export function assertDistantConnectionLunaB6RequestBindingV003(
  b6RequestBinding: unknown,
  b6IndexedModelInputBinding: unknown,
  manifestBytes: Uint8Array,
  requestBytes: Uint8Array,
  indexedModelInputBytes: Uint8Array
): void {
  const manifest = decodeDistantConnectionLunaB5LocalManifestV003(manifestBytes);
  assertFormalBinding(
    b6RequestBinding,
    'B6 request binding',
    'B6_REQUEST_BINDING_MISMATCH'
  );
  assertFormalBinding(
    b6IndexedModelInputBinding,
    'B6 indexed model input binding',
    'B6_REQUEST_BINDING_MISMATCH'
  );
  if (JSON.stringify(b6RequestBinding)
      !== JSON.stringify(manifest.b6ContinuationContract.requiredRequestBinding)
    || b6RequestBinding.fileSha256 !== sha256(requestBytes)
    || JSON.stringify(b6IndexedModelInputBinding)
      !== JSON.stringify(manifest.indexedModelInputBinding)
    || b6IndexedModelInputBinding.fileSha256 !== sha256(indexedModelInputBytes)) {
    fail(
      'B6_REQUEST_BINDING_MISMATCH',
      'B6が参照するrequestまたはindexed model inputはB5 v003の正式byteと一致しません'
    );
  }
  let indexedModelInput: DistantConnectionLunaIndexedModelInputV001;
  try {
    indexedModelInput = decodeDistantConnectionLunaIndexedModelInputV001(
      indexedModelInputBytes
    );
    decodeDistantConnectionLunaExactRequestV003(
      requestBytes,
      indexedModelInput,
      manifest.indexedModelInputBinding
    );
  } catch (error) {
    fail(
      'B6_REQUEST_BINDING_MISMATCH',
      'B6 request本文とindexed model input本文のexact一致を確認できません',
      error
    );
  }
}

export async function writeDistantConnectionLunaB5LocalArtifactsV003(
  input: WriteDistantConnectionLunaB5LocalArtifactsInputV003
): Promise<ReturnType<typeof buildDistantConnectionLunaB5LocalArtifactsFromBytesV003>> {
  assertPath(input.manifestPath, 'B5 local manifest path');
  if (input.requestPath === input.manifestPath) {
    fail('MANIFEST_INVALID', 'exact requestとmanifestは別pathである必要があります');
  }
  const artifacts = await buildDistantConnectionLunaB5LocalArtifactsFromFileV003(input);
  const requestAbsolute = path.join(input.workspaceRoot, input.requestPath);
  const manifestAbsolute = path.join(input.workspaceRoot, input.manifestPath);
  await mkdir(path.dirname(requestAbsolute), {recursive: true});
  await mkdir(path.dirname(manifestAbsolute), {recursive: true});
  await writeFile(requestAbsolute, artifacts.requestBytes, {flag: 'wx'});
  await writeFile(manifestAbsolute, artifacts.manifestBytes, {flag: 'wx'});
  return artifacts;
}
