import assert from 'node:assert/strict';
import test from 'node:test';

import {formalJsonBytesV001} from './gemini_agentic_pleasant_candidate_v001.mjs';
import {
  buildProviderIdContractReviewV002,
  buildSavedRawCandidateResultV002,
  extractSavedInteractionOutputV002,
  validateProviderIdContractReviewV002,
} from './gemini_agentic_pleasant_candidate_v002.mjs';

const candidateValue = {
  candidates: [
    {startTimeMs: 1000, endTimeMs: 9000, factualDescription: '成功して笑う。'},
    {startTimeMs: 7000, endTimeMs: 12000, factualDescription: '驚いて声を上げる。'},
  ],
};
const envelopeWithoutId = {
  status: 'completed',
  created: '2026-09-03T04:40:34Z',
  updated: '2026-09-03T04:40:34Z',
  object: 'interaction',
  model: 'gemini-3.5-flash-lite',
  steps: [
    {type: 'processing_call', id: 'call-1'},
    {type: 'processing_result', call_id: 'call-1'},
    {type: 'model_output', content: [{
      type: 'text',
      text: JSON.stringify(candidateValue),
    }]},
  ],
};
const exactRequestBytes = formalJsonBytesV001({request: 'fixed'});
const rawResponseBytes = Buffer.from(JSON.stringify(envelopeWithoutId));
const executionRecord = {
  exactRequest: {fileSha256: 'unused'},
  rawResponse: {fileSha256: 'unused'},
  providerStatus: 'completed',
  model: 'gemini-3.5-flash-lite',
  transport: {
    httpStatus: 200,
    httpOk: true,
    apiCommunicationCount: 1,
    automaticRetries: 0,
  },
};

const withActualHashes = async () => {
  const {sha256BytesV001} = await import(
    './gemini_agentic_pleasant_candidate_v001.mjs'
  );
  return {
    ...executionRecord,
    exactRequest: {fileSha256: sha256BytesV001(exactRequestBytes)},
    rawResponse: {fileSha256: sha256BytesV001(rawResponseBytes)},
  };
};

test('completed saved response without provider ID is extractable', () => {
  const extracted = extractSavedInteractionOutputV002(envelopeWithoutId);
  assert.equal(extracted.status, 'extracted');
  assert.equal(extracted.providerResponseId, null);
  assert.deepEqual(extracted.value, candidateValue);
});

test('present provider ID must still be a non-empty string', () => {
  assert.equal(extractSavedInteractionOutputV002({
    ...envelopeWithoutId,
    id: '',
  }).code, 'PROVIDER_RESPONSE_ID_INVALID_WHEN_PRESENT');
});

test('saved result binds the composite identity without inventing an ID', async () => {
  const built = buildSavedRawCandidateResultV002({
    exactRequestBytes,
    rawResponseBytes,
    envelope: envelopeWithoutId,
    executionRecord: await withActualHashes(),
    candidateValue,
  });
  assert.equal(built.status, 'built');
  assert.equal(built.value.providerResponseId, null);
  assert.equal(built.value.executionIdentity.providerResponseId, null);
  assert.match(built.value.executionIdentity.executionIdentitySha256, /^[0-9a-f]{64}$/u);
});

test('total duration and pure playback duration are measured separately', async () => {
  const built = buildSavedRawCandidateResultV002({
    exactRequestBytes,
    rawResponseBytes,
    envelope: envelopeWithoutId,
    executionRecord: await withActualHashes(),
    candidateValue,
  });
  assert.equal(built.value.workload.candidateDurationTotalMs, 13000);
  assert.equal(built.value.workload.purePlaybackTimeMs, 11000);
  assert.equal(built.value.workload.longestCandidateMs, 8000);
  assert.equal(built.value.workload.medianCandidateMs, 6500);
});

test('official contract review preserves the schema contradiction', () => {
  const review = buildProviderIdContractReviewV002({rawResponseSha256: 'a'.repeat(64)});
  assert.deepEqual(review.officialSchemaFacts.requiredFields, ['status']);
  assert.equal(review.officialSchemaFacts.idDescriptionSaysRequired, true);
  assert.equal(review.officialSchemaFacts.idIncludedInRequiredFields, false);
  assert.deepEqual(validateProviderIdContractReviewV002(review), {status: 'passed'});
});
