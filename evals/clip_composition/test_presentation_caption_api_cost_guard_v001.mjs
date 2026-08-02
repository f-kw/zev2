import assert from 'node:assert/strict';
import test from 'node:test';

import {
  PRESENTATION_CAPTION_API_COST_POLICY_V001,
  PRESENTATION_CAPTION_API_OFFICIAL_SOURCE_SPECS_V001,
  buildPresentationCaptionCountTokensRequestV001,
  buildPresentationCaptionResidualRiskAcceptanceV001,
  derivePresentationCaptionPostSendCostV001,
  derivePresentationCaptionPreSendCostV001,
  parsePresentationCaptionCountTokensResponseV001,
  presentationCaptionApiBytesContainSecretV001,
  validatePresentationCaptionApiOfficialVerificationV001,
  validatePresentationCaptionResidualRiskAcceptanceV001,
} from './presentation_caption_api_cost_guard_v001.mjs';
import {
  buildPresentationCaptionSemanticSourcePackageV001,
} from './presentation_caption_semantic_source_package_v001.mjs';

const officialVerification = () => {
  const sources = PRESENTATION_CAPTION_API_OFFICIAL_SOURCE_SPECS_V001.map(
    ({sourceId, url, basename}, index) => ({
      sourceId,
      url,
      observedAt: '2026-07-29T00:00:00.000Z',
      snapshotPath: `fixture/${basename}`,
      snapshotFileSha256: (index + 1).toString(16).repeat(64),
      snapshotByteLength: index + 1,
    }),
  );
  const sourceById = new Map(sources.map((source) => [source.sourceId, source]));
  const wholeSnapshotEvidence = (sourceId) => {
    const source = sourceById.get(sourceId);
    return [{
      sourceId,
      utf8ByteOffset: 0,
      utf8ByteLength: source.snapshotByteLength,
      excerptSha256: source.snapshotFileSha256,
      locatorLabel: `whole-snapshot:${sourceId}`,
    }];
  };
  return {
    modelId: 'gemini-3.6-flash',
    modelResource: 'models/gemini-3.6-flash',
    observedAt: '2026-07-29T00:00:00.000Z',
    inputLimit: 1_048_576,
    outputLimit: 65_536,
    tier: 'PAID_STANDARD_DEFAULT_BY_OMISSION',
    inputPriceNanoUsdPerToken: 1_500,
    outputPriceNanoUsdPerToken: 7_500,
    sources,
    claims: [
      ['model-exists', 'latest-model'],
      ['input-limit', 'latest-model'],
      ['output-limit', 'latest-model'],
      ['standard-input-price', 'pricing'],
      ['standard-output-price', 'pricing'],
      ['service-tier-omission-standard', 'pricing'],
    ].map(([claimId, sourceId]) => ({
      claimId,
      verdict: 'verified',
      evidence: wholeSnapshotEvidence(sourceId),
    })).concat([
      {
        claimId: 'count-tokens-unbilled',
        verdict: 'unverified',
        evidence: [],
      },
      {
        claimId: 'count-tokens-upper-bounds-prompt-billing',
        verdict: 'contradicted',
        evidence: wholeSnapshotEvidence('tokens-guide'),
      },
      {
        claimId: 'max-output-upper-bounds-candidate-plus-thinking',
        verdict: 'unverified',
        evidence: [],
      },
    ]),
  };
};

test('C01 必須6 claimがverifiedでなければ通信前拒否', () => {
  const value = officialVerification();
  value.claims[0] = {...value.claims[0], verdict: 'unverified', evidence: []};
  assert.equal(
    validatePresentationCaptionApiOfficialVerificationV001(value).code,
    'API_MODEL_OR_PRICE_UNVERIFIED',
  );
});

test('C02 countTokens課金未確認でも正しい受容記録なら通る', () => {
  const verification = officialVerification();
  const built = buildPresentationCaptionResidualRiskAcceptanceV001(verification);
  assert.equal(built.status, 'built');
  assert.equal(
    validatePresentationCaptionResidualRiskAcceptanceV001({
      acceptance: built.value,
      officialVerification: verification,
    }).status,
    'passed',
  );
});

test('C03 prompt上界claimの受容改変をcode 24へ帰属', () => {
  const verification = officialVerification();
  const built = buildPresentationCaptionResidualRiskAcceptanceV001(verification);
  const acceptance = structuredClone(built.value);
  acceptance.claimBindings[1].acceptedVerdict = 'verified';
  assert.equal(
    validatePresentationCaptionResidualRiskAcceptanceV001({
      acceptance,
      officialVerification: verification,
    }).code,
    'API_PROMPT_TOKEN_BOUND_RISK_ACCEPTANCE_INVALID',
  );
});

