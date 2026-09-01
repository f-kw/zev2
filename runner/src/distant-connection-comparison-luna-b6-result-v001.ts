import {createHash} from 'node:crypto';

import {
  DISTANT_CONNECTION_COMPARISON_B5_LOCAL_MANIFEST_SCHEMA_V001,
  DISTANT_CONNECTION_COMPARISON_EXACT_REQUEST_SCHEMA_V001,
  DISTANT_CONNECTION_COMPARISON_INDEXED_MODEL_INPUT_SCHEMA_V001,
  assertDistantConnectionComparisonB6RequestBindingV001,
  assertDistantConnectionComparisonExactRequestV001,
  assertDistantConnectionComparisonIndexResponseV001,
  buildDistantConnectionComparisonB5LocalArtifactsV001,
  decodeDistantConnectionComparisonB5LocalManifestV001,
  decodeDistantConnectionComparisonIndexedModelInputV001,
  resolveDistantConnectionComparisonIndexResponseV001,
  validateDistantConnectionComparisonIndexedModelInputAgainstSourceV001,
  type DistantConnectionComparisonFormalBindingV001,
  type DistantConnectionComparisonIndexResponseV001,
  type DistantConnectionComparisonResolvedCandidateV001
} from './distant-connection-comparison-luna-b5-local-v001.js';
import {
  DISTANT_CONNECTION_COMPARISON_TOKEN_COUNT_MEASUREMENT_SCHEMA_V001,
  assertDistantConnectionComparisonB6UsesMeasuredRequestV001,
  assertDistantConnectionComparisonTokenCountArtifactSetV001,
  decodeDistantConnectionComparisonTokenCountMeasurementV001,
  type DistantConnectionComparisonTokenCountMeasurementV001
} from './distant-connection-comparison-luna-b5-token-count-v001.js';
import {
  DISTANT_CONNECTION_COMPARISON_SOURCE_PACKAGE_SCHEMA_V001,
  decodeDistantConnectionComparisonSourcePackageV001
} from './distant-connection-comparison-source-package-v001.js';

export const DISTANT_CONNECTION_COMPARISON_CANDIDATE_RESPONSE_SCHEMA_V001 =
  'distant-connection-comparison-candidate-response-v001';
export const DISTANT_CONNECTION_COMPARISON_B6_RUN_MANIFEST_SCHEMA_V001 =
  'distant-connection-comparison-luna-b6-run-manifest-v001';
export const DISTANT_CONNECTION_COMPARISON_B6_RAW_RESPONSE_SCHEMA_V001 =
  'openai-responses-distant-connection-comparison-raw-v001';

export const DISTANT_CONNECTION_COMPARISON_B6_ERROR_CODES_V001 = Object.freeze([
  'PATH_INVALID',
  'B6_BINDING_MISMATCH',
  'B6_TOKEN_MEASUREMENT_INVALID',
  'B6_RAW_RESPONSE_INVALID',
  'B6_RESPONSE_INCOMPLETE',
  'B6_REFUSAL',
  'B6_INDEX_RESPONSE_INVALID',
  'B6_CANDIDATE_RESPONSE_INVALID',
  'B6_USAGE_INVALID',
  'B6_PRICE_SNAPSHOT_INVALID',
  'B6_COST_LIMIT_EXCEEDED',
  'B6_MANIFEST_INVALID'
] as const);

export type DistantConnectionComparisonB6ErrorCodeV001 =
  typeof DISTANT_CONNECTION_COMPARISON_B6_ERROR_CODES_V001[number];

export class DistantConnectionComparisonB6ResultErrorV001 extends Error {
  readonly code: DistantConnectionComparisonB6ErrorCodeV001;

  constructor(
    code: DistantConnectionComparisonB6ErrorCodeV001,
    message: string,
    options?: ErrorOptions
  ) {
    super(message, options);
    this.name = 'DistantConnectionComparisonB6ResultErrorV001';
    this.code = code;
  }
}

export type DistantConnectionComparisonCandidateV001 = {
  candidateId: string;
  anchorId: string;
  firstPartUtteranceIds: string[];
  secondPartUtteranceIds: string[];
  addedUnderstanding: string;
  direction: 'past' | 'future';
};

export type DistantConnectionComparisonCandidateResponseV001 = {
  schemaVersion: typeof DISTANT_CONNECTION_COMPARISON_CANDIDATE_RESPONSE_SCHEMA_V001;
  sourceVideoId: string;
  sourcePackageBinding: DistantConnectionComparisonFormalBindingV001;
  indexedModelInputBinding: DistantConnectionComparisonFormalBindingV001;
  rawResponseBinding: DistantConnectionComparisonFormalBindingV001;
  candidates: DistantConnectionComparisonCandidateV001[];
};

type UsageV001 = {
  inputTokens: number;
  cachedInputTokens: number;
  cacheWriteTokens: number;
  uncachedNonWriteInputTokens: number;
  outputTokens: number;
  reasoningTokens: number;
  totalTokens: number;
};

export type DistantConnectionComparisonB6RunManifestV001 = {
  schemaVersion: typeof DISTANT_CONNECTION_COMPARISON_B6_RUN_MANIFEST_SCHEMA_V001;
  sourcePackageBinding: DistantConnectionComparisonFormalBindingV001;
  indexedModelInputBinding: DistantConnectionComparisonFormalBindingV001;
  exactRequestBinding: DistantConnectionComparisonFormalBindingV001;
  b5LocalManifestBinding: DistantConnectionComparisonFormalBindingV001;
  tokenCountMeasurementBinding: DistantConnectionComparisonFormalBindingV001;
  rawResponseBinding: DistantConnectionComparisonFormalBindingV001;
  candidateResponseBinding: DistantConnectionComparisonFormalBindingV001;
  providerResponse: {
    id: string;
    model: 'gpt-5.6-luna';
    status: 'completed';
  };
  usage: UsageV001;
  cost: {
    priceSnapshotBinding: DistantConnectionComparisonFormalBindingV001;
    longContextPricingApplies: boolean;
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
    tokenCountMeasurementRevalidated: true;
    indexReferenceValidation: 'passed';
    deterministicFormalIdResolution: 'passed';
    candidateCount: number;
  };
};

