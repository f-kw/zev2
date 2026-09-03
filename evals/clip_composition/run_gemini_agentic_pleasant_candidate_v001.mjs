#!/usr/bin/env node

import {spawnSync} from 'node:child_process';
import {createReadStream} from 'node:fs';
import {mkdir, open, readFile, stat} from 'node:fs/promises';
import {dirname, resolve, sep} from 'node:path';
import process from 'node:process';
import {fileURLToPath} from 'node:url';

import {
  GEMINI_AGENTIC_PLEASANT_COMMENT_SERIES_V001,
  GEMINI_AGENTIC_PLEASANT_ENDPOINT_V001,
  GEMINI_AGENTIC_PLEASANT_MODEL_V001,
  GEMINI_AGENTIC_PLEASANT_SOURCE_V001,
  buildGeminiAgenticPleasantCandidateResultV001,
  buildGeminiAgenticPleasantExactRequestV001,
  buildGeminiAgenticPleasantOverlapDiagnosticV001,
  calculateGeminiAgenticPleasantCostV001,
  extractInteractionOutputV001,
  formalJsonBytesV001,
  inspectAgenticEvidenceV001,
  sha256BytesV001,
  validateGeminiAgenticPleasantExactRequestV001,
} from './gemini_agentic_pleasant_candidate_v001.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const JOB_PATH =
  'evals/clip_composition/jobs/gemini-agentic-pleasant-candidates/'
    + 'o8rZAhARXAc-v001.json';
const OUTPUT_ROOT =
  'evals/clip_composition/outputs/'
    + 'gemini-agentic-pleasant-candidates-o8rZAhARXAc-v001/attempt-0001';
const IMPLEMENTATION_PATHS = Object.freeze([
  'evals/clip_composition/gemini_agentic_pleasant_candidate_v001.mjs',
  'evals/clip_composition/run_gemini_agentic_pleasant_candidate_v001.mjs',
  'evals/clip_composition/gemini_agentic_pleasant_candidate_v001.test.mjs',
]);
const SHA_PATTERN = /^[0-9a-f]{64}$/u;

class Stop extends Error {
  constructor(code, stage, path = '$', facts = {}) {
    super(code);
    this.code = code;
    this.stage = stage;
    this.path = path;
    this.facts = facts;
  }
}

const absolute = (path) => {
  const result = resolve(ROOT, path);
  if (result !== `${ROOT}${sep}${path}`) {
    throw new Stop('PATH_OUTSIDE_WORKSPACE', 'preflight', path);
  }
  return result;
};

const hashFile = async (path) => {
  const {createHash} = await import('node:crypto');
  const hash = createHash('sha256');
  for await (const chunk of createReadStream(absolute(path))) hash.update(chunk);
  return hash.digest('hex');
};

const writeExclusive = async (path, bytes) => {
  await mkdir(dirname(absolute(path)), {recursive: true});
  const handle = await open(absolute(path), 'wx', 0o600);
  try {
    await handle.writeFile(bytes);
    await handle.sync();
  } finally {
    await handle.close();
  }
  const reread = await readFile(absolute(path));
  if (!reread.equals(bytes)) {
    throw new Stop('WRITE_REREAD_MISMATCH', 'publication', path);
  }
};

const readJson = async (path) => JSON.parse(await readFile(absolute(path), 'utf8'));

const verifyDuration = (path) => {
  const result = spawnSync('ffprobe', [
    '-v', 'error',
    '-show_entries', 'format=duration',
    '-of', 'default=noprint_wrappers=1:nokey=1',
    absolute(path),
  ], {encoding: 'utf8', shell: false});
  if (result.status !== 0 || result.signal !== null) {
    throw new Stop('SOURCE_DURATION_PROBE_FAILED', 'preflight', path);
  }
  const milliseconds = Math.round(Number(result.stdout.trim()) * 1000);
  if (milliseconds !== GEMINI_AGENTIC_PLEASANT_SOURCE_V001.sourceDurationMs) {
    throw new Stop('SOURCE_DURATION_MISMATCH', 'preflight', path, {
      observed: milliseconds,
    });
  }
  return milliseconds;
};

