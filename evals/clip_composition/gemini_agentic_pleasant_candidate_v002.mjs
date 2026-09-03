import {createHash} from 'node:crypto';

import {
  GEMINI_AGENTIC_PLEASANT_MODEL_V001,
  GEMINI_AGENTIC_PLEASANT_SOURCE_V001,
  buildGeminiAgenticPleasantOverlapDiagnosticV001,
  formalJsonBytesV001,
  inspectAgenticEvidenceV001,
  sha256BytesV001,
  validateGeminiAgenticPleasantCandidatesV001,
} from './gemini_agentic_pleasant_candidate_v001.mjs';

const fail = (code, path, facts = {}) => ({
  status: 'rejected',
  code,
  path,
  facts,
});

const exactKeys = (value, keys) =>
  value !== null
  && typeof value === 'object'
  && !Array.isArray(value)
  && JSON.stringify(Object.keys(value)) === JSON.stringify(keys);

const median = (values) => {
  if (values.length === 0) return null;
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1
    ? sorted[middle]
    : (sorted[middle - 1] + sorted[middle]) / 2;
};

const unionDuration = (candidates) => {
  if (candidates.length === 0) return 0;
  const sorted = [...candidates].sort((left, right) =>
    left.startTimeMs - right.startTimeMs
      || left.endTimeMs - right.endTimeMs,
  );
  let start = sorted[0].startTimeMs;
  let end = sorted[0].endTimeMs;
  let total = 0;
  for (const candidate of sorted.slice(1)) {
    if (candidate.startTimeMs <= end) {
      end = Math.max(end, candidate.endTimeMs);
    } else {
      total += end - start;
      start = candidate.startTimeMs;
      end = candidate.endTimeMs;
    }
  }
  return total + end - start;
};

const isIsoTimestamp = (value) =>
  typeof value === 'string'
  && Number.isFinite(Date.parse(value));

export const extractSavedInteractionOutputV002 = (envelope) => {
  if (envelope === null || typeof envelope !== 'object' || Array.isArray(envelope)) {
    return fail('INTERACTION_ENVELOPE_INVALID', '$');
  }
  if ('id' in envelope
    && (typeof envelope.id !== 'string' || envelope.id.length === 0)) {
    return fail('PROVIDER_RESPONSE_ID_INVALID_WHEN_PRESENT', '$.id');
  }
  if (envelope.status !== 'completed') {
    return fail('INTERACTION_NOT_COMPLETED', '$.status', {status: envelope.status});
  }
  if (envelope.model !== GEMINI_AGENTIC_PLEASANT_MODEL_V001) {
    return fail('INTERACTION_MODEL_MISMATCH', '$.model', {model: envelope.model});
  }
  if (envelope.object !== 'interaction') {
    return fail('INTERACTION_OBJECT_INVALID', '$.object');
  }
  if (!isIsoTimestamp(envelope.created) || !isIsoTimestamp(envelope.updated)) {
    return fail('INTERACTION_TIMESTAMP_INVALID', '$.created');
  }
  if (!Array.isArray(envelope.steps)) {
    return fail('INTERACTION_STEPS_INVALID', '$.steps');
  }
  const textParts = envelope.steps
    .filter((step) => step?.type === 'model_output')
    .flatMap((step) => Array.isArray(step.content) ? step.content : [])
    .filter((part) => part?.type === 'text' && typeof part.text === 'string')
    .map((part) => part.text);
  if (textParts.length !== 1) {
    return fail('MODEL_OUTPUT_TEXT_COUNT_INVALID', '$.steps', {
      observed: textParts.length,
    });
  }
  let value;
  try {
    value = JSON.parse(textParts[0]);
  } catch {
    return fail('MODEL_OUTPUT_JSON_INVALID', '$.steps');
  }
  return {
    status: 'extracted',
    value,
    text: textParts[0],
    providerResponseId: envelope.id ?? null,
  };
};

