import {
  canonicalizePresentationCaptionB1JsonV001,
  decodePresentationCaptionB1StrictJsonV001,
  serializePresentationCaptionB1FormalJsonV001,
  sha256PresentationCaptionB1BytesV001,
} from './presentation_caption_semantic_source_package_v001.mjs';

export const PRESENTATION_CAPTION_API_COST_VIOLATION_CODES_V001 =
  Object.freeze([
    'API_BUDGET_BINDING_INVALID',
    'API_MODEL_OR_PRICE_UNVERIFIED',
    'API_COUNT_TOKENS_BILLING_RISK_ACCEPTANCE_INVALID',
    'API_PROMPT_TOKEN_BOUND_RISK_ACCEPTANCE_INVALID',
    'API_OUTPUT_TOKEN_BOUND_RISK_ACCEPTANCE_INVALID',
    'API_COST_PROBE_INVALID',
    'API_BUDGET_EXCEEDED_BEFORE_SEND',
    'API_BUDGET_REQUEST_MISMATCH',
    'API_TRANSPORT_CONTRACT_VIOLATION',
    'API_USAGE_ACCOUNTING_INVALID',
    'API_RESPONSE_TIER_MISMATCH',
    'SECRET_LEAK_DETECTED',
    'API_USAGE_BUDGET_VIOLATION',
    'B6_DOWNSTREAM_EXECUTION_FAILED',
  ]);

export const PRESENTATION_CAPTION_API_COST_POLICY_V001 = Object.freeze({
  modelId: 'gemini-3.6-flash',
  modelResource: 'models/gemini-3.6-flash',
  inputLimit: 1048576,
  outputLimit: 65536,
  tier: 'PAID_STANDARD_DEFAULT_BY_OMISSION',
  inputPriceNanoUsdPerToken: 1500,
  outputPriceNanoUsdPerToken: 7500,
  maximumNanoUsd: 500000000,
  countTokensCalls: 2,
  generateContentCalls: 1,
  automaticRetries: 0,
  timeoutMilliseconds: 600000,
  countTokensEndpoint:
    'https://generativelanguage.googleapis.com/v1beta/'
      + 'models/gemini-3.6-flash:countTokens',
  generateContentEndpoint:
    'https://generativelanguage.googleapis.com/v1beta/'
      + 'models/gemini-3.6-flash:generateContent',
});

export const PRESENTATION_CAPTION_API_OFFICIAL_CLAIM_IDS_V001 =
  Object.freeze([
    'model-exists',
    'input-limit',
    'output-limit',
    'standard-input-price',
    'standard-output-price',
    'service-tier-omission-standard',
    'count-tokens-unbilled',
    'count-tokens-upper-bounds-prompt-billing',
    'max-output-upper-bounds-candidate-plus-thinking',
  ]);

export const PRESENTATION_CAPTION_API_REQUIRED_VERIFIED_CLAIM_IDS_V001 =
  Object.freeze(PRESENTATION_CAPTION_API_OFFICIAL_CLAIM_IDS_V001.slice(0, 6));

export const PRESENTATION_CAPTION_API_ACCEPTED_RISK_CLAIM_IDS_V001 =
  Object.freeze(PRESENTATION_CAPTION_API_OFFICIAL_CLAIM_IDS_V001.slice(6));

export const PRESENTATION_CAPTION_API_OFFICIAL_SOURCE_SPECS_V001 =
  Object.freeze([
    Object.freeze({
      sourceId: 'pricing',
      url: 'https://ai.google.dev/gemini-api/docs/pricing',
      basename: 'pricing.snapshot.html',
    }),
    Object.freeze({
      sourceId: 'tokens-guide',
      url: 'https://ai.google.dev/gemini-api/docs/tokens',
      basename: 'tokens-guide.snapshot.html',
    }),
    Object.freeze({
      sourceId: 'count-tokens-api',
      url: 'https://ai.google.dev/api/tokens',
      basename: 'count-tokens-api.snapshot.html',
    }),
    Object.freeze({
      sourceId: 'billing',
      url: 'https://ai.google.dev/gemini-api/docs/billing',
      basename: 'billing.snapshot.html',
    }),
    Object.freeze({
      sourceId: 'thinking',
      url: 'https://ai.google.dev/gemini-api/docs/generate-content/thinking',
      basename: 'thinking.snapshot.html',
    }),
    Object.freeze({
      sourceId: 'latest-model',
      url: 'https://ai.google.dev/gemini-api/docs/latest-model',
      basename: 'latest-model.snapshot.html',
    }),
  ]);