test('C04 output上界claimの受容改変をcode 25へ帰属', () => {
  const verification = officialVerification();
  const built = buildPresentationCaptionResidualRiskAcceptanceV001(verification);
  const acceptance = structuredClone(built.value);
  acceptance.claimBindings[2].acceptedVerdict = 'verified';
  assert.equal(
    validatePresentationCaptionResidualRiskAcceptanceV001({
      acceptance,
      officialVerification: verification,
    }).code,
    'API_OUTPUT_TOKEN_BOUND_RISK_ACCEPTANCE_INVALID',
  );
});

test('C05 受容記録のcanonical SHAは決定的', () => {
  const first =
    buildPresentationCaptionResidualRiskAcceptanceV001(officialVerification());
  const second =
    buildPresentationCaptionResidualRiskAcceptanceV001(officialVerification());
  assert.equal(first.canonicalSha256, second.canonicalSha256);
  const descriptor = Object.getOwnPropertyDescriptor(
    buildPresentationCaptionSemanticSourcePackageV001,
    'validatePresentationCaptionApiStaticImportGraphV001',
  );
  assert.equal(typeof descriptor?.value, 'function');
  assert.equal(
    descriptor.value,
    buildPresentationCaptionSemanticSourcePackageV001
      .validatePresentationCaptionApiStaticImportGraphV001,
  );
  assert.equal(descriptor.enumerable, false);
  assert.equal(descriptor.writable, false);
  assert.equal(descriptor.configurable, false);
});

test('C06 countTokensのexact応答だけを受ける', () => {
  const rawBytes = Buffer.from(
    '{"totalTokens":100,"promptTokensDetails":[{"modality":"TEXT","tokenCount":100}]}',
  );
  assert.equal(parsePresentationCaptionCountTokensResponseV001({
    rawBytes,
    httpStatus: 200,
    contentType: 'application/json; charset=UTF-8',
  }).status, 'passed');
  assert.equal(parsePresentationCaptionCountTokensResponseV001({
    rawBytes: Buffer.from(
      '{"totalTokens":100,"promptTokensDetails":[]}',
    ),
    httpStatus: 200,
    contentType: 'application/json; charset=UTF-8',
  }).code, 'API_COST_PROBE_INVALID');
});

test('C07 送信前BigInt式は上限以下だけを受ける', () => {
  const result = derivePresentationCaptionPreSendCostV001({
    probeInputTokens: 100,
    finalInputTokens: 101,
  });
  assert.equal(result.status, 'passed');
  assert.ok(
    result.preSendEstimateNanoUsd
      <= PRESENTATION_CAPTION_API_COST_POLICY_V001.maximumNanoUsd,
  );
});

test('C08 入力費用で上限を使い切る場合は送信前拒否', () => {
  assert.equal(derivePresentationCaptionPreSendCostV001({
    probeInputTokens: Math.ceil(500_000_000 / 1_500),
    finalInputTokens: 1,
  }).code, 'API_BUDGET_EXCEEDED_BEFORE_SEND');
});

test('C09 countTokens wrapperはmodel以外を無改変で包む', () => {
  const request = {
    systemInstruction: {parts: [{text: 'x'}]},
    contents: [{role: 'user', parts: [{text: 'y'}]}],
    generationConfig: {candidateCount: 1},
  };
  const built = buildPresentationCaptionCountTokensRequestV001(request);
  assert.equal(built.status, 'built');
  const projected = {...built.value.generateContentRequest};
  delete projected.model;
  assert.deepEqual(projected, request);
});

test('C10 事後usageとsecretを事実だけで検査する', () => {
  const result = derivePresentationCaptionPostSendCostV001({
    usageMetadata: {
      promptTokenCount: 100,
      candidatesTokenCount: 20,
      thoughtsTokenCount: 30,
      totalTokenCount: 150,
    },
    finalInputTokens: 90,
    maxOutputTokens: 40,
    preSendEstimateNanoUsd: 100_000,
  });
  assert.equal(result.status, 'passed');
  assert.equal(
    result.estimateComparison.promptTokensExceededFinalInputTokens,
    true,
  );
  assert.equal(
    presentationCaptionApiBytesContainSecretV001(
      Buffer.from('before-secret-after'),
      'secret',
    ),
    true,
  );
});
