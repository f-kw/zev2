import {createHash} from 'node:crypto';

import {
  DISTANT_CONNECTION_LUNA_B5_LOCAL_MANIFEST_SCHEMA_V002,
  DISTANT_CONNECTION_LUNA_REQUEST_SCHEMA_V002,
  assertDistantConnectionLunaB6RequestBindingV002,
  assertDistantConnectionLunaExactRequestV002,
  decodeDistantConnectionLunaB5LocalManifestV002
} from './distant-connection-luna-b5-local-v002.js';
import {
  DISTANT_CONNECTION_LUNA_SOURCE_PACKAGE_SCHEMA_V002,
  decodeDistantConnectionLunaSourcePackageV002,
  validateDistantConnectionLunaResponseV002,
  type DistantConnectionLunaFormalFileBindingV002,
  type DistantConnectionLunaResponseV002
} from './distant-connection-luna-source-package-v002.js';
import {
  DISTANT_CONNECTION_LUNA_RESPONSE_SCHEMA_V001
} from './distant-connection-luna-source-package-v001.js';

export const DISTANT_CONNECTION_LUNA_B6_RUN_MANIFEST_SCHEMA_V002 =
  'distant-connection-luna-b6-run-manifest-v002';

export const DISTANT_CONNECTION_LUNA_B6_ERROR_CODES_V002 = Object.freeze([
  'B6_BINDING_MISMATCH',
  'B6_RAW_RESPONSE_INVALID',
  'B6_RESPONSE_INCOMPLETE',
  'B6_REFUSAL',
  'B6_USAGE_INVALID',
  'B6_PRICE_SNAPSHOT_INVALID',
  'B6_COST_LIMIT_EXCEEDED'
] as const);

export type DistantConnectionLunaB6ErrorCodeV002 =
  typeof DISTANT_CONNECTION_LUNA_B6_ERROR_CODES_V002[number];

export class DistantConnectionLunaB6ResultErrorV002 extends Error {
  readonly code: DistantConnectionLunaB6ErrorCodeV002;

  constructor(code: DistantConnectionLunaB6ErrorCodeV002, message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'DistantConnectionLunaB6ResultErrorV002';
    this.code = code;
  }
}

type UsageV002 = {
  inputTokens: number;
  cachedInputTokens: number;
  cacheWriteTokens: number;
  uncachedNonWriteInputTokens: number;
  outputTokens: number;
  reasoningTokens: number;
  totalTokens: number;
};

export type DistantConnectionLunaB6RunManifestV002 = {
  schemaVersion: typeof DISTANT_CONNECTION_LUNA_B6_RUN_MANIFEST_SCHEMA_V002;
  sourcePackageBinding: DistantConnectionLunaFormalFileBindingV002;
  requestBinding: DistantConnectionLunaFormalFileBindingV002;
  b5LocalManifestBinding: DistantConnectionLunaFormalFileBindingV002;
  rawResponseBinding: DistantConnectionLunaFormalFileBindingV002;
  candidateResponseBinding: DistantConnectionLunaFormalFileBindingV002;
  providerResponse: {
    id: string;
    model: 'gpt-5.6-luna';
    status: 'completed';
  };
  usage: UsageV002;
  cost: {
    priceSnapshotBinding: DistantConnectionLunaFormalFileBindingV002;
    inputNanoUsd: number;
    cachedInputNanoUsd: number;
    cacheWriteNanoUsd: number;
    outputNanoUsd: number;
    totalNanoUsd: number;
    totalUsd: number;
    maximumNanoUsd: number;
    withinMaximum: true;
  };
  validation: {
    decision: 'passed';
    candidateCount: number;
  };
};

export type BuildDistantConnectionLunaB6ResultInputV002 = {
  sourcePackagePath: string;
  sourcePackageBytes: Uint8Array;
  requestPath: string;
  requestBytes: Uint8Array;
  b5LocalManifestPath: string;
  b5LocalManifestBytes: Uint8Array;
  rawResponsePath: string;
  rawResponseBytes: Uint8Array;
  candidateResponsePath: string;
  priceSnapshotPath: string;
  priceSnapshotBytes: Uint8Array;
  maximumNanoUsd: number;
};