const OFFICIAL_CLAIM_VERDICTS = Object.freeze([
  'verified',
  'verified',
  'verified',
  'verified',
  'verified',
  'verified',
  'unverified',
  'contradicted',
  'unverified',
]);

const OFFICIAL_CLAIM_EVIDENCE_SOURCE_IDS = Object.freeze([
  'latest-model',
  'latest-model',
  'latest-model',
  'pricing',
  'pricing',
  'pricing',
  null,
  'tokens-guide',
  null,
]);

const ACCEPTANCE_LITERALS = Object.freeze({
  schemaVersion: 'presentation-caption-api-residual-risk-acceptance-v001',
  acceptanceId:
    'kawafmm-vertical-caption-cost-risk-acceptance-20260729-v001',
  acceptedBy: 'kawafmm',
  acceptedOn: '2026-07-29',
  maximumNanoUsd: 500000000,
  sendPermission:
    'allow-one-generate-content-after-official-facts-and-bigint-cap-pass',
});

const exactKeys = (value, keys) =>
  value !== null
  && typeof value === 'object'
  && !Array.isArray(value)
  && JSON.stringify(Object.keys(value)) === JSON.stringify(keys);

const sha256 = (bytes) => {
  const result = sha256PresentationCaptionB1BytesV001(bytes);
  if (result?.status !== 'hashed') throw new TypeError('SHA-256 failed');
  return result.sha256;
};

const canonicalSha256 = (value) => {
  const result = canonicalizePresentationCaptionB1JsonV001(value);
  if (result?.status !== 'canonicalized') {
    throw new TypeError('canonical JSON failed');
  }
  return sha256(result.bytes);
};

const formalBytes = (value) => {
  const result = serializePresentationCaptionB1FormalJsonV001(value);
  if (result?.status !== 'serialized') {
    throw new TypeError('formal JSON failed');
  }
  return result.bytes;
};

const positiveSafeInteger = (value) =>
  Number.isSafeInteger(value) && value > 0;

const nonNegativeSafeInteger = (value) =>
  Number.isSafeInteger(value) && value >= 0;

const validSha256 = (value) =>
  typeof value === 'string' && /^[0-9a-f]{64}$/u.test(value);

const validRfc3339UtcMilliseconds = (value) =>
  typeof value === 'string'
  && /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}\.[0-9]{3}Z$/u
    .test(value)
  && !Number.isNaN(Date.parse(value))
  && new Date(value).toISOString() === value;

const makeFailure = (code, path, facts = {}) => Object.freeze({
  status: 'rejected',
  code,
  relatedPaths: Object.freeze([path]),
  facts: Object.freeze({...facts}),
});

