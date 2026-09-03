import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildGeminiAgenticPleasantCandidateResultV001,
  buildGeminiAgenticPleasantExactRequestV001,
  buildGeminiAgenticPleasantOverlapDiagnosticV001,
  calculateGeminiAgenticPleasantCostV001,
  extractInteractionOutputV001,
  formalJsonBytesV001,
  inspectAgenticEvidenceV001,
  validateGeminiAgenticPleasantCandidatesV001,
  validateGeminiAgenticPleasantExactRequestV001,
} from './gemini_agentic_pleasant_candidate_v001.mjs';

const candidateValue = {
  candidates: [
    {startTimeMs: 1000, endTimeMs: 9000, factualDescription: '成功して笑う。'},
    {startTimeMs: 61000, endTimeMs: 75000, factualDescription: '驚いて声を上げる。'},
  ],
};
const envelope = {
  id: 'interaction-test-001',
  model: 'gemini-3.5-flash-lite',
  status: 'completed',
  steps: [
    {type: 'processing_call', id: 'call-1'},
    {type: 'processing_result', call_id: 'call-1'},
    {type: 'model_output', content: [{type: 'text', text: JSON.stringify(candidateValue)}]},
  ],
  usage: {
    total_input_tokens: 100,
    total_tool_use_tokens: 200,
    total_output_tokens: 30,
    total_thought_tokens: 20,
  },
};
const commentArtifact = {
  schemaId: 'comment-velocity-minute-series-artifact-v001',
  sourceVideoId: 'o8rZAhARXAc',
  sourceDurationMs: 11898441,
  minuteSeries: Array.from({length: 98}, (_, index) => ({
    minuteIndex: index,
    sourceStartMs: index * 60000,
    sourceEndMs: (index + 1) * 60000,
    isFullMinute: true,
    relativeToStreamBaseline: 1.1,
  })),
};

test('exact request fixes one YouTube video, agentic mode, schema, and minimal thinking', () => {
  const request = buildGeminiAgenticPleasantExactRequestV001();
  assert.deepEqual(validateGeminiAgenticPleasantExactRequestV001(request), {
    status: 'passed',
  });
  assert.equal(request.input.filter((item) => item.type === 'video').length, 1);
  assert.equal(request.input[0].processing, 'agentic');
  assert.equal(request.generation_config.thinking_level, 'minimal');
  assert.equal(request.response_format.mime_type, 'application/json');
  assert.equal(request.response_format.schema.properties.candidates.maxItems, 20);
});

test('strict validator rejects extra fields, invalid time, duplicates, and wrong order', () => {
  assert.equal(validateGeminiAgenticPleasantCandidatesV001(candidateValue).status, 'passed');
  assert.equal(validateGeminiAgenticPleasantCandidatesV001({
    candidates: [{...candidateValue.candidates[0], score: 1}],
  }).code, 'CANDIDATE_SCHEMA_INVALID');
  assert.equal(validateGeminiAgenticPleasantCandidatesV001({
    candidates: [{startTimeMs: 1, endTimeMs: 1, factualDescription: '事実'}],
  }).code, 'CANDIDATE_END_INVALID');
  assert.equal(validateGeminiAgenticPleasantCandidatesV001({
    candidates: [candidateValue.candidates[0], candidateValue.candidates[0]],
  }).code, 'CANDIDATE_EXACT_DUPLICATE');
  assert.equal(validateGeminiAgenticPleasantCandidatesV001({
    candidates: [candidateValue.candidates[1], candidateValue.candidates[0]],
  }).code, 'CANDIDATE_ORDER_NONDETERMINISTIC');
});

test('raw response rebuild and candidate IDs are deterministic', () => {
  const requestBytes = formalJsonBytesV001(buildGeminiAgenticPleasantExactRequestV001());
  const rawBytes = formalJsonBytesV001(envelope);
  const extracted = extractInteractionOutputV001(envelope);
  assert.equal(extracted.status, 'extracted');
  const first = buildGeminiAgenticPleasantCandidateResultV001({
    exactRequestBytes: requestBytes,
    rawResponseBytes: rawBytes,
    providerEnvelope: envelope,
    candidateValue: extracted.value,
  });
  const second = buildGeminiAgenticPleasantCandidateResultV001({
    exactRequestBytes: requestBytes,
    rawResponseBytes: rawBytes,
    providerEnvelope: envelope,
    candidateValue: extracted.value,
  });
  assert.equal(first.status, 'built');
  assert.deepEqual(first, second);
  assert.notEqual(
    first.value.candidates[0].candidateId,
    first.value.candidates[1].candidateId,
  );
});

test('agentic evidence requires paired processing calls and results', () => {
  const evidence = inspectAgenticEvidenceV001(envelope);
  assert.equal(evidence.agenticProcessingObserved, true);
  assert.equal(evidence.pairedProcessingCallCount, 1);
  assert.deepEqual(evidence.inspectedMediaIntervals, []);
});

test('overlap diagnostic uses time overlap only and rebuilds deterministically', () => {
  const requestBytes = formalJsonBytesV001(buildGeminiAgenticPleasantExactRequestV001());
  const rawBytes = formalJsonBytesV001(envelope);
  const candidateResult = buildGeminiAgenticPleasantCandidateResultV001({
    exactRequestBytes: requestBytes,
    rawResponseBytes: rawBytes,
    providerEnvelope: envelope,
    candidateValue,
  }).value;
  const candidateResultBytes = formalJsonBytesV001(candidateResult);
  const commentArtifactBytes = formalJsonBytesV001(commentArtifact);
  const first = buildGeminiAgenticPleasantOverlapDiagnosticV001({
    candidateResult,
    candidateResultBytes,
    commentArtifact,
    commentArtifactBytes,
  });
  const second = buildGeminiAgenticPleasantOverlapDiagnosticV001({
    candidateResult,
    candidateResultBytes,
    commentArtifact,
    commentArtifactBytes,
  });
  assert.equal(first.status, 'built');
  assert.deepEqual(first, second);
  assert.equal(first.value.counts.overlappingGeminiCandidateCount, 2);
  assert.equal(first.value.counts.commentOnlyIntervalCount, 96);
});

test('cost uses input plus tool tokens and output plus thinking tokens', () => {
  const result = calculateGeminiAgenticPleasantCostV001(envelope.usage);
  assert.equal(result.status, 'calculated');
  assert.equal(result.value.inputAndToolUseTokens, 300);
  assert.equal(result.value.outputAndThinkingTokens, 50);
  assert.equal(result.value.calculatedNanoUsd, '215000');
});

