import {createHash} from 'node:crypto';

export const GEMINI_AGENTIC_PLEASANT_MODEL_V001 =
  'gemini-3.5-flash-lite';
export const GEMINI_AGENTIC_PLEASANT_ENDPOINT_V001 =
  'https://generativelanguage.googleapis.com/v1beta/interactions';
export const GEMINI_AGENTIC_PLEASANT_SOURCE_V001 = Object.freeze({
  sourceVideoId: 'o8rZAhARXAc',
  publicYoutubeUrl: 'https://www.youtube.com/watch?v=o8rZAhARXAc',
  localSourcePath:
    'evals/clip_composition/research/downloads/9dtwF5Exu5w/sources/'
      + 'o8rZAhARXAc/o8rZAhARXAc.mp4',
  localSourceSha256:
    '4c9911c860f7ed42cf6c66c1ceda605e5818381f695c26116632b1f86c4c2a06',
  sourceDurationMs: 11898441,
});
export const GEMINI_AGENTIC_PLEASANT_COMMENT_SERIES_V001 = Object.freeze({
  path:
    'evals/clip_composition/outputs/'
      + 'work-distant-connection-comparison-input-o8rZAhARXAc-v001/'
      + 'comment-velocity-minute-series-v001.json',
  fileSha256:
    'd3792d8e83729b95d0a417a956f63f40cb45512410b6484a1d3701b5646c28f9',
  expectedAboveBaselineFullMinuteCount: 98,
});
export const GEMINI_AGENTIC_PLEASANT_PROMPT_V001 = `この公開YouTube動画の全体を探索し、映像と音声を直接確認してください。

単独で見ても人間が「見ていて気持ちいい」「面白い」「見続けたい」と感じる可能性がある場面を広めに探してください。意味上重要という理由だけでは選ばないでください。

手掛かりとして、映像上の出来事、配信者の反応、音声の変化、成功、失敗、驚き、笑い、緊張から解放される瞬間、視覚的な変化を使えます。ただし「良い動画」の詳細な定義を独自に追加しないでください。

候補数は10〜20件程度を目標にし、根拠が弱い場合は水増ししないでください。最大20件です。各候補は、出来事の必要な核が分かる開始・終了にしてください。核を特定しないまま周辺文脈を長く含めないでください。固定秒数には揃えないでください。

時刻は動画開始を0とする整数ミリ秒で返してください。候補は開始時刻の昇順に並べてください。同じ開始時刻なら終了時刻の昇順にしてください。factualDescriptionには、その場面で実際に起きていることだけを日本語で短く書いてください。遠方接続理由、品質点数、採用判断、長い評価理由、人間の好みの推測は返さないでください。`;

export const GEMINI_AGENTIC_PLEASANT_OUTPUT_SCHEMA_V001 = Object.freeze({
  type: 'object',
  additionalProperties: false,
  properties: {
    candidates: {
      type: 'array',
      maxItems: 20,
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          startTimeMs: {
            type: 'integer',
            description: '動画開始を0とする候補開始時刻の整数ミリ秒',
          },
          endTimeMs: {
            type: 'integer',
            description: '動画開始を0とする候補終了時刻の整数ミリ秒',
          },
          factualDescription: {
            type: 'string',
            description: '場面で実際に起きていることの短い日本語の事実説明',
          },
        },
        required: ['startTimeMs', 'endTimeMs', 'factualDescription'],
      },
    },
  },
  required: ['candidates'],
});

export const sha256BytesV001 = (bytes) =>
  createHash('sha256').update(bytes).digest('hex');

export const formalJsonBytesV001 = (value) =>
  Buffer.from(`${JSON.stringify(value, null, 2)}\n`, 'utf8');

const exactKeys = (value, keys) =>
  value !== null
  && typeof value === 'object'
  && !Array.isArray(value)
  && JSON.stringify(Object.keys(value)) === JSON.stringify(keys);

const fail = (code, path, facts = {}) => ({
  status: 'rejected',
  code,
  path,
  facts,
});