export function validatePresentationCaptionApiOfficialVerificationV001(value) {
  if (!exactKeys(value, [
    'modelId',
    'modelResource',
    'observedAt',
    'inputLimit',
    'outputLimit',
    'tier',
    'inputPriceNanoUsdPerToken',
    'outputPriceNanoUsdPerToken',
    'sources',
    'claims',
  ])) {
    return makeFailure('API_BUDGET_BINDING_INVALID', '$.officialVerification');
  }
  const policy = PRESENTATION_CAPTION_API_COST_POLICY_V001;
  if (value.modelId !== policy.modelId
    || value.modelResource !== policy.modelResource
    || value.inputLimit !== policy.inputLimit
    || value.outputLimit !== policy.outputLimit
    || value.tier !== policy.tier
    || value.inputPriceNanoUsdPerToken !== policy.inputPriceNanoUsdPerToken
    || value.outputPriceNanoUsdPerToken !== policy.outputPriceNanoUsdPerToken
    || !Array.isArray(value.sources)
    || value.sources.length !== 6
    || !Array.isArray(value.claims)
    || value.claims.length !== 9) {
    return makeFailure('API_BUDGET_BINDING_INVALID', '$.officialVerification');
  }
  const sourceById = new Map();
  for (let index = 0; index < value.sources.length; index += 1) {
    const source = value.sources[index];
    const expected = PRESENTATION_CAPTION_API_OFFICIAL_SOURCE_SPECS_V001[index];
    if (!exactKeys(source, [
      'sourceId',
      'url',
      'observedAt',
      'snapshotPath',
      'snapshotFileSha256',
      'snapshotByteLength',
    ])
      || source.sourceId !== expected.sourceId
      || source.url !== expected.url
      || !validRfc3339UtcMilliseconds(source.observedAt)
      || typeof source.snapshotPath !== 'string'
      || source.snapshotPath.length === 0
      || !validSha256(source.snapshotFileSha256)
      || !positiveSafeInteger(source.snapshotByteLength)) {
      return makeFailure(
        'API_BUDGET_BINDING_INVALID',
        `$.officialVerification.sources[${index}]`,
      );
    }
    sourceById.set(source.sourceId, source);
  }
  if (!validRfc3339UtcMilliseconds(value.observedAt)
    || value.observedAt !== value.sources
      .map((source) => source.observedAt)
      .sort()
      .at(-1)) {
    return makeFailure(
      'API_BUDGET_BINDING_INVALID',
      '$.officialVerification.observedAt',
    );
  }
  for (let index = 0; index < value.claims.length; index += 1) {
    const claim = value.claims[index];
    const expectedEvidenceSourceId =
      OFFICIAL_CLAIM_EVIDENCE_SOURCE_IDS[index];
    if (!exactKeys(claim, ['claimId', 'verdict', 'evidence'])
      || claim.claimId !== PRESENTATION_CAPTION_API_OFFICIAL_CLAIM_IDS_V001[index]
      || !['verified', 'unverified', 'contradicted'].includes(claim.verdict)
      || !Array.isArray(claim.evidence)
      || claim.evidence.length !== (claim.verdict === 'unverified' ? 0 : 1)) {
      return makeFailure(
        'API_BUDGET_BINDING_INVALID',
        `$.officialVerification.claims[${index}]`,
      );
    }
    if (claim.verdict !== 'unverified') {
      const evidence = claim.evidence[0];
      const source = sourceById.get(expectedEvidenceSourceId);
      if (expectedEvidenceSourceId === null
        || !exactKeys(evidence, [
        'sourceId',
        'utf8ByteOffset',
        'utf8ByteLength',
        'excerptSha256',
        'locatorLabel',
      ])
        || evidence.sourceId !== expectedEvidenceSourceId
        || !nonNegativeSafeInteger(evidence.utf8ByteOffset)
        || evidence.utf8ByteOffset !== 0
        || !positiveSafeInteger(evidence.utf8ByteLength)
        || evidence.utf8ByteLength !== source.snapshotByteLength
        || !validSha256(evidence.excerptSha256)
        || evidence.excerptSha256 !== source.snapshotFileSha256
        || evidence.locatorLabel
          !== `whole-snapshot:${expectedEvidenceSourceId}`) {
        return makeFailure(
          'API_BUDGET_BINDING_INVALID',
          `$.officialVerification.claims[${index}].evidence[0]`,
        );
      }
    }
  }
  const missingRequired = value.claims
    .slice(0, 6)
    .filter((claim) => claim.verdict !== 'verified')
    .map((claim) => claim.claimId);
  if (missingRequired.length > 0) {
    return makeFailure(
      'API_MODEL_OR_PRICE_UNVERIFIED',
      '$.officialVerification.claims',
      {missingRequired},
    );
  }
  for (let index = 6; index < value.claims.length; index += 1) {
    if (value.claims[index].verdict !== OFFICIAL_CLAIM_VERDICTS[index]) {
      return makeFailure(
        'API_BUDGET_BINDING_INVALID',
        `$.officialVerification.claims[${index}].verdict`,
      );
    }
  }
  return Object.freeze({
    status: 'passed',
    officialClaimsCanonicalSha256: canonicalSha256(value.claims),
  });
}