const candidateId = (rawResponseSha256, order) => {
  const digest = createHash('sha256')
    .update(rawResponseSha256)
    .update('\u0000')
    .update(String(order))
    .digest('hex');
  return `gemini-agentic-saved-raw-${digest}`;
};

export const buildSavedRawExecutionIdentityV002 = ({
  exactRequestBytes,
  rawResponseBytes,
  envelope,
  executionRecord,
  attemptId,
}) => {
  if (executionRecord?.transport?.httpStatus !== 200
    || executionRecord.transport.httpOk !== true
    || executionRecord.transport.apiCommunicationCount !== 1
    || executionRecord.transport.automaticRetries !== 0) {
    return fail('EXECUTION_TRANSPORT_BINDING_INVALID', '$.transport');
  }
  const exactRequestSha256 = sha256BytesV001(exactRequestBytes);
  const rawResponseSha256 = sha256BytesV001(rawResponseBytes);
  if (executionRecord?.exactRequest?.fileSha256 !== exactRequestSha256
    || executionRecord?.rawResponse?.fileSha256 !== rawResponseSha256
    || executionRecord.providerStatus !== envelope.status
    || executionRecord.model !== envelope.model) {
    return fail('EXECUTION_RECORD_BINDING_INVALID', '$');
  }
  const basis = {
    exactRequestSha256,
    rawResponseSha256,
    sourceVideoId: GEMINI_AGENTIC_PLEASANT_SOURCE_V001.sourceVideoId,
    publicYoutubeUrl: GEMINI_AGENTIC_PLEASANT_SOURCE_V001.publicYoutubeUrl,
    model: envelope.model,
    attemptId,
    executedAt: envelope.created,
    responseUpdatedAt: envelope.updated,
    httpStatus: executionRecord.transport.httpStatus,
    completionStatus: envelope.status,
    providerResponseId: envelope.id ?? null,
  };
  return {
    status: 'built',
    value: {
      ...basis,
      executionIdentitySha256: sha256BytesV001(formalJsonBytesV001(basis)),
      identityPolicy:
        '保存要求・保存応答・動画・モデル・試行・時刻・HTTP状態・完了状態の合成束縛',
      providerExecutionIdentifierAvailability:
        envelope.id === undefined
          ? 'top-level interaction id absent'
          : 'top-level interaction id present',
    },
  };
};

export const buildSavedRawCandidateResultV002 = ({
  exactRequestBytes,
  rawResponseBytes,
  envelope,
  executionRecord,
  candidateValue,
  attemptId = 'attempt-0001',
}) => {
  const validation = validateGeminiAgenticPleasantCandidatesV001(candidateValue);
  if (validation.status !== 'passed') return validation;
  const identity = buildSavedRawExecutionIdentityV002({
    exactRequestBytes,
    rawResponseBytes,
    envelope,
    executionRecord,
    attemptId,
  });
  if (identity.status !== 'built') return identity;
  const rawResponseSha256 = sha256BytesV001(rawResponseBytes);
  const candidates = candidateValue.candidates.map((candidate, index) => ({
    candidateId: candidateId(rawResponseSha256, index + 1),
    candidateOrder: index + 1,
    ...candidate,
    durationMs: candidate.endTimeMs - candidate.startTimeMs,
  }));
  const durations = candidates.map(({durationMs}) => durationMs);
  return {
    status: 'built',
    value: {
      schemaVersion: 'gemini-agentic-pleasant-candidate-result-v002',
      experimentId: 'o8rZAhARXAc-agentic-pleasant-candidates-v001',
      recoveryMode: 'saved-raw-only-no-api-communication',
      executionIdentity: identity.value,
      source: GEMINI_AGENTIC_PLEASANT_SOURCE_V001,
      model: GEMINI_AGENTIC_PLEASANT_MODEL_V001,
      providerResponseId: envelope.id ?? null,
      providerResponseIdRequiredByLocalContract: false,
      candidateOrderPolicy:
        'provider-chronological-array-order-bound-to-saved-raw-by-one-based-order',
      candidates,
      workload: {
        candidateCount: candidates.length,
        candidateDurationsMs: durations,
        candidateDurationTotalMs: durations.reduce((sum, value) => sum + value, 0),
        purePlaybackTimeMs: unionDuration(candidates),
        longestCandidateMs: durations.length === 0 ? null : Math.max(...durations),
        medianCandidateMs: median(durations),
        candidatesAtLeastOneMinute: durations.filter((value) => value >= 60000).length,
        candidatesAtLeastTwoMinutes: durations.filter((value) => value >= 120000).length,
      },
    },
  };
};