function sha256(bytes: Uint8Array): string {
  return createHash('sha256').update(bytes).digest('hex');
}

function fail(
  code: DistantConnectionLunaB6ErrorCodeV002,
  message: string,
  cause?: unknown
): never {
  throw new DistantConnectionLunaB6ResultErrorV002(
    code,
    message,
    cause === undefined ? undefined : {cause}
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function binding(
  filePath: string,
  schemaVersion: string,
  bytes: Uint8Array
): DistantConnectionLunaFormalFileBindingV002 {
  return {path: filePath, schemaVersion, fileSha256: sha256(bytes)};
}

function nonnegativeInteger(value: unknown, label: string): number {
  if (!Number.isSafeInteger(value) || (value as number) < 0) {
    fail('B6_USAGE_INVALID', `${label}が非負の安全な整数ではありません`);
  }
  return value as number;
}

function parseCompletedResponse(
  rawResponseBytes: Uint8Array,
  sourcePackagePath: string,
  sourcePackageBytes: Uint8Array
): {
    id: string;
    response: DistantConnectionLunaResponseV002;
    responseBytes: Buffer;
    usage: UsageV002;
  } {
  let raw: unknown;
  try {
    raw = JSON.parse(Buffer.from(rawResponseBytes).toString('utf8'));
  } catch (error) {
    fail('B6_RAW_RESPONSE_INVALID', 'B6 raw応答がJSONとして読めません', error);
  }
  if (!isRecord(raw)
    || typeof raw.id !== 'string' || raw.id.length === 0
    || raw.model !== 'gpt-5.6-luna'
    || !Array.isArray(raw.output)) {
    fail('B6_RAW_RESPONSE_INVALID', 'B6 raw応答のprovider envelopeが不正です');
  }
  if (raw.status !== 'completed' || raw.error !== null || raw.incomplete_details !== null) {
    fail('B6_RESPONSE_INCOMPLETE', 'B6 provider応答がcompletedではありません');
  }
  const messages = raw.output.filter((item) => isRecord(item) && item.type === 'message');
  if (messages.length !== 1) {
    fail('B6_RAW_RESPONSE_INVALID', 'completed assistant messageがexact 1件ではありません');
  }
  const message = messages[0]!;
  if (message.status !== 'completed' || message.role !== 'assistant'
    || !Array.isArray(message.content)) {
    fail('B6_RAW_RESPONSE_INVALID', 'assistant messageの状態または内容が不正です');
  }
  const refusals = message.content.filter(
    (item: unknown) => isRecord(item) && item.type === 'refusal'
  );
  if (refusals.length > 0) fail('B6_REFUSAL', 'B6 providerが返答をrefusalしました');
  const outputTexts = message.content.filter(
    (item: unknown) => isRecord(item) && item.type === 'output_text'
  );
  if (outputTexts.length !== 1 || typeof outputTexts[0]!.text !== 'string') {
    fail('B6_RAW_RESPONSE_INVALID', 'output_textがexact 1件ではありません');
  }
  let response: unknown;
  try {
    response = JSON.parse(outputTexts[0]!.text as string);
  } catch (error) {
    fail('B6_RAW_RESPONSE_INVALID', 'structured outputがJSONとして読めません', error);
  }
  validateDistantConnectionLunaResponseV002(response, {
    sourcePackagePath,
    sourcePackageBytes
  });
  const responseBytes = Buffer.from(`${JSON.stringify(response, null, 2)}\n`, 'utf8');

  if (!isRecord(raw.usage)
    || !isRecord(raw.usage.input_tokens_details)
    || !isRecord(raw.usage.output_tokens_details)) {
    fail('B6_USAGE_INVALID', 'B6 usageの構造が不正です');
  }
  const inputTokens = nonnegativeInteger(raw.usage.input_tokens, 'input token数');
  const cachedInputTokens = nonnegativeInteger(
    raw.usage.input_tokens_details.cached_tokens,
    'cached input token数'
  );
  const cacheWriteTokens = nonnegativeInteger(
    raw.usage.input_tokens_details.cache_write_tokens,
    'cache write token数'
  );
  const outputTokens = nonnegativeInteger(raw.usage.output_tokens, 'output token数');
  const reasoningTokens = nonnegativeInteger(
    raw.usage.output_tokens_details.reasoning_tokens,
    'reasoning token数'
  );
  const totalTokens = nonnegativeInteger(raw.usage.total_tokens, 'total token数');
  const uncachedNonWriteInputTokens = inputTokens - cachedInputTokens - cacheWriteTokens;
  if (uncachedNonWriteInputTokens < 0
    || totalTokens !== inputTokens + outputTokens
    || reasoningTokens > outputTokens) {
    fail('B6_USAGE_INVALID', 'B6 usageの内訳と合計が一致しません');
  }
  return {
    id: raw.id,
    response: response as DistantConnectionLunaResponseV002,
    responseBytes,
    usage: {
      inputTokens,
      cachedInputTokens,
      cacheWriteTokens,
      uncachedNonWriteInputTokens,
      outputTokens,
      reasoningTokens,
      totalTokens
    }
  };
}

function assertPriceSnapshot(value: unknown): asserts value is {
  recordVersion: string;
  standardPricingUsdPerMillionTokens: Record<string, unknown>;
} {
  if (!isRecord(value)
    || value.recordVersion !== 'openai-gpt-5-6-luna-official-snapshot-v001'
    || !isRecord(value.standardPricingUsdPerMillionTokens)
    || value.standardPricingUsdPerMillionTokens.input !== 0.2
    || value.standardPricingUsdPerMillionTokens.cachedInput !== 0.02
    || value.standardPricingUsdPerMillionTokens.outputIncludingReasoning !== 1.2
    || value.standardPricingUsdPerMillionTokens.longContextRule
      !== 'Prompts over 272K input tokens are priced at 2x input and 1.5x output for the full request.'
    || value.standardPricingUsdPerMillionTokens.cacheWriteRule
      !== 'Cache writes are billed at 1.25x the uncached input rate.') {
    fail('B6_PRICE_SNAPSHOT_INVALID', '価格snapshotが固定済みLuna料金と一致しません');
  }
}

export function buildDistantConnectionLunaB6ResultArtifactsV002(
  input: BuildDistantConnectionLunaB6ResultInputV002
): {
    response: DistantConnectionLunaResponseV002;
    responseBytes: Buffer;
    manifest: DistantConnectionLunaB6RunManifestV002;
    manifestBytes: Buffer;
  } {
  const sourcePackage = decodeDistantConnectionLunaSourcePackageV002(input.sourcePackageBytes);
  const b5Manifest = decodeDistantConnectionLunaB5LocalManifestV002(
    input.b5LocalManifestBytes
  );
  try {
    assertDistantConnectionLunaB6RequestBindingV002(
      b5Manifest.requestBinding,
      input.b5LocalManifestBytes,
      input.requestBytes
    );
  } catch (error) {
    fail('B6_BINDING_MISMATCH', 'B6 requestがB5 v002の固定requestと一致しません', error);
  }
  if (b5Manifest.requestBinding.path !== input.requestPath
    || b5Manifest.sourcePackageBinding.path !== input.sourcePackagePath
    || b5Manifest.sourcePackageBinding.fileSha256 !== sha256(input.sourcePackageBytes)
    || b5Manifest.sourcePackageBinding.schemaVersion
      !== DISTANT_CONNECTION_LUNA_SOURCE_PACKAGE_SCHEMA_V002) {
    fail('B6_BINDING_MISMATCH', 'B6入力とB5 v002 manifestのbindingが一致しません');
  }
  let request: unknown;
  try {
    request = JSON.parse(Buffer.from(input.requestBytes).toString('utf8'));
  } catch (error) {
    fail('B6_BINDING_MISMATCH', 'exact requestがJSONとして読めません', error);
  }
  try {
    assertDistantConnectionLunaExactRequestV002(request, sourcePackage);
  } catch (error) {
    fail('B6_BINDING_MISMATCH', 'exact requestがsource packageからの正式値と一致しません', error);
  }

  const parsed = parseCompletedResponse(
    input.rawResponseBytes,
    input.sourcePackagePath,
    input.sourcePackageBytes
  );

  let priceSnapshot: unknown;
  try {
    priceSnapshot = JSON.parse(Buffer.from(input.priceSnapshotBytes).toString('utf8'));
  } catch (error) {
    fail('B6_PRICE_SNAPSHOT_INVALID', '価格snapshotがJSONとして読めません', error);
  }
  assertPriceSnapshot(priceSnapshot);
  if (!Number.isSafeInteger(input.maximumNanoUsd) || input.maximumNanoUsd < 0) {
    fail('B6_PRICE_SNAPSHOT_INVALID', '費用上限が不正です');
  }
  const longContextPricingApplies = parsed.usage.inputTokens > 272_000;
  const inputMultiplier = longContextPricingApplies ? 2 : 1;
  const outputNumerator = longContextPricingApplies ? 3 : 2;
  const inputNanoUsd = parsed.usage.uncachedNonWriteInputTokens * 200 * inputMultiplier;
  const cachedInputNanoUsd = parsed.usage.cachedInputTokens * 20 * inputMultiplier;
  const cacheWriteNanoUsd = parsed.usage.cacheWriteTokens * 250 * inputMultiplier;
  const outputNanoUsd = parsed.usage.outputTokens * 1200 * outputNumerator / 2;
  const totalNanoUsd = inputNanoUsd + cachedInputNanoUsd + cacheWriteNanoUsd + outputNanoUsd;
  if (![inputNanoUsd, cachedInputNanoUsd, cacheWriteNanoUsd, outputNanoUsd, totalNanoUsd]
    .every(Number.isSafeInteger)) {
    fail('B6_USAGE_INVALID', 'B6費用計算が安全な整数範囲を超えました');
  }
  if (totalNanoUsd > input.maximumNanoUsd) {
    fail('B6_COST_LIMIT_EXCEEDED', 'B6実費が承認済み費用上限を超えています');
  }

  const manifest: DistantConnectionLunaB6RunManifestV002 = {
    schemaVersion: DISTANT_CONNECTION_LUNA_B6_RUN_MANIFEST_SCHEMA_V002,
    sourcePackageBinding: binding(
      input.sourcePackagePath,
      DISTANT_CONNECTION_LUNA_SOURCE_PACKAGE_SCHEMA_V002,
      input.sourcePackageBytes
    ),
    requestBinding: binding(
      input.requestPath,
      DISTANT_CONNECTION_LUNA_REQUEST_SCHEMA_V002,
      input.requestBytes
    ),
    b5LocalManifestBinding: binding(
      input.b5LocalManifestPath,
      DISTANT_CONNECTION_LUNA_B5_LOCAL_MANIFEST_SCHEMA_V002,
      input.b5LocalManifestBytes
    ),
    rawResponseBinding: binding(
      input.rawResponsePath,
      'openai-responses-distant-connection-raw-v001',
      input.rawResponseBytes
    ),
    candidateResponseBinding: binding(
      input.candidateResponsePath,
      DISTANT_CONNECTION_LUNA_RESPONSE_SCHEMA_V001,
      parsed.responseBytes
    ),
    providerResponse: {
      id: parsed.id,
      model: 'gpt-5.6-luna',
      status: 'completed'
    },
    usage: parsed.usage,
    cost: {
      priceSnapshotBinding: binding(
        input.priceSnapshotPath,
        priceSnapshot.recordVersion,
        input.priceSnapshotBytes
      ),
      inputNanoUsd,
      cachedInputNanoUsd,
      cacheWriteNanoUsd,
      outputNanoUsd,
      totalNanoUsd,
      totalUsd: totalNanoUsd / 1_000_000_000,
      maximumNanoUsd: input.maximumNanoUsd,
      withinMaximum: true
    },
    validation: {
      decision: 'passed',
      candidateCount: parsed.response.candidates.length
    }
  };
  const manifestBytes = Buffer.from(`${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  return {
    response: parsed.response,
    responseBytes: parsed.responseBytes,
    manifest,
    manifestBytes
  };
}