const buildJob = async () => {
  const exactRequest = buildGeminiAgenticPleasantExactRequestV001();
  const exactRequestBytes = formalJsonBytesV001(exactRequest);
  const implementationBindings = [];
  for (const path of IMPLEMENTATION_PATHS) {
    implementationBindings.push({path, fileSha256: await hashFile(path)});
  }
  const sourceStats = await stat(absolute(
    GEMINI_AGENTIC_PLEASANT_SOURCE_V001.localSourcePath,
  ));
  const sourceSha256 = await hashFile(
    GEMINI_AGENTIC_PLEASANT_SOURCE_V001.localSourcePath,
  );
  if (sourceSha256 !== GEMINI_AGENTIC_PLEASANT_SOURCE_V001.localSourceSha256) {
    throw new Stop('SOURCE_SHA256_MISMATCH', 'job-build');
  }
  verifyDuration(GEMINI_AGENTIC_PLEASANT_SOURCE_V001.localSourcePath);
  const commentSha256 = await hashFile(
    GEMINI_AGENTIC_PLEASANT_COMMENT_SERIES_V001.path,
  );
  if (commentSha256 !== GEMINI_AGENTIC_PLEASANT_COMMENT_SERIES_V001.fileSha256) {
    throw new Stop('COMMENT_SOURCE_SHA256_MISMATCH', 'job-build');
  }
  return {
    schemaVersion: 'gemini-agentic-pleasant-execution-job-v001',
    jobId: 'o8rZAhARXAc-agentic-pleasant-candidates-v001',
    attemptId: 'attempt-0001',
    authorization: {
      approvedBy: 'kawafmm',
      apiCommunicationCount: 1,
      automaticRetries: 0,
      targetCostUsd: 1,
      strictDollarStopUnavailableRiskAccepted: true,
      pushAndRemoteOperationsAllowed: false,
    },
    source: {
      ...GEMINI_AGENTIC_PLEASANT_SOURCE_V001,
      localSourceByteLength: sourceStats.size,
      googleFetchedBytesEqualLocalSourceBytesProven: false,
      limitation:
        '公開YouTube URLをGoogleが取得したbyteとローカルMP4のbyte一致は証明できない',
    },
    api: {
      product: 'Gemini Developer API',
      apiVersion: 'v1beta',
      endpoint: GEMINI_AGENTIC_PLEASANT_ENDPOINT_V001,
      method: 'POST',
      model: GEMINI_AGENTIC_PLEASANT_MODEL_V001,
      modelReleaseChannel: 'stable',
      processingMode: 'agentic',
      thinkingLevel: 'minimal',
      thinkingSummaries: 'none',
      automaticRetries: 0,
      exactRequest,
      exactRequestSha256: sha256BytesV001(exactRequestBytes),
    },
    pricingSnapshot: {
      observedOn: '2026-09-03',
      tier: 'Paid Standard list price',
      inputTextImageVideoAudioUsdPerMillionTokens: 0.30,
      outputIncludingThinkingUsdPerMillionTokens: 2.50,
      youtubeUrlFeatureAdditionalCharge: 0,
      maximumDollarGuaranteeAvailableBeforeSend: false,
      sourceUrl: 'https://ai.google.dev/gemini-api/docs/pricing',
    },
    officialSpecificationBindings: [
      {
        claim: 'model is Stable',
        sourceUrl: 'https://ai.google.dev/gemini-api/docs/models',
        observedOn: '2026-09-03',
      },
      {
        claim:
          'YouTube URI input and processing=agentic are supported; processing steps prove use',
        sourceUrl: 'https://ai.google.dev/gemini-api/docs/video-understanding',
        observedOn: '2026-09-03',
      },
      {
        claim: 'response_format carries JSON schema for structured output',
        sourceUrl: 'https://ai.google.dev/gemini-api/docs/structured-output',
        observedOn: '2026-09-03',
      },
      {
        claim: 'minimal is supported and default-equivalent minimum thinking level',
        sourceUrl:
          'https://ai.google.dev/gemini-api/docs/generate-content/thinking',
        observedOn: '2026-09-03',
      },
      {
        claim: 'POST /v1beta/interactions is the create endpoint',
        sourceUrl: 'https://ai.google.dev/api/interactions-api-v1',
        observedOn: '2026-09-03',
      },
    ],
    localBindings: {
      implementationBindings,
      commentIntervalSource: GEMINI_AGENTIC_PLEASANT_COMMENT_SERIES_V001,
    },
    publication: {
      outputRoot: OUTPUT_ROOT,
      exactRequestPath: `${OUTPUT_ROOT}/exact-request-v001.json`,
      preflightPath: `${OUTPUT_ROOT}/preflight-v001.json`,
      rawResponsePath: `${OUTPUT_ROOT}/raw-response-v001.json`,
      executionRecordPath: `${OUTPUT_ROOT}/execution-record-v001.json`,
      candidateResultPath: `${OUTPUT_ROOT}/candidate-result-v001.json`,
      overlapDiagnosticPath: `${OUTPUT_ROOT}/comment-overlap-diagnostic-v001.json`,
      verificationPath: `${OUTPUT_ROOT}/verification-v001.json`,
      failureEvidencePath: `${OUTPUT_ROOT}/failure-evidence-v001.json`,
    },
  };
};

