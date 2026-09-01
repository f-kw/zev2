import {createHash} from 'node:crypto';

import {
  DISTANT_CONNECTION_COMPARISON_B5_LOCAL_MANIFEST_SCHEMA_V001,
  DISTANT_CONNECTION_COMPARISON_EXACT_REQUEST_SCHEMA_V001,
  DISTANT_CONNECTION_COMPARISON_INDEXED_MODEL_INPUT_SCHEMA_V001,
  buildDistantConnectionComparisonB5LocalArtifactsV001,
  decodeDistantConnectionComparisonB5LocalManifestV001,
  type DistantConnectionComparisonB5LocalManifestV001,
  type DistantConnectionComparisonExactRequestV001,
  type DistantConnectionComparisonFormalBindingV001
} from './distant-connection-comparison-luna-b5-local-v001.js';

export const DISTANT_CONNECTION_COMPARISON_TOKEN_COUNT_REQUEST_SCHEMA_V001 =
  'openai-responses-input-token-count-request-v001';
export const DISTANT_CONNECTION_COMPARISON_TOKEN_COUNT_RESPONSE_SCHEMA_V001 =
  'openai-responses-input-token-count-response-v001';
export const DISTANT_CONNECTION_COMPARISON_TOKEN_COUNT_MEASUREMENT_SCHEMA_V001 =
  'distant-connection-comparison-luna-b5-token-count-measurement-v001';

export const DISTANT_CONNECTION_COMPARISON_TOKEN_COUNT_ERROR_CODES_V001 = Object.freeze([
  'PATH_INVALID',
  'B5_BINDING_MISMATCH',
  'TOKEN_COUNT_REQUEST_INVALID',
  'TOKEN_COUNT_RESPONSE_INVALID',
  'PRICE_SNAPSHOT_INVALID',
  'MEASUREMENT_INVALID'
] as const);

export type DistantConnectionComparisonTokenCountErrorCodeV001 =
  typeof DISTANT_CONNECTION_COMPARISON_TOKEN_COUNT_ERROR_CODES_V001[number];

export class DistantConnectionComparisonTokenCountErrorV001 extends Error {
  readonly code: DistantConnectionComparisonTokenCountErrorCodeV001;

  constructor(
    code: DistantConnectionComparisonTokenCountErrorCodeV001,
    message: string,
    options?: ErrorOptions
  ) {
    super(message, options);
    this.name = 'DistantConnectionComparisonTokenCountErrorV001';
    this.code = code;
  }
}

export type DistantConnectionComparisonTokenCountRequestV001 = Omit<
  DistantConnectionComparisonExactRequestV001,
  'store'
>;

export type DistantConnectionComparisonTokenCountMeasurementV001 = {
  schemaVersion: typeof DISTANT_CONNECTION_COMPARISON_TOKEN_COUNT_MEASUREMENT_SCHEMA_V001;
  sourcePackageBinding: DistantConnectionComparisonFormalBindingV001;
  indexedModelInputBinding: DistantConnectionComparisonFormalBindingV001;
  exactRequestBinding: DistantConnectionComparisonFormalBindingV001;
  b5LocalManifestBinding: DistantConnectionComparisonFormalBindingV001;
  tokenCountRequestBinding: DistantConnectionComparisonFormalBindingV001;
  rawResponseBinding: DistantConnectionComparisonFormalBindingV001;
  priceSnapshotBinding: DistantConnectionComparisonFormalBindingV001;
  requestSettings: DistantConnectionComparisonB5LocalManifestV001['requestSettings'];
  tokenMeasurement: {
    inputTokens: number;
    contextWindowTokens: 1_050_000;
    contextUsage: {
      numeratorTokens: number;
      denominatorTokens: 1_050_000;
      percent: number;
    };
    remainingTokens: number;
    withinContextWindow: boolean;
    longContextPricing: {
      thresholdTokens: 272_000;
      applies: boolean;
    };
  };
  maximumB6CostProjection: {
    basis: 'all-input-as-cache-write-plus-full-model-output';
    maximumOutputTokens: 128_000;
    inputPriceNanoUsdPerToken: number;
    outputPriceNanoUsdPerToken: number;
    projectedInputNanoUsd: number;
    projectedMaximumOutputNanoUsd: number;
    projectedTotalNanoUsd: number;
  };
  executionScope: {
    tokenCountApiCalls: 1;
    candidateGenerationApiCalls: 0;
  };
};