export const buildSavedRawOverlapDiagnosticV002 = ({
  candidateResult,
  candidateResultBytes,
  commentArtifact,
  commentArtifactBytes,
}) => {
  const built = buildGeminiAgenticPleasantOverlapDiagnosticV001({
    candidateResult,
    candidateResultBytes,
    commentArtifact,
    commentArtifactBytes,
  });
  if (built.status !== 'built') return built;
  return {
    status: 'built',
    value: {
      ...built.value,
      schemaVersion: 'gemini-agentic-comment-overlap-diagnostic-v002',
      geminiCandidateCount: candidateResult.candidates.length,
      counts: {
        geminiCandidateCount: candidateResult.candidates.length,
        ...built.value.counts,
      },
    },
  };
};

export const buildProviderIdContractReviewV002 = ({rawResponseSha256}) => ({
  schemaVersion: 'gemini-interactions-provider-id-contract-review-v002',
  observedOn: '2026-09-03',
  officialSources: [
    {
      url: 'https://ai.google.dev/api/interactions-api-v1',
      observation:
        'Interaction参照画面はidをoptionalと表示する一方、説明文にはRequiredと記載する',
    },
    {
      url: 'https://ai.google.dev/static/api/interactions-v1.openapi.json',
      observation:
        'components.schemas.Interaction.requiredはstatusだけでidを含まない',
    },
    {
      url: 'https://ai.google.dev/gemini-api/docs/interactions-overview',
      observation:
        'store=falseは応答と要求を後で取得するためのサーバー保存を行わないstateless動作である',
    },
  ],
  officialSchemaFacts: {
    responseSchema: 'components.schemas.Interaction',
    requiredFields: ['status'],
    idDeclaredAsProperty: true,
    idIncludedInRequiredFields: false,
    idDescriptionSaysRequired: true,
    specificationContainsInternalContradiction: true,
  },
  observedSavedResponse: {
    rawResponseSha256,
    httpStatus: 200,
    completionStatus: 'completed',
    topLevelInteractionIdPresent: false,
    topLevelAlternativeExecutionIdentifierPresent: false,
    processingCallIdMeaning:
      'Agentic処理stepのcall/result対応用でありInteraction全体のIDとして扱わない',
  },
  conclusion: {
    providerResponseIdGuaranteedByMachineReadableResponseSchema: false,
    originalStopClassification: 'local-saving-contract-overconstraint',
    savedRawRecoveryPermitted: true,
    fabricatedIdentifierPermitted: false,
  },
});

export const validateProviderIdContractReviewV002 = (review) => {
  if (!exactKeys(review.officialSchemaFacts, [
    'responseSchema',
    'requiredFields',
    'idDeclaredAsProperty',
    'idIncludedInRequiredFields',
    'idDescriptionSaysRequired',
    'specificationContainsInternalContradiction',
  ])) {
    return fail('OFFICIAL_SCHEMA_FACTS_INVALID', '$.officialSchemaFacts');
  }
  if (JSON.stringify(review.officialSchemaFacts.requiredFields)
      !== JSON.stringify(['status'])
    || review.officialSchemaFacts.idIncludedInRequiredFields !== false
    || review.conclusion?.providerResponseIdGuaranteedByMachineReadableResponseSchema
      !== false
    || review.conclusion?.fabricatedIdentifierPermitted !== false) {
    return fail('PROVIDER_ID_CONCLUSION_INVALID', '$.conclusion');
  }
  return {status: 'passed'};
};