const validateJob = async (job) => {
  if (job?.schemaVersion !== 'gemini-agentic-pleasant-execution-job-v001'
    || job.jobId !== 'o8rZAhARXAc-agentic-pleasant-candidates-v001'
    || job.attemptId !== 'attempt-0001'
    || job.authorization?.apiCommunicationCount !== 1
    || job.authorization?.automaticRetries !== 0
    || job.authorization?.targetCostUsd !== 1
    || job.authorization?.pushAndRemoteOperationsAllowed !== false
    || job.api?.endpoint !== GEMINI_AGENTIC_PLEASANT_ENDPOINT_V001
    || job.api?.model !== GEMINI_AGENTIC_PLEASANT_MODEL_V001
    || job.api?.processingMode !== 'agentic'
    || job.api?.thinkingLevel !== 'minimal'
    || job.api?.automaticRetries !== 0
    || job.publication?.outputRoot !== OUTPUT_ROOT) {
    throw new Stop('JOB_SCHEMA_OR_FIXED_VALUE_INVALID', 'preflight');
  }
  const requestValidation = validateGeminiAgenticPleasantExactRequestV001(
    job.api.exactRequest,
  );
  if (requestValidation.status !== 'passed') {
    throw new Stop(requestValidation.code, 'preflight', requestValidation.path);
  }
  const exactRequestBytes = formalJsonBytesV001(job.api.exactRequest);
  if (sha256BytesV001(exactRequestBytes) !== job.api.exactRequestSha256) {
    throw new Stop('EXACT_REQUEST_SHA256_MISMATCH', 'preflight');
  }
  if (!Array.isArray(job.localBindings?.implementationBindings)
    || job.localBindings.implementationBindings.length
      !== IMPLEMENTATION_PATHS.length) {
    throw new Stop('IMPLEMENTATION_BINDINGS_INVALID', 'preflight');
  }
  for (let index = 0; index < IMPLEMENTATION_PATHS.length; index += 1) {
    const binding = job.localBindings.implementationBindings[index];
    if (binding?.path !== IMPLEMENTATION_PATHS[index]
      || !SHA_PATTERN.test(binding.fileSha256 ?? '')
      || await hashFile(binding.path) !== binding.fileSha256) {
      throw new Stop('IMPLEMENTATION_BINDING_MISMATCH', 'preflight', binding?.path);
    }
  }
  if (await hashFile(job.source.localSourcePath)
    !== job.source.localSourceSha256
    || job.source.localSourceSha256
      !== GEMINI_AGENTIC_PLEASANT_SOURCE_V001.localSourceSha256) {
    throw new Stop('SOURCE_SHA256_MISMATCH', 'preflight');
  }
  const sourceStats = await stat(absolute(job.source.localSourcePath));
  if (sourceStats.size !== job.source.localSourceByteLength) {
    throw new Stop('SOURCE_BYTE_LENGTH_MISMATCH', 'preflight');
  }
  verifyDuration(job.source.localSourcePath);
  if (await hashFile(job.localBindings.commentIntervalSource.path)
    !== job.localBindings.commentIntervalSource.fileSha256) {
    throw new Stop('COMMENT_SOURCE_SHA256_MISMATCH', 'preflight');
  }
  try {
    await stat(absolute(OUTPUT_ROOT));
    throw new Stop('OUTPUT_ROOT_ALREADY_EXISTS', 'preflight', OUTPUT_ROOT);
  } catch (error) {
    if (error instanceof Stop) throw error;
    if (error?.code !== 'ENOENT') throw error;
  }
  return {exactRequestBytes};
};