export type DistantConnectionComparisonB6PreflightInputV001 = {
  sourcePackagePath: string;
  sourcePackageBytes: Uint8Array;
  indexedModelInputPath: string;
  indexedModelInputBytes: Uint8Array;
  exactRequestPath: string;
  exactRequestBytes: Uint8Array;
  b5LocalManifestPath: string;
  b5LocalManifestBytes: Uint8Array;
  tokenCountRequestPath: string;
  tokenCountRequestBytes: Uint8Array;
  tokenCountRawResponsePath: string;
  tokenCountRawResponseBytes: Uint8Array;
  tokenCountMeasurementPath: string;
  tokenCountMeasurementBytes: Uint8Array;
  priceSnapshotPath: string;
  priceSnapshotBytes: Uint8Array;
  expectedPriceSnapshotSha256: string;
  rawResponsePath: string;
  candidateResponsePath: string;
  maximumNanoUsd: number;
};

export type BuildDistantConnectionComparisonB6ResultInputV001 =
  DistantConnectionComparisonB6PreflightInputV001 & {
    rawResponseBytes: Uint8Array;
  };

export type DistantConnectionComparisonB6ArtifactSetV001 =
  BuildDistantConnectionComparisonB6ResultInputV001 & {
    candidateResponseBytes: Uint8Array;
    manifestBytes: Uint8Array;
  };

type RecordValue = Record<string, unknown>;

const SHA256 = /^[0-9a-f]{64}$/u;
const FORMAL_ID = /^[A-Za-z0-9][A-Za-z0-9._-]*$/u;
const CANDIDATE_ID = /^candidate-[0-9a-f]{64}$/u;
const WORKSPACE_RELATIVE_PATH =
  /^(?!\/)(?!\.\/)(?!.*(?:^|\/)\.\.(?:\/|$))(?!.*\\)(?!.*\/\/)[^\0]+$/u;