export const buildGeminiAgenticPleasantExactRequestV001 = () => ({
  model: GEMINI_AGENTIC_PLEASANT_MODEL_V001,
  input: [
    {
      type: 'video',
      uri: GEMINI_AGENTIC_PLEASANT_SOURCE_V001.publicYoutubeUrl,
      processing: 'agentic',
    },
    {
      type: 'text',
      text: GEMINI_AGENTIC_PLEASANT_PROMPT_V001,
    },
  ],
  response_format: {
    type: 'text',
    mime_type: 'application/json',
    schema: GEMINI_AGENTIC_PLEASANT_OUTPUT_SCHEMA_V001,
  },
  generation_config: {
    thinking_level: 'minimal',
    thinking_summaries: 'none',
  },
  store: false,
});

export const validateGeminiAgenticPleasantExactRequestV001 = (request) => {
  const expected = buildGeminiAgenticPleasantExactRequestV001();
  if (JSON.stringify(request) !== JSON.stringify(expected)) {
    return fail('EXACT_REQUEST_MISMATCH', '$');
  }
  if (request.input.filter((item) => item.type === 'video').length !== 1) {
    return fail('SOURCE_VIDEO_COUNT_INVALID', '$.input');
  }
  return {status: 'passed'};
};

export const extractInteractionOutputV001 = (envelope) => {
  if (envelope === null || typeof envelope !== 'object' || Array.isArray(envelope)) {
    return fail('INTERACTION_ENVELOPE_INVALID', '$');
  }
  if (typeof envelope.id !== 'string' || envelope.id.length === 0) {
    return fail('PROVIDER_RESPONSE_ID_MISSING', '$.id');
  }
  if (envelope.status !== 'completed') {
    return fail('INTERACTION_NOT_COMPLETED', '$.status', {status: envelope.status});
  }
  if (envelope.model !== GEMINI_AGENTIC_PLEASANT_MODEL_V001) {
    return fail('INTERACTION_MODEL_MISMATCH', '$.model', {model: envelope.model});
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
  return {status: 'extracted', value, text: textParts[0]};
};

export const validateGeminiAgenticPleasantCandidatesV001 = (
  value,
  sourceDurationMs = GEMINI_AGENTIC_PLEASANT_SOURCE_V001.sourceDurationMs,
) => {
  if (!exactKeys(value, ['candidates']) || !Array.isArray(value.candidates)) {
    return fail('CANDIDATE_SCHEMA_INVALID', '$');
  }
  if (value.candidates.length > 20) {
    return fail('CANDIDATE_COUNT_EXCEEDS_MAXIMUM', '$.candidates', {
      observed: value.candidates.length,
    });
  }
  const exactSeen = new Set();
  let previous = null;
  for (let index = 0; index < value.candidates.length; index += 1) {
    const candidate = value.candidates[index];
    const path = `$.candidates[${index}]`;
    if (!exactKeys(candidate, [
      'startTimeMs',
      'endTimeMs',
      'factualDescription',
    ])) {
      return fail('CANDIDATE_SCHEMA_INVALID', path);
    }
    if (!Number.isSafeInteger(candidate.startTimeMs)
      || candidate.startTimeMs < 0) {
      return fail('CANDIDATE_START_INVALID', `${path}.startTimeMs`);
    }
    if (!Number.isSafeInteger(candidate.endTimeMs)
      || candidate.endTimeMs <= candidate.startTimeMs
      || candidate.endTimeMs > sourceDurationMs) {
      return fail('CANDIDATE_END_INVALID', `${path}.endTimeMs`);
    }
    if (typeof candidate.factualDescription !== 'string'
      || candidate.factualDescription.length === 0
      || candidate.factualDescription.trim() !== candidate.factualDescription) {
      return fail(
        'CANDIDATE_FACTUAL_DESCRIPTION_INVALID',
        `${path}.factualDescription`,
      );
    }
    const exact = JSON.stringify(candidate);
    if (exactSeen.has(exact)) {
      return fail('CANDIDATE_EXACT_DUPLICATE', path);
    }
    exactSeen.add(exact);
    if (previous !== null
      && (candidate.startTimeMs < previous.startTimeMs
        || (candidate.startTimeMs === previous.startTimeMs
          && candidate.endTimeMs < previous.endTimeMs))) {
      return fail('CANDIDATE_ORDER_NONDETERMINISTIC', path);
    }
    previous = candidate;
  }
  return {status: 'passed'};
};

const candidateId = (requestBytes, order) => {
  const orderBytes = Buffer.from(`\u0000${order}`, 'utf8');
  return `gemini-agentic-${sha256BytesV001(Buffer.concat([
    requestBytes,
    orderBytes,
  ]))}`;
};

const median = (values) => {
  if (values.length === 0) return null;
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1
    ? sorted[middle]
    : (sorted[middle - 1] + sorted[middle]) / 2;
};

export const buildGeminiAgenticPleasantCandidateResultV001 = ({
  exactRequestBytes,
  rawResponseBytes,
  providerEnvelope,
  candidateValue,
}) => {
  const validation = validateGeminiAgenticPleasantCandidatesV001(candidateValue);
  if (validation.status !== 'passed') return validation;
  const durations = candidateValue.candidates.map(
    ({startTimeMs, endTimeMs}) => endTimeMs - startTimeMs,
  );
  const candidates = candidateValue.candidates.map((candidate, index) => ({
    candidateId: candidateId(exactRequestBytes, index + 1),
    candidateOrder: index + 1,
    ...candidate,
    durationMs: candidate.endTimeMs - candidate.startTimeMs,
  }));
  return {
    status: 'built',
    value: {
      schemaVersion: 'gemini-agentic-pleasant-candidate-result-v001',
      experimentId: 'o8rZAhARXAc-agentic-pleasant-candidates-v001',
      source: GEMINI_AGENTIC_PLEASANT_SOURCE_V001,
      model: GEMINI_AGENTIC_PLEASANT_MODEL_V001,
      providerResponseId: providerEnvelope.id,
      exactRequestSha256: sha256BytesV001(exactRequestBytes),
      rawResponseSha256: sha256BytesV001(rawResponseBytes),
      candidateOrderPolicy:
        'provider-chronological-array-order-bound-to-exact-request-by-one-based-order',
      candidates,
      workload: {
        candidateCount: candidates.length,
        candidateDurationsMs: durations,
        candidateDurationTotalMs: durations.reduce((sum, value) => sum + value, 0),
        purePlaybackTimeMs: durations.reduce((sum, value) => sum + value, 0),
        longestCandidateMs: durations.length === 0 ? null : Math.max(...durations),
        medianCandidateMs: median(durations),
        candidatesAtLeastOneMinute: durations.filter((value) => value >= 60000).length,
        candidatesAtLeastTwoMinutes: durations.filter((value) => value >= 120000).length,
      },
    },
  };
};

export const selectAboveBaselineFullMinuteIntervalsV001 = (artifact) => {
  if (artifact?.schemaId !== 'comment-velocity-minute-series-artifact-v001'
    || artifact.sourceVideoId
      !== GEMINI_AGENTIC_PLEASANT_SOURCE_V001.sourceVideoId
    || artifact.sourceDurationMs
      !== GEMINI_AGENTIC_PLEASANT_SOURCE_V001.sourceDurationMs
    || !Array.isArray(artifact.minuteSeries)) {
    return fail('COMMENT_INTERVAL_ARTIFACT_INVALID', '$');
  }
  const intervals = artifact.minuteSeries.filter((item) =>
    item?.isFullMinute === true
      && typeof item.relativeToStreamBaseline === 'number'
      && item.relativeToStreamBaseline > 1,
  ).map((item) => ({
    minuteIndex: item.minuteIndex,
    startTimeMs: item.sourceStartMs,
    endTimeMs: item.sourceEndMs,
  }));
  if (intervals.length
    !== GEMINI_AGENTIC_PLEASANT_COMMENT_SERIES_V001
      .expectedAboveBaselineFullMinuteCount) {
    return fail('COMMENT_INTERVAL_COUNT_INVALID', '$.minuteSeries', {
      observed: intervals.length,
    });
  }
  return {status: 'selected', intervals};
};

const overlaps = (left, right) =>
  left.startTimeMs < right.endTimeMs && left.endTimeMs > right.startTimeMs;

export const buildGeminiAgenticPleasantOverlapDiagnosticV001 = ({
  candidateResult,
  candidateResultBytes,
  commentArtifact,
  commentArtifactBytes,
}) => {
  const selected = selectAboveBaselineFullMinuteIntervalsV001(commentArtifact);
  if (selected.status !== 'selected') return selected;
  const both = [];
  const geminiOnly = [];
  for (const candidate of candidateResult.candidates) {
    const overlapMinuteIndexes = selected.intervals
      .filter((interval) => overlaps(candidate, interval))
      .map(({minuteIndex}) => minuteIndex);
    if (overlapMinuteIndexes.length === 0) {
      geminiOnly.push({candidateId: candidate.candidateId});
    } else {
      both.push({candidateId: candidate.candidateId, overlapMinuteIndexes});
    }
  }
  const commentOnly = selected.intervals
    .filter((interval) => !candidateResult.candidates.some(
      (candidate) => overlaps(candidate, interval),
    ))
    .map(({minuteIndex, startTimeMs, endTimeMs}) => ({
      minuteIndex,
      startTimeMs,
      endTimeMs,
    }));
  return {
    status: 'built',
    value: {
      schemaVersion: 'gemini-agentic-comment-overlap-diagnostic-v001',
      sourceVideoId: GEMINI_AGENTIC_PLEASANT_SOURCE_V001.sourceVideoId,
      candidateResultSha256: sha256BytesV001(candidateResultBytes),
      commentIntervalSource: {
        path: GEMINI_AGENTIC_PLEASANT_COMMENT_SERIES_V001.path,
        fileSha256: sha256BytesV001(commentArtifactBytes),
        aboveBaselineFullMinuteCount: selected.intervals.length,
      },
      classificationMeaning:
        '時刻の重なりだけを示し、候補品質または採否を評価しない',
      geminiOnly,
      both,
      commentOnly,
      counts: {
        geminiOnlyCandidateCount: geminiOnly.length,
        overlappingGeminiCandidateCount: both.length,
        commentOnlyIntervalCount: commentOnly.length,
      },
    },
  };
};

export const inspectAgenticEvidenceV001 = (envelope) => {
  const calls = (envelope.steps ?? [])
    .filter((step) => step?.type === 'processing_call')
    .map((step) => step.id)
    .filter((id) => typeof id === 'string');
  const results = (envelope.steps ?? [])
    .filter((step) => step?.type === 'processing_result')
    .map((step) => step.call_id)
    .filter((id) => typeof id === 'string');
  const paired = calls.filter((id) => results.includes(id));
  return {
    agenticProcessingObserved: calls.length > 0
      && results.length > 0
      && paired.length === calls.length,
    processingCallCount: calls.length,
    processingResultCount: results.length,
    pairedProcessingCallCount: paired.length,
    processingCallIds: calls,
    processingResultCallIds: results,
    inspectedMediaIntervals: [],
    inspectedMediaIntervalsAvailability:
      'not-exposed-by-observed-processing-steps',
  };
};

export const calculateGeminiAgenticPleasantCostV001 = (usage) => {
  const keys = [
    'total_input_tokens',
    'total_tool_use_tokens',
    'total_output_tokens',
    'total_thought_tokens',
  ];
  const values = Object.fromEntries(keys.map((key) => [key, usage?.[key] ?? 0]));
  if (keys.some((key) => !Number.isSafeInteger(values[key]) || values[key] < 0)) {
    return fail('INTERACTION_USAGE_INVALID', '$.usage');
  }
  const inputAndToolTokens =
    values.total_input_tokens + values.total_tool_use_tokens;
  const outputAndThinkingTokens =
    values.total_output_tokens + values.total_thought_tokens;
  const nanoUsd = BigInt(inputAndToolTokens) * 300n
    + BigInt(outputAndThinkingTokens) * 2500n;
  return {
    status: 'calculated',
    value: {
      pricingBasis: 'Gemini Developer API paid Standard list price',
      inputAndToolUsePriceUsdPerMillionTokens: 0.30,
      outputAndThinkingPriceUsdPerMillionTokens: 2.50,
      inputAndToolUseTokens: inputAndToolTokens,
      outputAndThinkingTokens,
      calculatedNanoUsd: nanoUsd.toString(),
      calculatedUsd: Number(nanoUsd) / 1_000_000_000,
      invoiceBillingTierIndependentlyConfirmed: false,
    },
  };
};