const responseHeaders = (headers) => Object.fromEntries([
  'content-type',
  'date',
  'x-request-id',
  'x-goog-request-id',
].map((name) => [name, headers.get(name)]));

const saveFailure = async (job, error, facts = {}) => {
  const bytes = formalJsonBytesV001({
    schemaVersion: 'gemini-agentic-pleasant-failure-evidence-v001',
    observedAt: new Date().toISOString(),
    stage: error?.stage ?? 'unknown',
    code: error?.code ?? error?.name ?? 'UNKNOWN_FAILURE',
    path: error?.path ?? '$',
    facts: {...(error?.facts ?? {}), ...facts},
    apiRetryPerformed: false,
  });
  try {
    await writeExclusive(job.publication.failureEvidencePath, bytes);
  } catch (writeError) {
    if (writeError?.code !== 'EEXIST') throw writeError;
  }
};

const execute = async (jobPath) => {
  const jobBytes = await readFile(absolute(jobPath));
  const job = JSON.parse(jobBytes);
  let preflight;
  try {
    preflight = await validateJob(job);
    const apiKey = (process.env.GEMINI_API_KEY ?? '').trim();
    if (apiKey.length === 0) {
      throw new Stop('GEMINI_API_KEY_UNAVAILABLE', 'preflight');
    }
    await writeExclusive(job.publication.exactRequestPath, preflight.exactRequestBytes);
    await writeExclusive(job.publication.preflightPath, formalJsonBytesV001({
      schemaVersion: 'gemini-agentic-pleasant-preflight-v001',
      checkedAt: new Date().toISOString(),
      status: 'passed',
      checks: {
        modelStableAndExact: true,
        agenticProcessingExact: true,
        onePublicYoutubeVideoOnly: true,
        endpointExact: true,
        structuredOutputExact: true,
        thinkingMinimal: true,
        automaticRetriesZero: true,
        promptExact: true,
        outputSchemaExact: true,
        apiKeyAvailableInMemoryOnly: true,
        localSourceShaAndDurationExact: true,
        commentIntervalSourceShaExact: true,
      },
      exactRequestSha256: sha256BytesV001(preflight.exactRequestBytes),
      apiCommunicationCountBeforeSend: 0,
    }));

    let response;
    try {
      response = await fetch(job.api.endpoint, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-goog-api-key': apiKey,
        },
        body: preflight.exactRequestBytes,
        redirect: 'error',
      });
    } catch (error) {
      const stopped = new Stop('API_TRANSPORT_FAILED', 'transport', '$', {
        errorName: error?.name ?? null,
        errorMessage: error?.message ?? null,
      });
      await saveFailure(job, stopped, {apiCommunicationAttempted: true});
      throw stopped;
    }
    const rawResponseBytes = Buffer.from(await response.arrayBuffer());
    await writeExclusive(job.publication.rawResponsePath, rawResponseBytes);
    const transport = {
      httpStatus: response.status,
      httpOk: response.ok,
      responseHeaders: responseHeaders(response.headers),
      rawResponseSha256: sha256BytesV001(rawResponseBytes),
      rawResponseByteLength: rawResponseBytes.length,
      apiCommunicationCount: 1,
      automaticRetries: 0,
    };
    let envelope;
    try {
      envelope = JSON.parse(rawResponseBytes.toString('utf8'));
    } catch {
      const stopped = new Stop('RAW_RESPONSE_JSON_INVALID', 'response-parse');
      await saveFailure(job, stopped, transport);
      throw stopped;
    }
    if (!response.ok) {
      const stopped = new Stop('API_HTTP_STATUS_NOT_SUCCESS', 'response-envelope', '$', {
        httpStatus: response.status,
      });
      await saveFailure(job, stopped, transport);
      throw stopped;
    }
    const extracted = extractInteractionOutputV001(envelope);
    const agenticEvidence = inspectAgenticEvidenceV001(envelope);
    const cost = calculateGeminiAgenticPleasantCostV001(envelope.usage);
    const executionRecord = {
      schemaVersion: 'gemini-agentic-pleasant-execution-record-v001',
      job: {path: jobPath, fileSha256: sha256BytesV001(jobBytes)},
      exactRequest: {
        path: job.publication.exactRequestPath,
        fileSha256: sha256BytesV001(preflight.exactRequestBytes),
      },
      rawResponse: {
        path: job.publication.rawResponsePath,
        fileSha256: sha256BytesV001(rawResponseBytes),
        byteLength: rawResponseBytes.length,
      },
      model: envelope.model ?? null,
      providerResponseId: envelope.id ?? null,
      providerStatus: envelope.status ?? null,
      usage: envelope.usage ?? null,
      thinkingUsageTokens: envelope.usage?.total_thought_tokens ?? null,
      cost: cost.status === 'calculated' ? cost.value : cost,
      agenticEvidence,
      transport,
      sourceByteIdentityLimitation: job.source.limitation,
    };
    await writeExclusive(
      job.publication.executionRecordPath,
      formalJsonBytesV001(executionRecord),
    );
    if (extracted.status !== 'extracted') {
      const stopped = new Stop(extracted.code, 'strict-output', extracted.path);
      await saveFailure(job, stopped, transport);
      throw stopped;
    }
    if (!agenticEvidence.agenticProcessingObserved) {
      const stopped = new Stop(
        'AGENTIC_EXECUTION_EVIDENCE_NOT_OBSERVED',
        'strict-output',
        '$.steps',
      );
      await saveFailure(job, stopped, transport);
      throw stopped;
    }
    if (cost.status !== 'calculated') {
      const stopped = new Stop(cost.code, 'strict-output', cost.path);
      await saveFailure(job, stopped, transport);
      throw stopped;
    }
    const candidateBuild = buildGeminiAgenticPleasantCandidateResultV001({
      exactRequestBytes: preflight.exactRequestBytes,
      rawResponseBytes,
      providerEnvelope: envelope,
      candidateValue: extracted.value,
    });
    if (candidateBuild.status !== 'built') {
      const stopped = new Stop(
        candidateBuild.code,
        'strict-output',
        candidateBuild.path,
        candidateBuild.facts,
      );
      await saveFailure(job, stopped, transport);
      throw stopped;
    }
    const candidateResultBytes = formalJsonBytesV001(candidateBuild.value);
    const commentArtifactBytes = await readFile(absolute(
      job.localBindings.commentIntervalSource.path,
    ));
    const commentArtifact = JSON.parse(commentArtifactBytes);
    const overlapBuild = buildGeminiAgenticPleasantOverlapDiagnosticV001({
      candidateResult: candidateBuild.value,
      candidateResultBytes,
      commentArtifact,
      commentArtifactBytes,
    });
    if (overlapBuild.status !== 'built') {
      const stopped = new Stop(
        overlapBuild.code,
        'overlap-diagnostic',
        overlapBuild.path,
        overlapBuild.facts,
      );
      await saveFailure(job, stopped, transport);
      throw stopped;
    }
    const overlapBytes = formalJsonBytesV001(overlapBuild.value);
    await writeExclusive(job.publication.candidateResultPath, candidateResultBytes);
    await writeExclusive(job.publication.overlapDiagnosticPath, overlapBytes);

    const rebuiltCandidate = buildGeminiAgenticPleasantCandidateResultV001({
      exactRequestBytes: await readFile(absolute(job.publication.exactRequestPath)),
      rawResponseBytes: await readFile(absolute(job.publication.rawResponsePath)),
      providerEnvelope: JSON.parse(await readFile(
        absolute(job.publication.rawResponsePath),
        'utf8',
      )),
      candidateValue: extractInteractionOutputV001(JSON.parse(await readFile(
        absolute(job.publication.rawResponsePath),
        'utf8',
      ))).value,
    });
    const rebuiltCandidateBytes = formalJsonBytesV001(rebuiltCandidate.value);
    const rebuiltOverlap = buildGeminiAgenticPleasantOverlapDiagnosticV001({
      candidateResult: rebuiltCandidate.value,
      candidateResultBytes: rebuiltCandidateBytes,
      commentArtifact,
      commentArtifactBytes,
    });
    const rebuiltOverlapBytes = formalJsonBytesV001(rebuiltOverlap.value);
    if (!rebuiltCandidateBytes.equals(candidateResultBytes)
      || !rebuiltOverlapBytes.equals(overlapBytes)) {
      const stopped = new Stop('RAW_REBUILD_MISMATCH', 'verification');
      await saveFailure(job, stopped, transport);
      throw stopped;
    }
    const verification = {
      schemaVersion: 'gemini-agentic-pleasant-verification-v001',
      status: 'passed',
      checks: {
        rawSavedBeforeParsing: true,
        schemaAndExtraFieldsStrict: true,
        candidateTimesWithinSource: true,
        exactDuplicatesAbsent: true,
        chronologicalOrderDeterministic: true,
        candidateIdsDeterministicFromExactRequestAndOrder: true,
        sourceUrlVideoIdShaDurationBound: true,
        rawRebuildCandidateExact: true,
        rawRebuildOverlapExact: true,
        commentOverlapDeterministic: true,
        agenticProcessingObserved: true,
        automaticRetriesZero: true,
      },
      candidateResultSha256: sha256BytesV001(candidateResultBytes),
      overlapDiagnosticSha256: sha256BytesV001(overlapBytes),
    };
    await writeExclusive(
      job.publication.verificationPath,
      formalJsonBytesV001(verification),
    );
    process.stdout.write(`${JSON.stringify({
      status: 'completed',
      providerResponseId: envelope.id,
      candidateCount: candidateBuild.value.candidates.length,
      candidateResultPath: job.publication.candidateResultPath,
      overlapDiagnosticPath: job.publication.overlapDiagnosticPath,
      calculatedUsd: cost.value.calculatedUsd,
    })}\n`);
  } catch (error) {
    if (error instanceof Stop) throw error;
    throw error;
  }
};

const main = async () => {
  const [mode, suppliedJobPath] = process.argv.slice(2);
  if (mode === '--prepare') {
    const job = await buildJob();
    await writeExclusive(JOB_PATH, formalJsonBytesV001(job));
    process.stdout.write(`${JSON.stringify({
      status: 'prepared',
      jobPath: JOB_PATH,
      exactRequestSha256: job.api.exactRequestSha256,
    })}\n`);
    return;
  }
  if (mode === '--execute') {
    if (suppliedJobPath !== JOB_PATH) {
      throw new Stop('JOB_PATH_INVALID', 'preflight', suppliedJobPath);
    }
    await execute(suppliedJobPath);
    return;
  }
  throw new Stop('USAGE_INVALID', 'cli');
};

main().catch((error) => {
  process.stderr.write(`${JSON.stringify({
    status: 'stopped',
    code: error?.code ?? error?.name ?? 'UNKNOWN_FAILURE',
    stage: error?.stage ?? 'unknown',
    path: error?.path ?? '$',
    message: error?.message ?? String(error),
  })}\n`);
  process.exitCode = 1;
});