function fail(
  code: DistantConnectionComparisonB6ErrorCodeV001,
  message: string,
  cause?: unknown
): never {
  throw new DistantConnectionComparisonB6ResultErrorV001(
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
  label: string,
  code: DistantConnectionComparisonB6ErrorCodeV001 = 'B6_MANIFEST_INVALID'
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

function binding(
  path: string,
  schemaVersion: string,
  bytes: Uint8Array
): DistantConnectionComparisonFormalBindingV001 {
  assertPath(path, '成果物path');
  if (!FORMAL_ID.test(schemaVersion)) {
    fail('B6_MANIFEST_INVALID', '成果物schema versionが不正です');
  }
  return {path, schemaVersion, fileSha256: sha256(bytes)};
}

function nonnegativeInteger(value: unknown, label: string): number {
  if (!Number.isSafeInteger(value) || (value as number) < 0) {
    fail('B6_USAGE_INVALID', `${label}が非負の安全な整数ではありません`);
  }
  return value as number;
}

function decodeFixedChain(input: DistantConnectionComparisonB6PreflightInputV001): {
  indexedModelInput: ReturnType<
    typeof decodeDistantConnectionComparisonIndexedModelInputV001
  >;
  tokenMeasurement: DistantConnectionComparisonTokenCountMeasurementV001;
} {
  for (const [label, value] of [
    ['source package path', input.sourcePackagePath],
    ['indexed model input path', input.indexedModelInputPath],
    ['exact request path', input.exactRequestPath],
    ['B5 local manifest path', input.b5LocalManifestPath],
    ['token count request path', input.tokenCountRequestPath],
    ['token count raw response path', input.tokenCountRawResponsePath],
    ['token count measurement path', input.tokenCountMeasurementPath],
    ['price snapshot path', input.priceSnapshotPath],
    ['B6 raw response path', input.rawResponsePath],
    ['candidate response path', input.candidateResponsePath]
  ] as const) assertPath(value, label);

  let sourcePackage: ReturnType<typeof decodeDistantConnectionComparisonSourcePackageV001>;
  let indexedModelInput: ReturnType<
    typeof decodeDistantConnectionComparisonIndexedModelInputV001
  >;
  let b5Manifest: ReturnType<typeof decodeDistantConnectionComparisonB5LocalManifestV001>;
  try {
    sourcePackage = decodeDistantConnectionComparisonSourcePackageV001(
      input.sourcePackageBytes
    );
    indexedModelInput = decodeDistantConnectionComparisonIndexedModelInputV001(
      input.indexedModelInputBytes
    );
    b5Manifest = decodeDistantConnectionComparisonB5LocalManifestV001(
      input.b5LocalManifestBytes
    );
  } catch (error) {
    fail('B6_BINDING_MISMATCH', 'B6の固定済み比較入力を正式byteとして読めません', error);
  }
  if (sourcePackage.responseContract.sourcePackagePath !== input.sourcePackagePath
    || b5Manifest.sourcePackageBinding.path !== input.sourcePackagePath
    || b5Manifest.sourcePackageBinding.fileSha256 !== sha256(input.sourcePackageBytes)
    || b5Manifest.indexedModelInputBinding.path !== input.indexedModelInputPath
    || b5Manifest.indexedModelInputBinding.fileSha256
      !== sha256(input.indexedModelInputBytes)
    || b5Manifest.requestBinding.path !== input.exactRequestPath
    || b5Manifest.requestBinding.fileSha256 !== sha256(input.exactRequestBytes)) {
    fail('B6_BINDING_MISMATCH', 'source・index入力・exact requestとB5 bindingが一致しません');
  }
  try {
    validateDistantConnectionComparisonIndexedModelInputAgainstSourceV001(
      indexedModelInput,
      {sourcePackagePath: input.sourcePackagePath, sourcePackageBytes: input.sourcePackageBytes}
    );
    const request = JSON.parse(Buffer.from(input.exactRequestBytes).toString('utf8'));
    assertDistantConnectionComparisonExactRequestV001(
      request,
      indexedModelInput,
      b5Manifest.indexedModelInputBinding
    );
    assertDistantConnectionComparisonB6RequestBindingV001(
      b5Manifest,
      b5Manifest.requestBinding,
      input.exactRequestBytes
    );
    const rebuilt = buildDistantConnectionComparisonB5LocalArtifactsV001({
      sourcePackageBinding: b5Manifest.sourcePackageBinding,
      sourcePackageBytes: input.sourcePackageBytes,
      indexedModelInputBinding: b5Manifest.indexedModelInputBinding,
      indexedModelInputBytes: input.indexedModelInputBytes,
      requestPath: input.exactRequestPath,
      requestSettings: b5Manifest.requestSettings
    });
    if (!rebuilt.requestBytes.equals(Buffer.from(input.exactRequestBytes))
      || !rebuilt.manifestBytes.equals(Buffer.from(input.b5LocalManifestBytes))) {
      fail('B6_BINDING_MISMATCH', '比較用B5成果物を同一byteへ再構築できません');
    }
  } catch (error) {
    if (error instanceof DistantConnectionComparisonB6ResultErrorV001) throw error;
    fail('B6_BINDING_MISMATCH', 'B6 requestが固定済みB5 requestと一致しません', error);
  }

  let tokenMeasurement: DistantConnectionComparisonTokenCountMeasurementV001;
  try {
    tokenMeasurement = decodeDistantConnectionComparisonTokenCountMeasurementV001(
      input.tokenCountMeasurementBytes,
      input.b5LocalManifestBytes
    );
    assertDistantConnectionComparisonTokenCountArtifactSetV001({
      manifestPath: input.b5LocalManifestPath,
      manifestBytes: input.b5LocalManifestBytes,
      sourcePackageBytes: input.sourcePackageBytes,
      indexedModelInputBytes: input.indexedModelInputBytes,
      exactRequestBytes: input.exactRequestBytes,
      tokenCountRequestPath: input.tokenCountRequestPath,
      tokenCountRequestBytes: input.tokenCountRequestBytes,
      rawResponsePath: input.tokenCountRawResponsePath,
      rawResponseBytes: input.tokenCountRawResponseBytes,
      priceSnapshotPath: input.priceSnapshotPath,
      priceSnapshotBytes: input.priceSnapshotBytes,
      expectedPriceSnapshotSha256: input.expectedPriceSnapshotSha256,
      measurement: tokenMeasurement
    });
    assertDistantConnectionComparisonB6UsesMeasuredRequestV001(
      tokenMeasurement,
      input.exactRequestPath,
      input.exactRequestBytes
    );
  } catch (error) {
    fail(
      'B6_TOKEN_MEASUREMENT_INVALID',
      'B6が固定済みtoken計測成果物と同一requestを使用していません',
      error
    );
  }
  if (tokenMeasurement.b5LocalManifestBinding.path !== input.b5LocalManifestPath
    || tokenMeasurement.b5LocalManifestBinding.fileSha256
      !== sha256(input.b5LocalManifestBytes)
    || tokenMeasurement.tokenCountRequestBinding.path !== input.tokenCountRequestPath
    || tokenMeasurement.tokenCountRequestBinding.fileSha256
      !== sha256(input.tokenCountRequestBytes)
    || tokenMeasurement.rawResponseBinding.path !== input.tokenCountRawResponsePath
    || tokenMeasurement.rawResponseBinding.fileSha256
      !== sha256(input.tokenCountRawResponseBytes)
    || tokenMeasurement.priceSnapshotBinding.path !== input.priceSnapshotPath
    || tokenMeasurement.priceSnapshotBinding.fileSha256
      !== sha256(input.priceSnapshotBytes)) {
    fail('B6_TOKEN_MEASUREMENT_INVALID', 'token計測のpath・SHA bindingが実byteと一致しません');
  }
  if (tokenMeasurement.tokenMeasurement.withinContextWindow !== true) {
    fail('B6_TOKEN_MEASUREMENT_INVALID', 'token計測済みrequestがLunaのcontext上限を超えています');
  }
  if (!Number.isSafeInteger(input.maximumNanoUsd) || input.maximumNanoUsd < 0) {
    fail('B6_COST_LIMIT_EXCEEDED', 'B6費用上限が非負の安全な整数ではありません');
  }
  if (tokenMeasurement.maximumB6CostProjection.projectedTotalNanoUsd
      > input.maximumNanoUsd) {
    fail('B6_COST_LIMIT_EXCEEDED', 'token計測時の最大B6費用投影が承認上限を超えています');
  }
  return {indexedModelInput, tokenMeasurement};
}

export function assertDistantConnectionComparisonB6PreflightV001(
  input: DistantConnectionComparisonB6PreflightInputV001
): void {
  decodeFixedChain(input);
}

function parseProviderIndexEnvelope(
  rawResponseBytes: Uint8Array,
  indexedModelInput: ReturnType<typeof decodeDistantConnectionComparisonIndexedModelInputV001>
): {
  raw: RecordValue;
  id: string;
  indexResponse: DistantConnectionComparisonIndexResponseV001;
} {
  let raw: unknown;
  try {
    raw = JSON.parse(Buffer.from(rawResponseBytes).toString('utf8'));
  } catch (error) {
    fail('B6_RAW_RESPONSE_INVALID', 'B6 raw応答がJSONとして読めません', error);
  }
  if (!isRecord(raw)
    || raw.object !== 'response'
    || typeof raw.id !== 'string'
    || raw.id.length === 0
    || raw.model !== 'gpt-5.6-luna'
    || !Array.isArray(raw.output)) {
    fail('B6_RAW_RESPONSE_INVALID', 'B6 raw応答のprovider envelopeが不正です');
  }
  if (raw.status !== 'completed' || raw.error !== null || raw.incomplete_details !== null) {
    fail('B6_RESPONSE_INCOMPLETE', 'B6 provider応答がcompletedではありません');
  }
  if (raw.output.some(
    (item) => !isRecord(item) || (item.type !== 'reasoning' && item.type !== 'message')
  )) {
    fail(
      'B6_RAW_RESPONSE_INVALID',
      'B6 outputにreasoningまたはassistant message以外のitemがあります'
    );
  }
  const messages = raw.output.filter((item) => isRecord(item) && item.type === 'message');
  if (messages.length !== 1) {
    fail('B6_RAW_RESPONSE_INVALID', 'completed assistant messageがexact 1件ではありません');
  }
  const message = messages[0]!;
  if (message.status !== 'completed'
    || message.role !== 'assistant'
    || !Array.isArray(message.content)) {
    fail('B6_RAW_RESPONSE_INVALID', 'assistant messageの状態または内容が不正です');
  }
  if (message.content.some((item: unknown) => isRecord(item) && item.type === 'refusal')) {
    fail('B6_REFUSAL', 'B6 providerが返答をrefusalしました');
  }
  const outputTexts = message.content.filter(
    (item: unknown) => isRecord(item) && item.type === 'output_text'
  );
  if (message.content.length !== 1
    || outputTexts.length !== 1
    || typeof outputTexts[0]!.text !== 'string') {
    fail('B6_RAW_RESPONSE_INVALID', 'output_textがexact 1件ではありません');
  }
  let indexResponse: unknown;
  try {
    indexResponse = JSON.parse(outputTexts[0]!.text as string);
    assertDistantConnectionComparisonIndexResponseV001(indexResponse, indexedModelInput);
  } catch (error) {
    fail(
      'B6_INDEX_RESPONSE_INVALID',
      'B6の0-based index返答が固定済み範囲・契約へ適合しません',
      error
    );
  }
  return {raw, id: raw.id, indexResponse};
}

function parseProviderResponse(
  rawResponseBytes: Uint8Array,
  indexedModelInput: ReturnType<typeof decodeDistantConnectionComparisonIndexedModelInputV001>,
  measuredInputTokens: number
): {
  id: string;
  indexResponse: DistantConnectionComparisonIndexResponseV001;
  usage: UsageV001;
} {
  const envelope = parseProviderIndexEnvelope(rawResponseBytes, indexedModelInput);
  const raw = envelope.raw;
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
  if (inputTokens !== measuredInputTokens
    || uncachedNonWriteInputTokens < 0
    || totalTokens !== inputTokens + outputTokens
    || reasoningTokens > outputTokens) {
    fail('B6_USAGE_INVALID', 'B6 usageがtoken計測値または内訳・合計と一致しません');
  }
  return {
    id: envelope.id,
    indexResponse: envelope.indexResponse,
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

function toCandidateResponse(
  resolved: DistantConnectionComparisonResolvedCandidateV001[],
  sourcePackagePath: string,
  sourcePackageBytes: Uint8Array,
  indexedModelInputPath: string,
  indexedModelInputBytes: Uint8Array,
  rawResponsePath: string,
  rawResponseBytes: Uint8Array
): DistantConnectionComparisonCandidateResponseV001 {
  const sourcePackage = decodeDistantConnectionComparisonSourcePackageV001(sourcePackageBytes);
  return {
    schemaVersion: DISTANT_CONNECTION_COMPARISON_CANDIDATE_RESPONSE_SCHEMA_V001,
    sourceVideoId: sourcePackage.sourceVideoId,
    sourcePackageBinding: binding(
      sourcePackagePath,
      DISTANT_CONNECTION_COMPARISON_SOURCE_PACKAGE_SCHEMA_V001,
      sourcePackageBytes
    ),
    indexedModelInputBinding: binding(
      indexedModelInputPath,
      DISTANT_CONNECTION_COMPARISON_INDEXED_MODEL_INPUT_SCHEMA_V001,
      indexedModelInputBytes
    ),
    rawResponseBinding: binding(
      rawResponsePath,
      DISTANT_CONNECTION_COMPARISON_B6_RAW_RESPONSE_SCHEMA_V001,
      rawResponseBytes
    ),
    candidates: resolved.map((candidate) => ({
      candidateId: candidate.candidateId,
      anchorId: candidate.anchorId,
      firstPartUtteranceIds: [...candidate.firstPartUtteranceIds],
      secondPartUtteranceIds: [...candidate.secondPartUtteranceIds],
      addedUnderstanding: candidate.addedUnderstanding,
      direction: candidate.direction
    }))
  };
}

export function assertDistantConnectionComparisonCandidateResponseV001(
  value: unknown,
  sourcePackagePath: string,
  sourcePackageBytes: Uint8Array,
  indexedModelInputPath: string,
  indexedModelInputBytes: Uint8Array,
  rawResponsePath: string,
  rawResponseBytes: Uint8Array
): asserts value is DistantConnectionComparisonCandidateResponseV001 {
  assertPath(sourcePackagePath, 'source package path');
  assertPath(indexedModelInputPath, 'indexed model input path');
  assertPath(rawResponsePath, 'raw response path');
  const sourcePackage = decodeDistantConnectionComparisonSourcePackageV001(sourcePackageBytes);
  if (!isRecord(value)
    || !hasExactKeys(value, [
      'schemaVersion',
      'sourceVideoId',
      'sourcePackageBinding',
      'indexedModelInputBinding',
      'rawResponseBinding',
      'candidates'
    ])
    || value.schemaVersion !== DISTANT_CONNECTION_COMPARISON_CANDIDATE_RESPONSE_SCHEMA_V001
    || value.sourceVideoId !== sourcePackage.sourceVideoId
    || !Array.isArray(value.candidates)) {
    fail('B6_CANDIDATE_RESPONSE_INVALID', '比較用正式候補成果物のroot構造が不正です');
  }
  assertBinding(value.sourcePackageBinding, 'source package binding',
    'B6_CANDIDATE_RESPONSE_INVALID');
  assertBinding(value.indexedModelInputBinding, 'indexed model input binding',
    'B6_CANDIDATE_RESPONSE_INVALID');
  assertBinding(value.rawResponseBinding, 'raw response binding',
    'B6_CANDIDATE_RESPONSE_INVALID');
  const expectedSourceBinding = binding(
    sourcePackagePath,
    DISTANT_CONNECTION_COMPARISON_SOURCE_PACKAGE_SCHEMA_V001,
    sourcePackageBytes
  );
  if (JSON.stringify(value.sourcePackageBinding) !== JSON.stringify(expectedSourceBinding)) {
    fail('B6_CANDIDATE_RESPONSE_INVALID', '正式候補のsource package bindingが不一致です');
  }
  const expectedIndexedBinding = binding(
    indexedModelInputPath,
    DISTANT_CONNECTION_COMPARISON_INDEXED_MODEL_INPUT_SCHEMA_V001,
    indexedModelInputBytes
  );
  const expectedRawBinding = binding(
    rawResponsePath,
    DISTANT_CONNECTION_COMPARISON_B6_RAW_RESPONSE_SCHEMA_V001,
    rawResponseBytes
  );
  if (JSON.stringify(value.indexedModelInputBinding) !== JSON.stringify(expectedIndexedBinding)
    || JSON.stringify(value.rawResponseBinding) !== JSON.stringify(expectedRawBinding)) {
    fail('B6_CANDIDATE_RESPONSE_INVALID', '正式候補のindex入力またはraw応答bindingが不一致です');
  }
  const seenCandidateIds = new Set<string>();
  for (const [index, candidate] of value.candidates.entries()) {
    if (!isRecord(candidate)
      || !hasExactKeys(candidate, [
        'candidateId',
        'anchorId',
        'firstPartUtteranceIds',
        'secondPartUtteranceIds',
        'addedUnderstanding',
        'direction'
      ])
      || typeof candidate.candidateId !== 'string'
      || !CANDIDATE_ID.test(candidate.candidateId)
      || typeof candidate.anchorId !== 'string'
      || typeof candidate.addedUnderstanding !== 'string'
      || candidate.addedUnderstanding.trim().length === 0
      || (candidate.direction !== 'past' && candidate.direction !== 'future')
      || !Array.isArray(candidate.firstPartUtteranceIds)
      || !Array.isArray(candidate.secondPartUtteranceIds)
      || candidate.firstPartUtteranceIds.length === 0
      || candidate.secondPartUtteranceIds.length === 0
      || [...candidate.firstPartUtteranceIds, ...candidate.secondPartUtteranceIds].some(
        (id) => typeof id !== 'string'
      )) {
      fail('B6_CANDIDATE_RESPONSE_INVALID', `正式候補${index + 1}件目が不正です`);
    }
    if (seenCandidateIds.has(candidate.candidateId)) {
      fail('B6_CANDIDATE_RESPONSE_INVALID', '正式candidate IDが重複しています');
    }
    seenCandidateIds.add(candidate.candidateId);
  }
  try {
    const indexedModelInput = decodeDistantConnectionComparisonIndexedModelInputV001(
      indexedModelInputBytes
    );
    validateDistantConnectionComparisonIndexedModelInputAgainstSourceV001(
      indexedModelInput,
      {sourcePackagePath, sourcePackageBytes}
    );
    const envelope = parseProviderIndexEnvelope(rawResponseBytes, indexedModelInput);
    const resolved = resolveDistantConnectionComparisonIndexResponseV001(
      envelope.indexResponse,
      indexedModelInput,
      {sourcePackagePath, sourcePackageBytes}
    );
    const expectedCandidates: DistantConnectionComparisonCandidateV001[] = resolved.map(
      (candidate) => ({
        candidateId: candidate.candidateId,
        anchorId: candidate.anchorId,
        firstPartUtteranceIds: [...candidate.firstPartUtteranceIds],
        secondPartUtteranceIds: [...candidate.secondPartUtteranceIds],
        addedUnderstanding: candidate.addedUnderstanding,
        direction: candidate.direction
      })
    );
    if (JSON.stringify(value.candidates) !== JSON.stringify(expectedCandidates)) {
      fail(
        'B6_CANDIDATE_RESPONSE_INVALID',
        '正式候補配列がraw index返答の決定的解決結果と一致しません'
      );
    }
  } catch (error) {
    if (error instanceof DistantConnectionComparisonB6ResultErrorV001) throw error;
    fail(
      'B6_CANDIDATE_RESPONSE_INVALID',
      '正式候補をindex入力・raw応答から決定的に再検証できません',
      error
    );
  }
}

export function serializeDistantConnectionComparisonCandidateResponseV001(
  value: DistantConnectionComparisonCandidateResponseV001,
  sourcePackagePath: string,
  sourcePackageBytes: Uint8Array,
  indexedModelInputPath: string,
  indexedModelInputBytes: Uint8Array,
  rawResponsePath: string,
  rawResponseBytes: Uint8Array
): Buffer {
  assertDistantConnectionComparisonCandidateResponseV001(
    value,
    sourcePackagePath,
    sourcePackageBytes,
    indexedModelInputPath,
    indexedModelInputBytes,
    rawResponsePath,
    rawResponseBytes
  );
  return Buffer.from(`${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

export function decodeDistantConnectionComparisonCandidateResponseV001(
  bytes: Uint8Array,
  sourcePackagePath: string,
  sourcePackageBytes: Uint8Array,
  indexedModelInputPath: string,
  indexedModelInputBytes: Uint8Array,
  rawResponsePath: string,
  rawResponseBytes: Uint8Array
): DistantConnectionComparisonCandidateResponseV001 {
  let value: unknown;
  try {
    value = JSON.parse(Buffer.from(bytes).toString('utf8'));
  } catch (error) {
    fail('B6_CANDIDATE_RESPONSE_INVALID', '正式候補成果物がJSONとして読めません', error);
  }
  assertDistantConnectionComparisonCandidateResponseV001(
    value,
    sourcePackagePath,
    sourcePackageBytes,
    indexedModelInputPath,
    indexedModelInputBytes,
    rawResponsePath,
    rawResponseBytes
  );
  if (!serializeDistantConnectionComparisonCandidateResponseV001(
    value,
    sourcePackagePath,
    sourcePackageBytes,
    indexedModelInputPath,
    indexedModelInputBytes,
    rawResponsePath,
    rawResponseBytes
  ).equals(Buffer.from(bytes))) {
    fail('B6_CANDIDATE_RESPONSE_INVALID', '正式候補成果物がcanonical formal byteではありません');
  }
  return value;
}

function assertPriceSnapshot(bytes: Uint8Array, expectedSha256: string): string {
  if (!SHA256.test(expectedSha256) || sha256(bytes) !== expectedSha256) {
    fail('B6_PRICE_SNAPSHOT_INVALID', '価格snapshotのSHA-256が一致しません');
  }
  let value: unknown;
  try {
    value = JSON.parse(Buffer.from(bytes).toString('utf8'));
  } catch (error) {
    fail('B6_PRICE_SNAPSHOT_INVALID', '価格snapshotがJSONとして読めません', error);
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
    fail('B6_PRICE_SNAPSHOT_INVALID', '価格snapshotが固定済みLuna料金と一致しません');
  }
  return value.recordVersion as string;
}

function calculateCost(usage: UsageV001, maximumNanoUsd: number): {
  longContextPricingApplies: boolean;
  inputNanoUsd: number;
  cachedInputNanoUsd: number;
  cacheWriteNanoUsd: number;
  outputNanoUsd: number;
  totalNanoUsd: number;
} {
  if (!Number.isSafeInteger(maximumNanoUsd) || maximumNanoUsd < 0) {
    fail('B6_COST_LIMIT_EXCEEDED', '費用上限が非負の安全な整数ではありません');
  }
  const longContextPricingApplies = usage.inputTokens > 272_000;
  const inputMultiplier = longContextPricingApplies ? 2 : 1;
  const outputNumerator = longContextPricingApplies ? 3 : 2;
  const inputNanoUsd = usage.uncachedNonWriteInputTokens * 200 * inputMultiplier;
  const cachedInputNanoUsd = usage.cachedInputTokens * 20 * inputMultiplier;
  const cacheWriteNanoUsd = usage.cacheWriteTokens * 250 * inputMultiplier;
  const outputNanoUsd = usage.outputTokens * 1_200 * outputNumerator / 2;
  const totalNanoUsd = inputNanoUsd + cachedInputNanoUsd + cacheWriteNanoUsd + outputNanoUsd;
  if (![inputNanoUsd, cachedInputNanoUsd, cacheWriteNanoUsd, outputNanoUsd, totalNanoUsd]
    .every(Number.isSafeInteger)) {
    fail('B6_USAGE_INVALID', 'B6費用計算が安全な整数ではありません');
  }
  if (totalNanoUsd > maximumNanoUsd) {
    fail('B6_COST_LIMIT_EXCEEDED', 'B6実費が承認済み費用上限を超えています');
  }
  return {
    longContextPricingApplies,
    inputNanoUsd,
    cachedInputNanoUsd,
    cacheWriteNanoUsd,
    outputNanoUsd,
    totalNanoUsd
  };
}

export function assertDistantConnectionComparisonB6RunManifestV001(
  value: unknown
): asserts value is DistantConnectionComparisonB6RunManifestV001 {
  if (!isRecord(value)
    || !hasExactKeys(value, [
      'schemaVersion',
      'sourcePackageBinding',
      'indexedModelInputBinding',
      'exactRequestBinding',
      'b5LocalManifestBinding',
      'tokenCountMeasurementBinding',
      'rawResponseBinding',
      'candidateResponseBinding',
      'providerResponse',
      'usage',
      'cost',
      'validation'
    ])
    || value.schemaVersion !== DISTANT_CONNECTION_COMPARISON_B6_RUN_MANIFEST_SCHEMA_V001) {
    fail('B6_MANIFEST_INVALID', '比較用B6 manifestのroot構造または版が不正です');
  }
  const sourcePackageBinding = value.sourcePackageBinding;
  const indexedModelInputBinding = value.indexedModelInputBinding;
  const exactRequestBinding = value.exactRequestBinding;
  const b5LocalManifestBinding = value.b5LocalManifestBinding;
  const tokenCountMeasurementBinding = value.tokenCountMeasurementBinding;
  const rawResponseBinding = value.rawResponseBinding;
  const candidateResponseBinding = value.candidateResponseBinding;
  assertBinding(sourcePackageBinding, 'source package binding');
  assertBinding(indexedModelInputBinding, 'indexed model input binding');
  assertBinding(exactRequestBinding, 'exact request binding');
  assertBinding(b5LocalManifestBinding, 'B5 local manifest binding');
  assertBinding(tokenCountMeasurementBinding, 'token count measurement binding');
  assertBinding(rawResponseBinding, 'raw response binding');
  assertBinding(candidateResponseBinding, 'candidate response binding');
  if (sourcePackageBinding.schemaVersion
      !== DISTANT_CONNECTION_COMPARISON_SOURCE_PACKAGE_SCHEMA_V001
    || indexedModelInputBinding.schemaVersion
      !== DISTANT_CONNECTION_COMPARISON_INDEXED_MODEL_INPUT_SCHEMA_V001
    || exactRequestBinding.schemaVersion
      !== DISTANT_CONNECTION_COMPARISON_EXACT_REQUEST_SCHEMA_V001
    || b5LocalManifestBinding.schemaVersion
      !== DISTANT_CONNECTION_COMPARISON_B5_LOCAL_MANIFEST_SCHEMA_V001
    || tokenCountMeasurementBinding.schemaVersion
      !== DISTANT_CONNECTION_COMPARISON_TOKEN_COUNT_MEASUREMENT_SCHEMA_V001
    || rawResponseBinding.schemaVersion
      !== DISTANT_CONNECTION_COMPARISON_B6_RAW_RESPONSE_SCHEMA_V001
    || candidateResponseBinding.schemaVersion
      !== DISTANT_CONNECTION_COMPARISON_CANDIDATE_RESPONSE_SCHEMA_V001) {
    fail('B6_MANIFEST_INVALID', '比較用B6 manifestの上流または出力schema bindingが不正です');
  }
  if (!isRecord(value.providerResponse)
    || !hasExactKeys(value.providerResponse, ['id', 'model', 'status'])
    || typeof value.providerResponse.id !== 'string'
    || value.providerResponse.id.length === 0
    || value.providerResponse.model !== 'gpt-5.6-luna'
    || value.providerResponse.status !== 'completed'
    || !isRecord(value.usage)
    || !hasExactKeys(value.usage, [
      'inputTokens',
      'cachedInputTokens',
      'cacheWriteTokens',
      'uncachedNonWriteInputTokens',
      'outputTokens',
      'reasoningTokens',
      'totalTokens'
    ])) {
    fail('B6_MANIFEST_INVALID', '比較用B6 manifestのprovider応答またはusageが不正です');
  }
  const usage = value.usage as UsageV001;
  for (const [label, number] of Object.entries(usage)) nonnegativeInteger(number, label);
  if (usage.uncachedNonWriteInputTokens
      !== usage.inputTokens - usage.cachedInputTokens - usage.cacheWriteTokens
    || usage.totalTokens !== usage.inputTokens + usage.outputTokens
    || usage.reasoningTokens > usage.outputTokens) {
    fail('B6_MANIFEST_INVALID', '比較用B6 manifestのusage内訳が不整合です');
  }
  if (!isRecord(value.cost)
    || !hasExactKeys(value.cost, [
      'priceSnapshotBinding',
      'longContextPricingApplies',
      'inputNanoUsd',
      'cachedInputNanoUsd',
      'cacheWriteNanoUsd',
      'outputNanoUsd',
      'totalNanoUsd',
      'totalUsd',
      'maximumNanoUsd',
      'withinMaximum'
    ])) {
    fail('B6_MANIFEST_INVALID', '比較用B6 manifestの費用構造が不正です');
  }
  assertBinding(value.cost.priceSnapshotBinding, '価格snapshot binding');
  if (value.cost.priceSnapshotBinding.schemaVersion
      !== 'openai-gpt-5-6-luna-official-snapshot-v001') {
    fail('B6_MANIFEST_INVALID', '比較用B6 manifestの価格snapshot版が不正です');
  }
  const recomputed = calculateCost(usage, value.cost.maximumNanoUsd as number);
  if (value.cost.longContextPricingApplies !== recomputed.longContextPricingApplies
    || value.cost.inputNanoUsd !== recomputed.inputNanoUsd
    || value.cost.cachedInputNanoUsd !== recomputed.cachedInputNanoUsd
    || value.cost.cacheWriteNanoUsd !== recomputed.cacheWriteNanoUsd
    || value.cost.outputNanoUsd !== recomputed.outputNanoUsd
    || value.cost.totalNanoUsd !== recomputed.totalNanoUsd
    || value.cost.totalUsd !== recomputed.totalNanoUsd / 1_000_000_000
    || value.cost.withinMaximum !== true
    || !isRecord(value.validation)
    || !hasExactKeys(value.validation, [
      'decision',
      'tokenCountMeasurementRevalidated',
      'indexReferenceValidation',
      'deterministicFormalIdResolution',
      'candidateCount'
    ])
    || value.validation.decision !== 'passed'
    || value.validation.tokenCountMeasurementRevalidated !== true
    || value.validation.indexReferenceValidation !== 'passed'
    || value.validation.deterministicFormalIdResolution !== 'passed'
    || !Number.isSafeInteger(value.validation.candidateCount)
    || (value.validation.candidateCount as number) < 0) {
    fail('B6_MANIFEST_INVALID', '比較用B6 manifestの費用または検査結果が不整合です');
  }
}

export function serializeDistantConnectionComparisonB6RunManifestV001(
  value: DistantConnectionComparisonB6RunManifestV001
): Buffer {
  assertDistantConnectionComparisonB6RunManifestV001(value);
  return Buffer.from(`${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

export function decodeDistantConnectionComparisonB6RunManifestV001(
  bytes: Uint8Array
): DistantConnectionComparisonB6RunManifestV001 {
  let value: unknown;
  try {
    value = JSON.parse(Buffer.from(bytes).toString('utf8'));
  } catch (error) {
    fail('B6_MANIFEST_INVALID', '比較用B6 manifestがJSONとして読めません', error);
  }
  assertDistantConnectionComparisonB6RunManifestV001(value);
  if (!serializeDistantConnectionComparisonB6RunManifestV001(value)
    .equals(Buffer.from(bytes))) {
    fail('B6_MANIFEST_INVALID', '比較用B6 manifestがcanonical formal byteではありません');
  }
  return value;
}

export function buildDistantConnectionComparisonB6ResultArtifactsV001(
  input: BuildDistantConnectionComparisonB6ResultInputV001
): {
  candidateResponse: DistantConnectionComparisonCandidateResponseV001;
  candidateResponseBytes: Buffer;
  manifest: DistantConnectionComparisonB6RunManifestV001;
  manifestBytes: Buffer;
} {
  const {indexedModelInput, tokenMeasurement} = decodeFixedChain(input);
  const parsed = parseProviderResponse(
    input.rawResponseBytes,
    indexedModelInput,
    tokenMeasurement.tokenMeasurement.inputTokens
  );
  let resolved: DistantConnectionComparisonResolvedCandidateV001[];
  try {
    resolved = resolveDistantConnectionComparisonIndexResponseV001(
      parsed.indexResponse,
      indexedModelInput,
      {sourcePackagePath: input.sourcePackagePath, sourcePackageBytes: input.sourcePackageBytes}
    );
  } catch (error) {
    fail('B6_INDEX_RESPONSE_INVALID', 'index返答を正式IDへ決定的に解決できません', error);
  }
  const candidateResponse = toCandidateResponse(
    resolved,
    input.sourcePackagePath,
    input.sourcePackageBytes,
    input.indexedModelInputPath,
    input.indexedModelInputBytes,
    input.rawResponsePath,
    input.rawResponseBytes
  );
  const candidateResponseBytes = serializeDistantConnectionComparisonCandidateResponseV001(
    candidateResponse,
    input.sourcePackagePath,
    input.sourcePackageBytes,
    input.indexedModelInputPath,
    input.indexedModelInputBytes,
    input.rawResponsePath,
    input.rawResponseBytes
  );
  const priceSnapshotSchema = assertPriceSnapshot(
    input.priceSnapshotBytes,
    input.expectedPriceSnapshotSha256
  );
  const calculated = calculateCost(parsed.usage, input.maximumNanoUsd);
  const manifest: DistantConnectionComparisonB6RunManifestV001 = {
    schemaVersion: DISTANT_CONNECTION_COMPARISON_B6_RUN_MANIFEST_SCHEMA_V001,
    sourcePackageBinding: binding(
      input.sourcePackagePath,
      DISTANT_CONNECTION_COMPARISON_SOURCE_PACKAGE_SCHEMA_V001,
      input.sourcePackageBytes
    ),
    indexedModelInputBinding: binding(
      input.indexedModelInputPath,
      DISTANT_CONNECTION_COMPARISON_INDEXED_MODEL_INPUT_SCHEMA_V001,
      input.indexedModelInputBytes
    ),
    exactRequestBinding: binding(
      input.exactRequestPath,
      DISTANT_CONNECTION_COMPARISON_EXACT_REQUEST_SCHEMA_V001,
      input.exactRequestBytes
    ),
    b5LocalManifestBinding: binding(
      input.b5LocalManifestPath,
      DISTANT_CONNECTION_COMPARISON_B5_LOCAL_MANIFEST_SCHEMA_V001,
      input.b5LocalManifestBytes
    ),
    tokenCountMeasurementBinding: binding(
      input.tokenCountMeasurementPath,
      DISTANT_CONNECTION_COMPARISON_TOKEN_COUNT_MEASUREMENT_SCHEMA_V001,
      input.tokenCountMeasurementBytes
    ),
    rawResponseBinding: binding(
      input.rawResponsePath,
      DISTANT_CONNECTION_COMPARISON_B6_RAW_RESPONSE_SCHEMA_V001,
      input.rawResponseBytes
    ),
    candidateResponseBinding: binding(
      input.candidateResponsePath,
      DISTANT_CONNECTION_COMPARISON_CANDIDATE_RESPONSE_SCHEMA_V001,
      candidateResponseBytes
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
        priceSnapshotSchema,
        input.priceSnapshotBytes
      ),
      ...calculated,
      totalUsd: calculated.totalNanoUsd / 1_000_000_000,
      maximumNanoUsd: input.maximumNanoUsd,
      withinMaximum: true
    },
    validation: {
      decision: 'passed',
      tokenCountMeasurementRevalidated: true,
      indexReferenceValidation: 'passed',
      deterministicFormalIdResolution: 'passed',
      candidateCount: candidateResponse.candidates.length
    }
  };
  const manifestBytes = serializeDistantConnectionComparisonB6RunManifestV001(manifest);
  return {candidateResponse, candidateResponseBytes, manifest, manifestBytes};
}

export function assertDistantConnectionComparisonB6ArtifactSetV001(
  input: DistantConnectionComparisonB6ArtifactSetV001
): void {
  const candidateResponse = decodeDistantConnectionComparisonCandidateResponseV001(
    input.candidateResponseBytes,
    input.sourcePackagePath,
    input.sourcePackageBytes,
    input.indexedModelInputPath,
    input.indexedModelInputBytes,
    input.rawResponsePath,
    input.rawResponseBytes
  );
  const manifest = decodeDistantConnectionComparisonB6RunManifestV001(input.manifestBytes);
  const rebuilt = buildDistantConnectionComparisonB6ResultArtifactsV001(input);
  if (!rebuilt.candidateResponseBytes.equals(Buffer.from(input.candidateResponseBytes))
    || !rebuilt.manifestBytes.equals(Buffer.from(input.manifestBytes))
    || manifest.validation.candidateCount !== candidateResponse.candidates.length) {
    fail(
      'B6_MANIFEST_INVALID',
      '比較用B6成果物が全上流実byteからの決定的再構築結果と一致しません'
    );
  }
}