export function buildPresentationCaptionResidualRiskAcceptanceV001(
  officialVerification,
) {
  const validation =
    validatePresentationCaptionApiOfficialVerificationV001(officialVerification);
  if (validation.status !== 'passed') return validation;
  const claimById = new Map(
    officialVerification.claims.map((claim) => [claim.claimId, claim]),
  );
  const value = {
    schemaVersion: ACCEPTANCE_LITERALS.schemaVersion,
    acceptanceId: ACCEPTANCE_LITERALS.acceptanceId,
    acceptedBy: ACCEPTANCE_LITERALS.acceptedBy,
    acceptedOn: ACCEPTANCE_LITERALS.acceptedOn,
    maximumNanoUsd: ACCEPTANCE_LITERALS.maximumNanoUsd,
    officialClaimsCanonicalSha256:
      validation.officialClaimsCanonicalSha256,
    claimBindings: PRESENTATION_CAPTION_API_ACCEPTED_RISK_CLAIM_IDS_V001.map(
      (claimId) => ({
        claimId,
        acceptedVerdict: claimById.get(claimId).verdict,
      }),
    ),
    sendPermission: ACCEPTANCE_LITERALS.sendPermission,
  };
  return Object.freeze({
    status: 'built',
    value: Object.freeze(value),
    canonicalSha256: canonicalSha256(value),
  });
}

export function validatePresentationCaptionResidualRiskAcceptanceV001({
  acceptance,
  officialVerification,
}) {
  if (!exactKeys(acceptance, [
    'schemaVersion',
    'acceptanceId',
    'acceptedBy',
    'acceptedOn',
    'maximumNanoUsd',
    'officialClaimsCanonicalSha256',
    'claimBindings',
    'sendPermission',
  ])) {
    return makeFailure(
      'API_COUNT_TOKENS_BILLING_RISK_ACCEPTANCE_INVALID',
      '$.residualRiskAcceptance',
    );
  }
  const expected =
    buildPresentationCaptionResidualRiskAcceptanceV001(officialVerification);
  if (expected.status !== 'built') return expected;
  for (let index = 0; index < 3; index += 1) {
    const observed = acceptance.claimBindings?.[index];
    const wanted = expected.value.claimBindings[index];
    if (!exactKeys(observed, ['claimId', 'acceptedVerdict'])
      || observed.claimId !== wanted.claimId
      || observed.acceptedVerdict !== wanted.acceptedVerdict) {
      return makeFailure(
        PRESENTATION_CAPTION_API_COST_VIOLATION_CODES_V001[2 + index],
        `$.residualRiskAcceptance.claimBindings[${index}]`,
      );
    }
  }
  if (formalBytes(acceptance).equals(formalBytes(expected.value)) === false) {
    return makeFailure(
      'API_COUNT_TOKENS_BILLING_RISK_ACCEPTANCE_INVALID',
      '$.residualRiskAcceptance',
    );
  }
  return Object.freeze({
    status: 'passed',
    canonicalSha256: expected.canonicalSha256,
  });
}

export function buildPresentationCaptionCountTokensRequestV001(
  generateContentRequest,
) {
  if (!exactKeys(generateContentRequest, [
    'systemInstruction',
    'contents',
    'generationConfig',
  ])) {
    return makeFailure('API_COST_PROBE_INVALID', '$.generateContentRequest');
  }
  const value = {
    generateContentRequest: {
      model: PRESENTATION_CAPTION_API_COST_POLICY_V001.modelResource,
      systemInstruction: generateContentRequest.systemInstruction,
      contents: generateContentRequest.contents,
      generationConfig: generateContentRequest.generationConfig,
    },
  };
  return Object.freeze({
    status: 'built',
    value,
    bytes: formalBytes(value),
  });
}

export function parsePresentationCaptionCountTokensResponseV001({
  rawBytes,
  httpStatus,
  contentType,
}) {
  if (httpStatus !== 200
    || contentType !== 'application/json; charset=UTF-8'
    || !Buffer.isBuffer(rawBytes)) {
    return makeFailure('API_COST_PROBE_INVALID', '$.countTokensResponse');
  }
  const decoded = decodePresentationCaptionB1StrictJsonV001(rawBytes);
  if (decoded?.status !== 'decoded'
    || !exactKeys(decoded.value, ['totalTokens', 'promptTokensDetails'])
    || !positiveSafeInteger(decoded.value.totalTokens)
    || !Array.isArray(decoded.value.promptTokensDetails)
    || decoded.value.promptTokensDetails.length !== 1
    || !exactKeys(
      decoded.value.promptTokensDetails[0],
      ['modality', 'tokenCount'],
    )
    || decoded.value.promptTokensDetails[0].modality !== 'TEXT'
    || decoded.value.promptTokensDetails[0].tokenCount
      !== decoded.value.totalTokens) {
    return makeFailure('API_COST_PROBE_INVALID', '$.countTokensResponse');
  }
  return Object.freeze({
    status: 'passed',
    totalTokens: decoded.value.totalTokens,
    rawFileSha256: sha256(rawBytes),
  });
}