export type BuildDistantConnectionComparisonTokenCountMeasurementInputV001 = {
  manifestPath: string;
  manifestBytes: Uint8Array;
  sourcePackageBytes: Uint8Array;
  indexedModelInputBytes: Uint8Array;
  exactRequestBytes: Uint8Array;
  tokenCountRequestPath: string;
  tokenCountRequestBytes: Uint8Array;
  rawResponsePath: string;
  rawResponseBytes: Uint8Array;
  priceSnapshotPath: string;
  priceSnapshotBytes: Uint8Array;
  expectedPriceSnapshotSha256: string;
};

export type DistantConnectionComparisonTokenCountArtifactSetV001 =
  BuildDistantConnectionComparisonTokenCountMeasurementInputV001 & {
    measurement: DistantConnectionComparisonTokenCountMeasurementV001;
  };

type RecordValue = Record<string, unknown>;

const SHA256 = /^[0-9a-f]{64}$/u;
const FORMAL_ID = /^[A-Za-z0-9][A-Za-z0-9._-]*$/u;
const WORKSPACE_RELATIVE_PATH =
  /^(?!\/)(?!\.\/)(?!.*(?:^|\/)\.\.(?:\/|$))(?!.*\\)(?!.*\/\/)[^\0]+$/u;
const TOKEN_COUNT_REQUEST_KEYS = ['model', 'instructions', 'input', 'reasoning', 'text'] as const;