export function derivePresentationCaptionPreSendCostV001({
  probeInputTokens,
  finalInputTokens,
}) {
  if (!positiveSafeInteger(probeInputTokens)
    || !positiveSafeInteger(finalInputTokens)) {
    return makeFailure('API_COST_PROBE_INVALID', '$.tokenDiagnosis');
  }
  const policy = PRESENTATION_CAPTION_API_COST_POLICY_V001;
  const remaining = BigInt(policy.maximumNanoUsd)
    - BigInt(probeInputTokens) * BigInt(policy.inputPriceNanoUsdPerToken);
  if (remaining <= 0n) {
    return makeFailure(
      'API_BUDGET_EXCEEDED_BEFORE_SEND',
      '$.spendingAuthorization',
    );
  }
  const maxOutputTokens = Number(
    remaining / BigInt(policy.outputPriceNanoUsdPerToken)
      < BigInt(policy.outputLimit)
      ? remaining / BigInt(policy.outputPriceNanoUsdPerToken)
      : BigInt(policy.outputLimit),
  );
  if (!positiveSafeInteger(maxOutputTokens)) {
    return makeFailure(
      'API_BUDGET_EXCEEDED_BEFORE_SEND',
      '$.spendingAuthorization.maxOutputTokens',
    );
  }
  const preSendEstimate = BigInt(finalInputTokens)
      * BigInt(policy.inputPriceNanoUsdPerToken)
    + BigInt(maxOutputTokens)
      * BigInt(policy.outputPriceNanoUsdPerToken);
  if (preSendEstimate > BigInt(policy.maximumNanoUsd)) {
    return makeFailure(
      'API_BUDGET_EXCEEDED_BEFORE_SEND',
      '$.spendingAuthorization.preSendEstimateNanoUsd',
    );
  }
  return Object.freeze({
    status: 'passed',
    maxOutputTokens,
    preSendEstimateNanoUsd: Number(preSendEstimate),
  });
}

export function derivePresentationCaptionPostSendCostV001({
  usageMetadata,
  finalInputTokens,
  maxOutputTokens,
  preSendEstimateNanoUsd,
}) {
  if (!exactKeys(usageMetadata, [
    'promptTokenCount',
    'candidatesTokenCount',
    'thoughtsTokenCount',
    'totalTokenCount',
  ])) {
    return makeFailure('API_USAGE_ACCOUNTING_INVALID', '$.usageMetadata');
  }
  const values = Object.values(usageMetadata);
  if (!values.every((value) => Number.isSafeInteger(value) && value >= 0)
    || usageMetadata.totalTokenCount
      !== usageMetadata.promptTokenCount
        + usageMetadata.candidatesTokenCount
        + usageMetadata.thoughtsTokenCount) {
    return makeFailure('API_USAGE_ACCOUNTING_INVALID', '$.usageMetadata');
  }
  const policy = PRESENTATION_CAPTION_API_COST_POLICY_V001;
  const observed = BigInt(usageMetadata.promptTokenCount)
      * BigInt(policy.inputPriceNanoUsdPerToken)
    + BigInt(
      usageMetadata.candidatesTokenCount + usageMetadata.thoughtsTokenCount,
    ) * BigInt(policy.outputPriceNanoUsdPerToken);
  const result = {
    status: observed <= BigInt(policy.maximumNanoUsd)
      ? 'passed'
      : 'rejected',
    code: observed <= BigInt(policy.maximumNanoUsd)
      ? null
      : 'API_USAGE_BUDGET_VIOLATION',
    observedUsageCostNanoUsd: Number(observed),
    estimateComparison: {
      promptTokensExceededFinalInputTokens:
        usageMetadata.promptTokenCount > finalInputTokens,
      outputTokensExceededDerivedMaxOutputTokens:
        usageMetadata.candidatesTokenCount + usageMetadata.thoughtsTokenCount
          > maxOutputTokens,
      usageCostExceededPreSendEstimate:
        observed > BigInt(preSendEstimateNanoUsd),
    },
  };
  return Object.freeze(result);
}

export function presentationCaptionApiBytesContainSecretV001(bytes, secret) {
  return Buffer.isBuffer(bytes)
    && typeof secret === 'string'
    && secret.length > 0
    && bytes.includes(Buffer.from(secret, 'utf8'));
}