function fail(
  code: DistantConnectionComparisonTokenCountErrorCodeV001,
  message: string,
  cause?: unknown
): never {
  throw new DistantConnectionComparisonTokenCountErrorV001(
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

function assertPath(value: unknown, label: string): asserts value is string {
  if (typeof value !== 'string' || !WORKSPACE_RELATIVE_PATH.test(value)) {
    fail('PATH_INVALID', `${label}はworkspace相対pathである必要があります`);
  }
}

function assertBinding(
  value: unknown,
  label: string
): asserts value is DistantConnectionComparisonFormalBindingV001 {
  if (!isRecord(value)
    || !hasExactKeys(value, ['path', 'schemaVersion', 'fileSha256'])
    || typeof value.path !== 'string'
    || !WORKSPACE_RELATIVE_PATH.test(value.path)
    || typeof value.schemaVersion !== 'string'
    || !FORMAL_ID.test(value.schemaVersion)
    || typeof value.fileSha256 !== 'string'
    || !SHA256.test(value.fileSha256)) {
    fail('MEASUREMENT_INVALID', `${label}が不正です`);
  }
}

function binding(
  path: string,
  schemaVersion: string,
  bytes: Uint8Array
): DistantConnectionComparisonFormalBindingV001 {
  assertPath(path, '成果物path');
  if (!FORMAL_ID.test(schemaVersion)) {
    fail('MEASUREMENT_INVALID', '成果物schema versionが不正です');
  }
  return {path, schemaVersion, fileSha256: sha256(bytes)};
}

function assertFixedB5Chain(input: {
  manifestBytes: Uint8Array;
  sourcePackageBytes: Uint8Array;
  indexedModelInputBytes: Uint8Array;
  exactRequestBytes: Uint8Array;
}): {
  manifest: DistantConnectionComparisonB5LocalManifestV001;
  exactRequest: DistantConnectionComparisonExactRequestV001;
} {
  let manifest: DistantConnectionComparisonB5LocalManifestV001;
  try {
    manifest = decodeDistantConnectionComparisonB5LocalManifestV001(input.manifestBytes);
  } catch (error) {
    fail('B5_BINDING_MISMATCH', '比較用B5 manifestを正式byteとして読めません', error);
  }
  if (manifest.schemaVersion !== DISTANT_CONNECTION_COMPARISON_B5_LOCAL_MANIFEST_SCHEMA_V001
    || sha256(input.sourcePackageBytes) !== manifest.sourcePackageBinding.fileSha256
    || sha256(input.indexedModelInputBytes) !== manifest.indexedModelInputBinding.fileSha256
    || sha256(input.exactRequestBytes) !== manifest.requestBinding.fileSha256) {
    fail('B5_BINDING_MISMATCH', 'source package・index入力・exact requestのSHA bindingが不一致です');
  }

  let rebuilt: ReturnType<typeof buildDistantConnectionComparisonB5LocalArtifactsV001>;
  try {
    rebuilt = buildDistantConnectionComparisonB5LocalArtifactsV001({
      sourcePackageBinding: manifest.sourcePackageBinding,
      sourcePackageBytes: input.sourcePackageBytes,
      indexedModelInputBinding: manifest.indexedModelInputBinding,
      indexedModelInputBytes: input.indexedModelInputBytes,
      requestPath: manifest.requestBinding.path,
      requestSettings: manifest.requestSettings
    });
  } catch (error) {
    fail('B5_BINDING_MISMATCH', '比較用B5の決定的再構築に失敗しました', error);
  }
  if (!rebuilt.requestBytes.equals(Buffer.from(input.exactRequestBytes))
    || !rebuilt.manifestBytes.equals(Buffer.from(input.manifestBytes))
    || JSON.stringify(manifest.b6ContinuationContract.requiredRequestBinding)
      !== JSON.stringify(manifest.requestBinding)) {
    fail('B5_BINDING_MISMATCH', 'B5 local manifestとB6継続requestの決定的bindingが不一致です');
  }
  return {manifest, exactRequest: rebuilt.request};
}

export function buildDistantConnectionComparisonTokenCountRequestV001(
  input: {
    manifestBytes: Uint8Array;
    sourcePackageBytes: Uint8Array;
    indexedModelInputBytes: Uint8Array;
    exactRequestBytes: Uint8Array;
  }
): DistantConnectionComparisonTokenCountRequestV001 {
  const {exactRequest} = assertFixedB5Chain(input);
  const request: DistantConnectionComparisonTokenCountRequestV001 = {
    model: exactRequest.model,
    instructions: exactRequest.instructions,
    input: exactRequest.input,
    reasoning: structuredClone(exactRequest.reasoning),
    text: structuredClone(exactRequest.text)
  };
  assertDistantConnectionComparisonTokenCountRequestV001(request, exactRequest);
  return request;
}

export function assertDistantConnectionComparisonTokenCountRequestV001(
  value: unknown,
  exactRequest: DistantConnectionComparisonExactRequestV001
): asserts value is DistantConnectionComparisonTokenCountRequestV001 {
  if (!isRecord(value) || !hasExactKeys(value, TOKEN_COUNT_REQUEST_KEYS)) {
    fail('TOKEN_COUNT_REQUEST_INVALID', 'token計測requestのroot構造が不正です');
  }
  const expected = {
    model: exactRequest.model,
    instructions: exactRequest.instructions,
    input: exactRequest.input,
    reasoning: exactRequest.reasoning,
    text: exactRequest.text
  };
  if (JSON.stringify(value) !== JSON.stringify(expected)) {
    fail('TOKEN_COUNT_REQUEST_INVALID', 'token計測requestがexact requestのtoken中立射影ではありません');
  }
}

export function serializeDistantConnectionComparisonTokenCountRequestV001(
  value: DistantConnectionComparisonTokenCountRequestV001,
  exactRequest: DistantConnectionComparisonExactRequestV001
): Buffer {
  assertDistantConnectionComparisonTokenCountRequestV001(value, exactRequest);
  return Buffer.from(`${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

export function decodeDistantConnectionComparisonTokenCountRequestV001(
  bytes: Uint8Array,
  exactRequest: DistantConnectionComparisonExactRequestV001
): DistantConnectionComparisonTokenCountRequestV001 {
  let value: unknown;
  try {
    value = JSON.parse(Buffer.from(bytes).toString('utf8'));
  } catch (error) {
    fail('TOKEN_COUNT_REQUEST_INVALID', 'token計測requestがJSONとして読めません', error);
  }
  assertDistantConnectionComparisonTokenCountRequestV001(value, exactRequest);
  if (!serializeDistantConnectionComparisonTokenCountRequestV001(value, exactRequest)
    .equals(Buffer.from(bytes))) {
    fail('TOKEN_COUNT_REQUEST_INVALID', 'token計測requestがcanonical formal byteではありません');
  }
  return value;
}

function readInputTokens(rawResponseBytes: Uint8Array): number {
  let raw: unknown;
  try {
    raw = JSON.parse(Buffer.from(rawResponseBytes).toString('utf8'));
  } catch (error) {
    fail('TOKEN_COUNT_RESPONSE_INVALID', 'token計測raw responseがJSONとして読めません', error);
  }
  if (!isRecord(raw)
    || !hasExactKeys(raw, ['object', 'input_tokens'])
    || raw.object !== 'response.input_tokens'
    || !Number.isSafeInteger(raw.input_tokens)
    || (raw.input_tokens as number) < 0) {
    fail('TOKEN_COUNT_RESPONSE_INVALID', 'token計測raw responseの構造または値が不正です');
  }
  return raw.input_tokens as number;
}

function validatePriceSnapshot(
  bytes: Uint8Array,
  expectedSha256: string
): string {
  if (!SHA256.test(expectedSha256) || sha256(bytes) !== expectedSha256) {
    fail('PRICE_SNAPSHOT_INVALID', '保存済み公式価格snapshotのSHA-256が一致しません');
  }
  let value: unknown;
  try {
    value = JSON.parse(Buffer.from(bytes).toString('utf8'));
  } catch (error) {
    fail('PRICE_SNAPSHOT_INVALID', '保存済み公式価格snapshotがJSONとして読めません', error);
  }
  if (!isRecord(value)
    || value.recordVersion !== 'openai-gpt-5-6-luna-official-snapshot-v001'
    || !isRecord(value.model)
    || value.model.modelId !== 'gpt-5.6-luna'
    || value.model.contextWindowTokens !== 1_050_000
    || value.model.maxOutputTokens !== 128_000
    || !isRecord(value.standardPricingUsdPerMillionTokens)
    || value.standardPricingUsdPerMillionTokens.input !== 0.2
    || value.standardPricingUsdPerMillionTokens.cachedInput !== 0.02
    || value.standardPricingUsdPerMillionTokens.outputIncludingReasoning !== 1.2
    || value.standardPricingUsdPerMillionTokens.longContextRule
      !== 'Prompts over 272K input tokens are priced at 2x input and 1.5x output for the full request.'
    || value.standardPricingUsdPerMillionTokens.cacheWriteRule
      !== 'Cache writes are billed at 1.25x the uncached input rate.') {
    fail('PRICE_SNAPSHOT_INVALID', '保存済み公式価格snapshotが固定済みLuna仕様と一致しません');
  }
  return value.recordVersion as string;
}

export function buildDistantConnectionComparisonTokenCountMeasurementV001(
  input: BuildDistantConnectionComparisonTokenCountMeasurementInputV001
): DistantConnectionComparisonTokenCountMeasurementV001 {
  assertPath(input.manifestPath, 'B5 manifest path');
  assertPath(input.tokenCountRequestPath, 'token計測request path');
  assertPath(input.rawResponsePath, 'token計測raw response path');
  assertPath(input.priceSnapshotPath, '価格snapshot path');

  const {manifest, exactRequest} = assertFixedB5Chain(input);
  decodeDistantConnectionComparisonTokenCountRequestV001(
    input.tokenCountRequestBytes,
    exactRequest
  );
  const inputTokens = readInputTokens(input.rawResponseBytes);
  const priceSnapshotSchema = validatePriceSnapshot(
    input.priceSnapshotBytes,
    input.expectedPriceSnapshotSha256
  );
  const longContextPricingApplies = inputTokens > 272_000;
  const inputPriceNanoUsdPerToken = (longContextPricingApplies ? 2 : 1) * 250;
  const outputPriceNanoUsdPerToken = longContextPricingApplies ? 1_800 : 1_200;
  const projectedInputNanoUsd = inputTokens * inputPriceNanoUsdPerToken;
  const projectedMaximumOutputNanoUsd = 128_000 * outputPriceNanoUsdPerToken;
  const projectedTotalNanoUsd = projectedInputNanoUsd + projectedMaximumOutputNanoUsd;
  if (![projectedInputNanoUsd, projectedMaximumOutputNanoUsd, projectedTotalNanoUsd]
    .every(Number.isSafeInteger)) {
    fail('MEASUREMENT_INVALID', '最大費用投影が安全な整数範囲を超えました');
  }

  const measurement: DistantConnectionComparisonTokenCountMeasurementV001 = {
    schemaVersion: DISTANT_CONNECTION_COMPARISON_TOKEN_COUNT_MEASUREMENT_SCHEMA_V001,
    sourcePackageBinding: structuredClone(manifest.sourcePackageBinding),
    indexedModelInputBinding: structuredClone(manifest.indexedModelInputBinding),
    exactRequestBinding: structuredClone(manifest.requestBinding),
    b5LocalManifestBinding: binding(
      input.manifestPath,
      DISTANT_CONNECTION_COMPARISON_B5_LOCAL_MANIFEST_SCHEMA_V001,
      input.manifestBytes
    ),
    tokenCountRequestBinding: binding(
      input.tokenCountRequestPath,
      DISTANT_CONNECTION_COMPARISON_TOKEN_COUNT_REQUEST_SCHEMA_V001,
      input.tokenCountRequestBytes
    ),
    rawResponseBinding: binding(
      input.rawResponsePath,
      DISTANT_CONNECTION_COMPARISON_TOKEN_COUNT_RESPONSE_SCHEMA_V001,
      input.rawResponseBytes
    ),
    priceSnapshotBinding: binding(
      input.priceSnapshotPath,
      priceSnapshotSchema,
      input.priceSnapshotBytes
    ),
    requestSettings: structuredClone(manifest.requestSettings),
    tokenMeasurement: {
      inputTokens,
      contextWindowTokens: 1_050_000,
      contextUsage: {
        numeratorTokens: inputTokens,
        denominatorTokens: 1_050_000,
        percent: inputTokens / 1_050_000 * 100
      },
      remainingTokens: 1_050_000 - inputTokens,
      withinContextWindow: inputTokens <= 1_050_000,
      longContextPricing: {
        thresholdTokens: 272_000,
        applies: longContextPricingApplies
      }
    },
    maximumB6CostProjection: {
      basis: 'all-input-as-cache-write-plus-full-model-output',
      maximumOutputTokens: 128_000,
      inputPriceNanoUsdPerToken,
      outputPriceNanoUsdPerToken,
      projectedInputNanoUsd,
      projectedMaximumOutputNanoUsd,
      projectedTotalNanoUsd
    },
    executionScope: {
      tokenCountApiCalls: 1,
      candidateGenerationApiCalls: 0
    }
  };
  assertDistantConnectionComparisonTokenCountMeasurementV001(measurement, manifest);
  assertDistantConnectionComparisonTokenCountInputSchemasV001(measurement);
  return measurement;
}

export function assertDistantConnectionComparisonTokenCountMeasurementV001(
  value: unknown,
  manifest: DistantConnectionComparisonB5LocalManifestV001
): asserts value is DistantConnectionComparisonTokenCountMeasurementV001 {
  if (!isRecord(value) || !hasExactKeys(value, [
    'schemaVersion',
    'sourcePackageBinding',
    'indexedModelInputBinding',
    'exactRequestBinding',
    'b5LocalManifestBinding',
    'tokenCountRequestBinding',
    'rawResponseBinding',
    'priceSnapshotBinding',
    'requestSettings',
    'tokenMeasurement',
    'maximumB6CostProjection',
    'executionScope'
  ])
    || value.schemaVersion
      !== DISTANT_CONNECTION_COMPARISON_TOKEN_COUNT_MEASUREMENT_SCHEMA_V001) {
    fail('MEASUREMENT_INVALID', 'token計測成果物のroot構造または版が不正です');
  }
  for (const [label, candidate] of [
    ['source package binding', value.sourcePackageBinding],
    ['indexed model input binding', value.indexedModelInputBinding],
    ['exact request binding', value.exactRequestBinding],
    ['B5 manifest binding', value.b5LocalManifestBinding],
    ['token計測request binding', value.tokenCountRequestBinding],
    ['raw response binding', value.rawResponseBinding],
    ['価格snapshot binding', value.priceSnapshotBinding]
  ] as const) {
    assertBinding(candidate, label);
  }
  if (JSON.stringify(value.sourcePackageBinding) !== JSON.stringify(manifest.sourcePackageBinding)
    || JSON.stringify(value.indexedModelInputBinding)
      !== JSON.stringify(manifest.indexedModelInputBinding)
    || JSON.stringify(value.exactRequestBinding) !== JSON.stringify(manifest.requestBinding)
    || JSON.stringify(value.requestSettings) !== JSON.stringify(manifest.requestSettings)
    || !isRecord(value.tokenMeasurement)
    || !hasExactKeys(value.tokenMeasurement, [
      'inputTokens',
      'contextWindowTokens',
      'contextUsage',
      'remainingTokens',
      'withinContextWindow',
      'longContextPricing'
    ])
    || !Number.isSafeInteger(value.tokenMeasurement.inputTokens)
    || (value.tokenMeasurement.inputTokens as number) < 0
    || value.tokenMeasurement.contextWindowTokens !== 1_050_000
    || !isRecord(value.tokenMeasurement.contextUsage)
    || !hasExactKeys(value.tokenMeasurement.contextUsage, [
      'numeratorTokens', 'denominatorTokens', 'percent'
    ])
    || value.tokenMeasurement.contextUsage.numeratorTokens
      !== value.tokenMeasurement.inputTokens
    || value.tokenMeasurement.contextUsage.denominatorTokens !== 1_050_000
    || value.tokenMeasurement.contextUsage.percent
      !== (value.tokenMeasurement.inputTokens as number) / 1_050_000 * 100
    || value.tokenMeasurement.remainingTokens
      !== 1_050_000 - (value.tokenMeasurement.inputTokens as number)
    || value.tokenMeasurement.withinContextWindow
      !== ((value.tokenMeasurement.inputTokens as number) <= 1_050_000)
    || !isRecord(value.tokenMeasurement.longContextPricing)
    || !hasExactKeys(value.tokenMeasurement.longContextPricing, [
      'thresholdTokens', 'applies'
    ])
    || value.tokenMeasurement.longContextPricing.thresholdTokens !== 272_000
    || value.tokenMeasurement.longContextPricing.applies
      !== ((value.tokenMeasurement.inputTokens as number) > 272_000)) {
    fail('MEASUREMENT_INVALID', 'token数・context使用率・長文料金判定が不整合です');
  }
  const inputTokens = value.tokenMeasurement.inputTokens as number;
  const longContextPricingApplies = inputTokens > 272_000;
  const inputPriceNanoUsdPerToken = (longContextPricingApplies ? 2 : 1) * 250;
  const outputPriceNanoUsdPerToken = longContextPricingApplies ? 1_800 : 1_200;
  const projectedInputNanoUsd = inputTokens * inputPriceNanoUsdPerToken;
  const projectedMaximumOutputNanoUsd = 128_000 * outputPriceNanoUsdPerToken;
  if (!isRecord(value.maximumB6CostProjection)
    || !hasExactKeys(value.maximumB6CostProjection, [
      'basis',
      'maximumOutputTokens',
      'inputPriceNanoUsdPerToken',
      'outputPriceNanoUsdPerToken',
      'projectedInputNanoUsd',
      'projectedMaximumOutputNanoUsd',
      'projectedTotalNanoUsd'
    ])
    || value.maximumB6CostProjection.basis
      !== 'all-input-as-cache-write-plus-full-model-output'
    || value.maximumB6CostProjection.maximumOutputTokens !== 128_000
    || value.maximumB6CostProjection.inputPriceNanoUsdPerToken
      !== inputPriceNanoUsdPerToken
    || value.maximumB6CostProjection.outputPriceNanoUsdPerToken
      !== outputPriceNanoUsdPerToken
    || value.maximumB6CostProjection.projectedInputNanoUsd !== projectedInputNanoUsd
    || value.maximumB6CostProjection.projectedMaximumOutputNanoUsd
      !== projectedMaximumOutputNanoUsd
    || value.maximumB6CostProjection.projectedTotalNanoUsd
      !== projectedInputNanoUsd + projectedMaximumOutputNanoUsd
    || !isRecord(value.executionScope)
    || !hasExactKeys(value.executionScope, [
      'tokenCountApiCalls', 'candidateGenerationApiCalls'
    ])
    || value.executionScope.tokenCountApiCalls !== 1
    || value.executionScope.candidateGenerationApiCalls !== 0) {
    fail('MEASUREMENT_INVALID', '最大費用投影または実行範囲が不整合です');
  }
}

export function serializeDistantConnectionComparisonTokenCountMeasurementV001(
  value: DistantConnectionComparisonTokenCountMeasurementV001,
  manifest: DistantConnectionComparisonB5LocalManifestV001
): Buffer {
  assertDistantConnectionComparisonTokenCountMeasurementV001(value, manifest);
  assertDistantConnectionComparisonTokenCountInputSchemasV001(value);
  return Buffer.from(`${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

export function decodeDistantConnectionComparisonTokenCountMeasurementV001(
  bytes: Uint8Array,
  manifestBytes: Uint8Array
): DistantConnectionComparisonTokenCountMeasurementV001 {
  const manifest = decodeDistantConnectionComparisonB5LocalManifestV001(manifestBytes);
  let value: unknown;
  try {
    value = JSON.parse(Buffer.from(bytes).toString('utf8'));
  } catch (error) {
    fail('MEASUREMENT_INVALID', 'token計測成果物がJSONとして読めません', error);
  }
  assertDistantConnectionComparisonTokenCountMeasurementV001(value, manifest);
  assertDistantConnectionComparisonTokenCountInputSchemasV001(value);
  if (!serializeDistantConnectionComparisonTokenCountMeasurementV001(value, manifest)
    .equals(Buffer.from(bytes))) {
    fail('MEASUREMENT_INVALID', 'token計測成果物がcanonical formal byteではありません');
  }
  return value;
}

export function assertDistantConnectionComparisonTokenCountArtifactSetV001(
  input: DistantConnectionComparisonTokenCountArtifactSetV001
): void {
  const rebuilt = buildDistantConnectionComparisonTokenCountMeasurementV001(input);
  if (JSON.stringify(input.measurement) !== JSON.stringify(rebuilt)) {
    fail(
      'MEASUREMENT_INVALID',
      'token計測成果物がsource・request・raw response・価格snapshotの実byteと一致しません'
    );
  }
}

export function assertDistantConnectionComparisonB6UsesMeasuredRequestV001(
  measurement: DistantConnectionComparisonTokenCountMeasurementV001,
  requestPath: string,
  requestBytes: Uint8Array
): void {
  assertPath(requestPath, 'B6 request path');
  assertDistantConnectionComparisonTokenCountInputSchemasV001(measurement);
  if (!measurement.tokenMeasurement.withinContextWindow) {
    fail('MEASUREMENT_INVALID', 'token計測済みrequestがLunaのcontext上限を超えています');
  }
  if (measurement.exactRequestBinding.path !== requestPath
    || measurement.exactRequestBinding.schemaVersion
      !== DISTANT_CONNECTION_COMPARISON_EXACT_REQUEST_SCHEMA_V001
    || measurement.exactRequestBinding.fileSha256 !== sha256(requestBytes)) {
    fail('B5_BINDING_MISMATCH', 'B6 requestがtoken計測済みexact requestと一致しません');
  }
}

export function assertDistantConnectionComparisonTokenCountInputSchemasV001(
  measurement: DistantConnectionComparisonTokenCountMeasurementV001
): void {
  if (measurement.sourcePackageBinding.schemaVersion
      !== 'distant-connection-comparison-source-package-v001'
    || measurement.indexedModelInputBinding.schemaVersion
      !== DISTANT_CONNECTION_COMPARISON_INDEXED_MODEL_INPUT_SCHEMA_V001
    || measurement.exactRequestBinding.schemaVersion
      !== DISTANT_CONNECTION_COMPARISON_EXACT_REQUEST_SCHEMA_V001
    || measurement.b5LocalManifestBinding.schemaVersion
      !== DISTANT_CONNECTION_COMPARISON_B5_LOCAL_MANIFEST_SCHEMA_V001) {
    fail('MEASUREMENT_INVALID', 'token計測成果物の上流schema bindingが不正です');
  }
}
