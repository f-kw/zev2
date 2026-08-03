#!/usr/bin/env node

import {execFileSync, spawn} from 'node:child_process';
import {
  constants,
  closeSync,
  fsyncSync,
  openSync,
} from 'node:fs';
import {
  lstat,
  mkdir,
  open,
  readFile,
  realpath,
} from 'node:fs/promises';
import {dirname, resolve, sep} from 'node:path';
import process from 'node:process';
import {fileURLToPath, pathToFileURL} from 'node:url';

import {
  canonicalizePresentationCaptionB1JsonV001,
  decodePresentationCaptionB1StrictJsonV001,
  serializePresentationCaptionB1FormalJsonV001,
  sha256PresentationCaptionB1BytesV001,
} from './presentation_caption_semantic_source_package_v001.mjs';
import {
  createPresentationCaptionSemanticOutputProductionFilesystemAdapterV001,
  inspectPresentationCaptionSemanticOutputReadOnlyProjectionV001,
  runPresentationCaptionSemanticOutputCheckCliV001,
} from './run_presentation_caption_semantic_output_check_v001.mjs';
import {
  inspectPresentationCaptionDisplayPairReadOnlyProjectionV001,
} from './run_presentation_caption_display_pair_job_v001.mjs';

const WORKSPACE_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const MODEL_ID = 'gemini-3.6-flash';
const RUN_DIRECTORY_ID = 'DmWu0jVQfTE-candidate-13-v004';
const ATTEMPT_ID = 'DmWu0jVQfTE-candidate-13-caption-b6-v004';
const REQUEST_SHA256 =
  '92b8bee3426d6ad0822f0e81acb832a2340d468362ecff3d5b31f5a1b52bcfc0';
const REQUEST_PATH =
  'evals/clip_composition/outputs/presentation/caption-gate-b5/'
  + 'DmWu0jVQfTE-candidate-13-v004/generate-content-request.json';
const B5_MANIFEST_PATH =
  'evals/clip_composition/outputs/presentation/caption-gate-b5/'
  + 'DmWu0jVQfTE-candidate-13-v004/b5-manifest.json';
const OUTPUT_ROOT =
  'evals/clip_composition/outputs/presentation/caption-gate-b6/'
  + RUN_DIRECTORY_ID;
const RAW_RESPONSE_PATH = `${OUTPUT_ROOT}/generate-content-response.raw.json`;
const SEMANTIC_RAW_PATH =
  'evals/clip_composition/outputs/presentation/caption-semantic-raw-outputs/'
  + `${ATTEMPT_ID}.json`;
const B1_JOB_PATH =
  'evals/clip_composition/outputs/presentation/caption-semantic-output-check-jobs/'
  + `${ATTEMPT_ID}.json`;
const B1_REPORT_PATH = `${OUTPUT_ROOT}/semantic-output-validation-report.json`;
const B4_JOB_PATH =
  'evals/clip_composition/outputs/presentation/caption-display-pair-generation-jobs/'
  + `${ATTEMPT_ID}.json`;
const B4_PAIR_ID = ATTEMPT_ID;
const B4_OUTPUT_ROOT =
  `evals/clip_composition/outputs/presentation/caption-display-pairs/${B4_PAIR_ID}`;
const B4_RUNNER_OUTPUT_PATH = `${OUTPUT_ROOT}/b4-runner-output.raw.json`;
const B4_DISPLAY_PLAN_PATH = `${B4_OUTPUT_ROOT}/display-plan.json`;
const B4_STATIC_TEMPLATE_PATH =
  'evals/clip_composition/outputs/presentation/caption-display-pair-static-preflight-jobs/'
  + 'DmWu0jVQfTE-candidate-13-caption-display-pair-b4-v003.json';
const SOURCE_PACKAGE_ROOT =
  'evals/clip_composition/outputs/presentation/segmenter-boundary-evidence/'
  + 'DmWu0jVQfTE-candidate-13-v001';
const ENDPOINT =
  `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_ID}:generateContent`;
const TIMEOUT_MILLISECONDS = 600000;
const SERVER_TIMEOUT_SECONDS = 600;
const INPUT_PRICE_USD_PER_MILLION = '1.50';
const OUTPUT_PRICE_USD_PER_MILLION = '7.50';
const SHA256_PATTERN = /^[0-9a-f]{64}$/u;
const FORMAL_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]*$/u;

const B1_DIRECT_IMPLEMENTATIONS = Object.freeze([
  ['packageCore', 'evals/clip_composition/presentation_caption_semantic_source_package_v001.mjs'],
  ['semanticCore', 'evals/clip_composition/presentation_caption_semantic_output_v001.mjs'],
  ['semanticRunner', 'evals/clip_composition/run_presentation_caption_semantic_output_check_v001.mjs'],
]);
const B1_DEPENDENCY_IMPLEMENTATIONS = Object.freeze([
  ['textLayoutImplementation', 'evals/clip_composition/presentation_renderer_text_layout_v001.mjs'],
  ['gateACore', 'evals/clip_composition/presentation_segmenter_boundary_evidence_v001.mjs'],
  ['gateARetainedSourceAtomsCore', 'evals/clip_composition/presentation_retained_source_atoms_v001.mjs'],
  ['gateARunner', 'evals/clip_composition/run_presentation_segmenter_boundary_preflight_v001.mjs'],
]);
const B4_DIRECT_IMPLEMENTATIONS = Object.freeze([
  ['displayPairCore', 'evals/clip_composition/presentation_caption_display_pair_v003.mjs'],
  ['displayPairRunner', 'evals/clip_composition/run_presentation_caption_display_pair_job_v001.mjs'],
]);
const B4_DEPENDENCY_IMPLEMENTATIONS = Object.freeze([
  ['semanticCore', 'evals/clip_composition/presentation_caption_semantic_output_v001.mjs'],
  ['semanticRunner', 'evals/clip_composition/run_presentation_caption_semantic_output_check_v001.mjs'],
  ['captionCoreV003', 'evals/clip_composition/presentation_caption_contract_v003.mjs'],
  ['instructionCoreV003', 'evals/clip_composition/presentation_instruction_contract_v003.mjs'],
  ['sourceSpeakerPolicy', 'evals/clip_composition/presentation_source_speaker_policy_v001.mjs'],
  ['timelineV002', 'evals/clip_composition/presentation_base_media_timeline_v002.mjs'],
  ['layoutPreflightCore', 'evals/clip_composition/inspect_presentation_preset_layout.ts'],
  ['rendererLayoutCore', 'runner/src/telop/telop-render-model.ts'],
  [
    'presetRegistry',
    'evals/clip_composition/registries/presentation/'
      + 'normal-landscape-preset-registry-v001/preset-registry.json',
  ],
  [
    'presetValidationIndex',
    'evals/clip_composition/registries/presentation/'
      + 'normal-landscape-preset-registry-v001/preset-validation-index.json',
  ],
  [
    'materialValidationIndex',
    'evals/clip_composition/registries/presentation/'
      + 'normal-landscape-preset-registry-v001/material-validation-index.json',
  ],
  [
    'trustedRegistryBindings',
    'evals/clip_composition/registries/presentation/'
      + 'normal-landscape-preset-registry-v001/trusted-registry-bindings.json',
  ],
  ['sharedJsonContractCore', 'evals/clip_composition/presentation_caption_semantic_source_package_v001.mjs'],
]);

export const PRESENTATION_CAPTION_GATE_B6_FORMAL_CONFIG_V001 = Object.freeze({
  attemptId: ATTEMPT_ID,
  requestPath: REQUEST_PATH,
  expectedRequestSha256: REQUEST_SHA256,
  b5ManifestPath: B5_MANIFEST_PATH,
  outputRoot: OUTPUT_ROOT,
  rawResponsePath: RAW_RESPONSE_PATH,
  semanticRawPath: SEMANTIC_RAW_PATH,
  b1JobPath: B1_JOB_PATH,
  b1ReportPath: B1_REPORT_PATH,
  b4JobPath: B4_JOB_PATH,
  b4PairId: B4_PAIR_ID,
  b4OutputRoot: B4_OUTPUT_ROOT,
  b4RunnerOutputPath: B4_RUNNER_OUTPUT_PATH,
  b4DisplayPlanPath: B4_DISPLAY_PLAN_PATH,
  b4StaticTemplatePath: B4_STATIC_TEMPLATE_PATH,
  sourcePackageRoot: SOURCE_PACKAGE_ROOT,
  modelId: MODEL_ID,
  endpoint: ENDPOINT,
  inputPriceUsdPerMillion: INPUT_PRICE_USD_PER_MILLION,
  outputPriceUsdPerMillion: OUTPUT_PRICE_USD_PER_MILLION,
});

export const PRESENTATION_CAPTION_GATE_B6_PROVIDER_REJECTION_CODES_V001 =
  Object.freeze([
    'B6_V002_HTTP_ENVELOPE_INVALID',
    'HTTP_RESPONSE_UTF8_INVALID',
    'HTTP_RESPONSE_JSON_INVALID',
    'HTTP_RESPONSE_SHAPE_INVALID',
    'HTTP_RESPONSE_MODEL_VERSION_MISSING',
    'HTTP_RESPONSE_USAGE_INVALID',
    'B6_V002_RESPONSE_MODEL_INVALID',
    'B6_V002_USAGE_INVALID',
    'B6_V002_RESPONSE_TIER_INVALID',
    'B6_V002_CANDIDATE_COUNT_INVALID',
    'B6_V002_CANDIDATE_CONTENT_INVALID',
    'HTTP_RESPONSE_CANDIDATE_TEXT_UTF8_INVALID',
  ]);

class B6Stop extends Error {
  constructor(reason, facts = {}) {
    super(reason);
    this.name = 'B6Stop';
    this.reason = reason;
    this.facts = facts;
  }
}

const stop = (reason, facts = {}) => {
  throw new B6Stop(reason, facts);
};

const repositoryAbsolute = (pathValue) => {
  if (typeof pathValue !== 'string' || pathValue.length === 0) {
    stop('REPOSITORY_PATH_INVALID');
  }
  const absolute = resolve(WORKSPACE_ROOT, pathValue);
  if (absolute !== `${WORKSPACE_ROOT}${sep}${pathValue}`) {
    stop('REPOSITORY_PATH_INVALID', {path: pathValue});
  }
  return absolute;
};

const formalBytes = (value) => {
  const result = serializePresentationCaptionB1FormalJsonV001(value);
  if (result?.status !== 'serialized') stop('FORMAL_JSON_SERIALIZATION_FAILED');
  return result.bytes;
};

const sha256 = (bytes) => {
  const result = sha256PresentationCaptionB1BytesV001(bytes);
  if (result?.status !== 'hashed') stop('SHA256_CALCULATION_FAILED');
  return result.sha256;
};

const canonicalSha256 = (value) => {
  const result = canonicalizePresentationCaptionB1JsonV001(value);
  if (result?.status !== 'canonicalized') stop('CANONICAL_JSON_FAILED');
  return sha256(result.bytes);
};

const strictDecode = (bytes, reason) => {
  const result = decodePresentationCaptionB1StrictJsonV001(bytes);
  if (result?.status !== 'decoded') {
    stop(reason, {decodeReason: result?.reason ?? null});
  }
  return result.value;
};

const readStable = async (pathValue) => {
  const absolute = repositoryAbsolute(pathValue);
  const before = await lstat(absolute, {bigint: true});
  if (!before.isFile() || before.isSymbolicLink() || before.nlink !== 1n) {
    stop('INPUT_FILE_UNSAFE', {path: pathValue});
  }
  const handle = await open(absolute, constants.O_RDONLY | constants.O_NOFOLLOW);
  try {
    const opened = await handle.stat({bigint: true});
    const bytes = await handle.readFile();
    const after = await handle.stat({bigint: true});
    const projection = (stats) => [
      stats.dev,
      stats.ino,
      stats.size,
      stats.mtimeNs,
      stats.ctimeNs,
      stats.nlink,
    ].map((entry) => entry.toString());
    if (JSON.stringify(projection(before)) !== JSON.stringify(projection(opened))
      || JSON.stringify(projection(opened)) !== JSON.stringify(projection(after))
      || BigInt(bytes.length) !== after.size) {
      stop('INPUT_FILE_CHANGED_DURING_READ', {path: pathValue});
    }
    return Object.freeze({
      path: pathValue,
      bytes,
      fileSha256: sha256(bytes),
    });
  } finally {
    await handle.close();
  }
};

const pathExists = async (pathValue) => {
  try {
    await lstat(repositoryAbsolute(pathValue));
    return true;
  } catch (error) {
    if (error?.code === 'ENOENT') return false;
    throw error;
  }
};

const syncDirectory = (absoluteDirectory) => {
  const descriptor = openSync(absoluteDirectory, 'r');
  try {
    fsyncSync(descriptor);
  } finally {
    closeSync(descriptor);
  }
};

const writeExclusiveDurable = async (pathValue, bytes) => {
  const absolute = repositoryAbsolute(pathValue);
  await mkdir(dirname(absolute), {recursive: true});
  const handle = await open(absolute, 'wx', 0o600);
  try {
    await handle.writeFile(bytes);
    await handle.sync();
  } finally {
    await handle.close();
  }
  syncDirectory(dirname(absolute));
  const observed = await readFile(absolute);
  if (!observed.equals(bytes)) stop('DURABLE_WRITE_REREAD_MISMATCH', {path: pathValue});
};

const ensureRepositoryDirectory = async (pathValue) => {
  const absolute = repositoryAbsolute(pathValue);
  await mkdir(absolute, {recursive: true});
  if (await realpath(absolute) !== absolute) {
    stop('REPOSITORY_DIRECTORY_REALPATH_MISMATCH', {path: pathValue});
  }
};

const assertSecretAbsent = (apiKey, namedBytes) => {
  const secret = Buffer.from(apiKey, 'utf8');
  if (secret.length === 0) stop('GEMINI_API_KEY_UNAVAILABLE');
  for (const [path, bytes] of namedBytes) {
    if (bytes.includes(secret)) stop('SECRET_PRESENT_IN_FORMAL_BYTES', {path});
  }
};

const decimalPriceParts = (value) => {
  if (!/^(0|[1-9][0-9]*)\.[0-9]{2}$/u.test(value)) {
    stop('PRICE_FORMAT_INVALID');
  }
  const [whole, fraction] = value.split('.');
  return BigInt(whole) * 100n + BigInt(fraction);
};

const formatHundredMillionths = (numerator) => {
  const denominator = 100000000n;
  const whole = numerator / denominator;
  const fraction = (numerator % denominator).toString().padStart(8, '0');
  return `${whole}.${fraction}`;
};

const tokenCost = (tokens, price) =>
  formatHundredMillionths(BigInt(tokens) * decimalPriceParts(price));

const totalTokenCost = (inputTokens, outputTokens, inputPrice, outputPrice) =>
  formatHundredMillionths(
    BigInt(inputTokens) * decimalPriceParts(inputPrice)
      + BigInt(outputTokens) * decimalPriceParts(outputPrice),
  );

const cloneJson = (value) => JSON.parse(JSON.stringify(value));

const parseProviderResponseRawOnceV001 = (rawBytes) => {
  let text;
  try {
    text = new TextDecoder('utf-8', {fatal: true}).decode(rawBytes);
  } catch {
    return Object.freeze({
      status: 'rejected',
      code: 'HTTP_RESPONSE_UTF8_INVALID',
      parserInvocationCount: 1,
    });
  }
  let envelope;
  try {
    envelope = JSON.parse(text);
  } catch {
    return Object.freeze({
      status: 'rejected',
      code: 'HTTP_RESPONSE_JSON_INVALID',
      parserInvocationCount: 1,
    });
  }
  if (envelope === null || typeof envelope !== 'object' || Array.isArray(envelope)) {
    return Object.freeze({
      status: 'rejected',
      code: 'HTTP_RESPONSE_SHAPE_INVALID',
      parserInvocationCount: 1,
    });
  }
  return Object.freeze({status: 'parsed', envelope, parserInvocationCount: 1});
};

const decodeHttpMetadata = (rawBytes) => {
  const parsed = parseProviderResponseRawOnceV001(rawBytes);
  if (parsed.status !== 'parsed') {
    stop(parsed.code);
  }
  const {envelope} = parsed;
  if (typeof envelope.modelVersion !== 'string' || envelope.modelVersion.length === 0) {
    stop('HTTP_RESPONSE_MODEL_VERSION_MISSING');
  }
  const usage = envelope.usageMetadata;
  if (usage === null || typeof usage !== 'object' || Array.isArray(usage)
    || !Number.isSafeInteger(usage.promptTokenCount)
    || usage.promptTokenCount < 0
    || !Number.isSafeInteger(usage.totalTokenCount)
    || usage.totalTokenCount < usage.promptTokenCount) {
    stop('HTTP_RESPONSE_USAGE_INVALID');
  }
  return {
    envelope,
    modelVersion: envelope.modelVersion,
    usageMetadata: cloneJson(usage),
    inputTokens: usage.promptTokenCount,
    outputTokens: usage.totalTokenCount - usage.promptTokenCount,
  };
};

const decodeCandidateText = (envelope) => {
  if (!Array.isArray(envelope.candidates)
    || envelope.candidates.length !== 1
    || !Array.isArray(envelope.candidates[0]?.content?.parts)
    || envelope.candidates[0].content.parts.length !== 1
    || typeof envelope.candidates[0].content.parts[0]?.text !== 'string') {
    stop('HTTP_RESPONSE_CANDIDATE_TEXT_INVALID');
  }
  const semanticText = envelope.candidates[0].content.parts[0].text;
  const semanticBytes = Buffer.from(semanticText, 'utf8');
  if (semanticBytes.toString('utf8') !== semanticText) {
    stop('HTTP_RESPONSE_CANDIDATE_TEXT_UTF8_INVALID');
  }
  return semanticBytes;
};

export function inspectPresentationCaptionGateB6ProviderResponseV001({
  rawBytes,
  httpStatus,
  contentType,
  expectedModelId,
}) {
  if (!Buffer.isBuffer(rawBytes)
    || typeof expectedModelId !== 'string'
    || expectedModelId.length === 0) {
    throw new TypeError('provider response observation input is invalid');
  }

  const httpEnvelopeFailure = responseStatusAndTypeValid =>
    responseStatusAndTypeValid
      ? null
      : Object.freeze({
        code: 'B6_V002_HTTP_ENVELOPE_INVALID',
        facts: Object.freeze({httpStatus}),
      });
  const responseStatusAndTypeValid = httpStatus === 200
    && contentType === 'application/json; charset=UTF-8';
  const parsed = parseProviderResponseRawOnceV001(rawBytes);
  const envelope = parsed.status === 'parsed' ? parsed.envelope : null;

  const responseModelVersion = envelope !== null
    && typeof envelope.modelVersion === 'string'
    && envelope.modelVersion.length > 0
    ? envelope.modelVersion
    : null;
  const modelMissingCode = envelope !== null && responseModelVersion === null
    ? 'HTTP_RESPONSE_MODEL_VERSION_MISSING'
    : null;
  const modelMismatchCode = responseModelVersion !== null
    && responseModelVersion !== expectedModelId
    ? 'B6_V002_RESPONSE_MODEL_INVALID'
    : null;

  const rawUsage = envelope !== null ? envelope.usageMetadata : null;
  const preliminaryUsageValid = rawUsage !== null
    && typeof rawUsage === 'object'
    && !Array.isArray(rawUsage)
    && Number.isSafeInteger(rawUsage.promptTokenCount)
    && rawUsage.promptTokenCount >= 0
    && Number.isSafeInteger(rawUsage.totalTokenCount)
    && rawUsage.totalTokenCount >= rawUsage.promptTokenCount;
  const usageValuesValid = preliminaryUsageValid
    && [rawUsage.promptTokenCount, rawUsage.candidatesTokenCount,
      rawUsage.thoughtsTokenCount, rawUsage.totalTokenCount]
      .every((value) => Number.isSafeInteger(value) && value >= 0)
    && BigInt(rawUsage.totalTokenCount)
      === BigInt(rawUsage.promptTokenCount)
        + BigInt(rawUsage.candidatesTokenCount)
        + BigInt(rawUsage.thoughtsTokenCount);
  const observedServiceTier = rawUsage !== null
    && typeof rawUsage === 'object'
    && !Array.isArray(rawUsage)
    ? rawUsage.serviceTier ?? null
    : null;
  const tierValid = preliminaryUsageValid
    && (rawUsage.serviceTier === undefined || rawUsage.serviceTier === 'standard');
  const usageMetadata = usageValuesValid
    ? Object.freeze({
      promptTokenCount: rawUsage.promptTokenCount,
      candidatesTokenCount: rawUsage.candidatesTokenCount,
      thoughtsTokenCount: rawUsage.thoughtsTokenCount,
      totalTokenCount: rawUsage.totalTokenCount,
    })
    : null;

  const candidates = envelope !== null ? envelope.candidates : null;
  const candidateCount = Array.isArray(candidates) ? candidates.length : null;
  const candidateCountValid = candidateCount === 1;
  const candidate = candidateCountValid ? candidates[0] : null;
  const part = candidate?.content?.parts?.[0];
  const partKeys = part !== null
    && typeof part === 'object'
    && !Array.isArray(part)
    ? Object.keys(part)
    : [];
  const partKeysValid = partKeys.length >= 1
    && partKeys.length <= 2
    && partKeys.includes('text')
    && partKeys.every((key) => key === 'text' || key === 'thoughtSignature');
  const candidateContentShapeValid = candidateCountValid
    && candidate?.content?.role === 'model'
    && Array.isArray(candidate.content.parts)
    && candidate.content.parts.length === 1
    && part !== null
    && typeof part === 'object'
    && !Array.isArray(part)
    && partKeysValid
    && typeof part.text === 'string'
    && part.text.length > 0
    && (!Object.hasOwn(part, 'thoughtSignature')
      || (typeof part.thoughtSignature === 'string'
        && part.thoughtSignature.length > 0));
  const semanticText = candidateContentShapeValid ? part.text : null;
  const semanticBytes = semanticText === null
    ? null
    : Buffer.from(semanticText, 'utf8');
  const candidateTextUtf8Valid = semanticText === null
    || semanticBytes.toString('utf8') === semanticText;

  const failures = [
    httpEnvelopeFailure(responseStatusAndTypeValid),
    parsed.status === 'parsed'
      ? null
      : Object.freeze({code: parsed.code, facts: Object.freeze({})}),
    modelMissingCode === null
      ? null
      : Object.freeze({code: modelMissingCode, facts: Object.freeze({})}),
    envelope === null || preliminaryUsageValid
      ? null
      : Object.freeze({
        code: 'HTTP_RESPONSE_USAGE_INVALID',
        facts: Object.freeze({}),
      }),
    modelMismatchCode === null
      ? null
      : Object.freeze({code: modelMismatchCode, facts: Object.freeze({})}),
    envelope === null || !preliminaryUsageValid || usageValuesValid
      ? null
      : Object.freeze({code: 'B6_V002_USAGE_INVALID', facts: Object.freeze({})}),
    envelope === null || !preliminaryUsageValid || !usageValuesValid || tierValid
      ? null
      : Object.freeze({
        code: 'B6_V002_RESPONSE_TIER_INVALID',
        facts: Object.freeze({observedServiceTier}),
      }),
    envelope === null || candidateCountValid
      ? null
      : Object.freeze({
        code: 'B6_V002_CANDIDATE_COUNT_INVALID',
        facts: Object.freeze({}),
      }),
    envelope === null || !candidateCountValid || candidateContentShapeValid
      ? null
      : Object.freeze({
        code: 'B6_V002_CANDIDATE_CONTENT_INVALID',
        facts: Object.freeze({}),
      }),
    candidateTextUtf8Valid
      ? null
      : Object.freeze({
        code: 'HTTP_RESPONSE_CANDIDATE_TEXT_UTF8_INVALID',
        facts: Object.freeze({}),
      }),
  ].filter((value) => value !== null);
  const primaryFailure = failures[0] ?? null;
  const checks = Object.freeze({
    httpEnvelope: responseStatusAndTypeValid && parsed.status === 'parsed'
      ? 'passed'
      : 'failed',
    model: envelope === null
      ? 'blocked'
      : modelMissingCode === null && modelMismatchCode === null
        ? 'passed'
        : 'failed',
    usage: envelope === null
      ? 'blocked'
      : preliminaryUsageValid && usageValuesValid && tierValid
        ? 'passed'
        : 'failed',
    responseCandidateCount: envelope === null
      ? 'blocked'
      : candidateCountValid
        ? 'passed'
        : 'failed',
    candidateContent: envelope === null || !candidateCountValid
      ? 'blocked'
      : candidateContentShapeValid && candidateTextUtf8Valid
        ? 'passed'
        : 'failed',
  });

  return Object.freeze({
    status: primaryFailure === null ? 'passed' : 'rejected',
    parserInvocationCount: parsed.parserInvocationCount,
    primaryRejectionCode: primaryFailure?.code ?? null,
    primaryRejectionFacts: primaryFailure?.facts ?? Object.freeze({}),
    checks,
    httpStatus,
    contentType,
    responseModelVersion,
    observedServiceTier,
    usageMetadata,
    candidateCount,
    semanticText,
    semanticBytes,
  });
}

export async function executePresentationCaptionGateB6ObservationTransportV001({
  requestBytes,
  apiKey,
  fetchImplementation = globalThis.fetch,
  timeoutSignalFactory = (milliseconds) => AbortSignal.timeout(milliseconds),
  rawResponseWriter,
  expectedModelId,
  endpoint =
    'https://generativelanguage.googleapis.com/v1beta/'
      + 'models/gemini-3.6-flash:generateContent',
}) {
  if (!Buffer.isBuffer(requestBytes)
    || typeof apiKey !== 'string'
    || apiKey.length === 0
    || typeof fetchImplementation !== 'function'
    || typeof timeoutSignalFactory !== 'function'
    || typeof rawResponseWriter !== 'function'
    || typeof expectedModelId !== 'string'
    || expectedModelId.length === 0) {
    stop('B6_V002_TRANSPORT_INPUT_INVALID');
  }
  assertSecretAbsent(apiKey, [['generate-content-request.json', requestBytes]]);
  let response;
  try {
    response = await fetchImplementation(endpoint, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-goog-api-key': apiKey,
      },
      body: requestBytes,
      redirect: 'error',
      signal: timeoutSignalFactory(600000),
    });
  } catch (error) {
    stop('GENERATE_CONTENT_REQUEST_FAILED', {
      errorName: error?.name ?? 'Error',
    });
  }
  let rawBytes;
  try {
    rawBytes = Buffer.from(await response.arrayBuffer());
  } catch (error) {
    stop('GENERATE_CONTENT_RESPONSE_READ_FAILED', {
      errorName: error?.name ?? 'Error',
    });
  }
  assertSecretAbsent(apiKey, [['generate-content-response.raw.json', rawBytes]]);
  await rawResponseWriter(rawBytes);
  const contentType = response.headers.get('content-type');
  const observation = inspectPresentationCaptionGateB6ProviderResponseV001({
    rawBytes,
    httpStatus: response.status,
    contentType,
    expectedModelId,
  });
  return Object.freeze({...observation, rawBytes});
}

export async function executePresentationCaptionGateB6TransportV002({
  requestBytes,
  apiKey,
  fetchImplementation = globalThis.fetch,
  timeoutSignalFactory = (milliseconds) => AbortSignal.timeout(milliseconds),
  rawResponseWriter,
  endpoint =
    'https://generativelanguage.googleapis.com/v1beta/'
      + 'models/gemini-3.6-flash:generateContent',
}) {
  const observation =
    await executePresentationCaptionGateB6ObservationTransportV001({
      requestBytes,
      apiKey,
      fetchImplementation,
      timeoutSignalFactory,
      rawResponseWriter,
      expectedModelId: 'gemini-3.6-flash',
      endpoint,
    });
  if (observation.status !== 'passed') {
    stop(
      observation.primaryRejectionCode,
      observation.primaryRejectionFacts,
    );
  }
  return Object.freeze({
    status: 'passed',
    httpStatus: observation.httpStatus,
    contentType: observation.contentType,
    rawBytes: observation.rawBytes,
    semanticBytes: observation.semanticBytes,
    responseModelVersion: observation.responseModelVersion,
    observedServiceTier: observation.observedServiceTier,
    candidateCount: observation.candidateCount,
    usageMetadata: observation.usageMetadata,
  });
}

export function validatePresentationCaptionGateB6CostStateV002({
  b5Manifest,
  usageMetadata,
}) {
  const authorization = b5Manifest?.spendingAuthorization;
  const diagnosis = b5Manifest?.tokenDiagnosis;
  if (authorization === null
    || typeof authorization !== 'object'
    || Array.isArray(authorization)
    || diagnosis === null
    || typeof diagnosis !== 'object'
    || Array.isArray(diagnosis)
    || authorization.currency !== 'USD'
    || authorization.maximumNanoUsd !== 500000000
    || authorization.inputPriceNanoUsdPerToken !== 1500
    || authorization.outputPriceNanoUsdPerToken !== 7500
    || authorization.finalInputTokens !== diagnosis.finalInputTokens
    || !Number.isSafeInteger(authorization.finalInputTokens)
    || authorization.finalInputTokens <= 0
    || !Number.isSafeInteger(authorization.maxOutputTokens)
    || authorization.maxOutputTokens <= 0
    || !Number.isSafeInteger(authorization.preSendEstimateNanoUsd)
    || authorization.preSendEstimateNanoUsd <= 0
    || authorization.status !== 'approved-for-single-send') {
    return Object.freeze({
      status: 'rejected',
      code: 'API_BUDGET_BINDING_INVALID',
    });
  }
  const preSend = BigInt(authorization.finalInputTokens) * 1500n
    + BigInt(authorization.maxOutputTokens) * 7500n;
  if (preSend !== BigInt(authorization.preSendEstimateNanoUsd)
    || preSend > 500000000n) {
    return Object.freeze({
      status: 'rejected',
      code: 'API_BUDGET_BINDING_INVALID',
    });
  }
  if (usageMetadata === undefined) {
    return Object.freeze({
      status: 'passed-pre-send',
      preSendEstimateNanoUsd: Number(preSend),
    });
  }
  const keys = [
    'promptTokenCount',
    'candidatesTokenCount',
    'thoughtsTokenCount',
    'totalTokenCount',
  ];
  if (usageMetadata === null
    || typeof usageMetadata !== 'object'
    || Array.isArray(usageMetadata)
    || JSON.stringify(Object.keys(usageMetadata)) !== JSON.stringify(keys)
    || !keys.every((key) =>
      Number.isSafeInteger(usageMetadata[key]) && usageMetadata[key] >= 0)
    || usageMetadata.totalTokenCount
      !== usageMetadata.promptTokenCount
        + usageMetadata.candidatesTokenCount
        + usageMetadata.thoughtsTokenCount) {
    return Object.freeze({
      status: 'rejected',
      code: 'API_USAGE_ACCOUNTING_INVALID',
    });
  }
  const observed = BigInt(usageMetadata.promptTokenCount) * 1500n
    + BigInt(
      usageMetadata.candidatesTokenCount + usageMetadata.thoughtsTokenCount,
    ) * 7500n;
  return Object.freeze({
    status: observed <= 500000000n ? 'passed' : 'rejected',
    code: observed <= 500000000n ? null : 'API_USAGE_BUDGET_VIOLATION',
    promptCostNanoUsd: usageMetadata.promptTokenCount * 1500,
    outputCostNanoUsd:
      (usageMetadata.candidatesTokenCount + usageMetadata.thoughtsTokenCount)
        * 7500,
    observedUsageCostNanoUsd: Number(observed),
    estimateComparison: Object.freeze({
      promptTokensExceededFinalInputTokens:
        usageMetadata.promptTokenCount > authorization.finalInputTokens,
      outputTokensExceededDerivedMaxOutputTokens:
        usageMetadata.candidatesTokenCount + usageMetadata.thoughtsTokenCount
          > authorization.maxOutputTokens,
      usageCostExceededPreSendEstimate:
        observed > BigInt(authorization.preSendEstimateNanoUsd),
    }),
  });
}

const artifactBinding = (path, bytes) => ({
  path,
  fileSha256: sha256(bytes),
  byteLength: bytes.length,
});

const makeBaseManifest = ({config, request, executionStartedAt}) => ({
  schemaVersion: 'presentation-caption-gate-b6-manifest-v001',
  status: 'running',
  stage: 'b6-one-shot-generate-accept-and-display-plan',
  attemptId: config.attemptId,
  executionStartedAt,
  fixedRequestBinding: {
    path: config.requestPath,
    fileSha256: request.fileSha256,
    byteLength: request.bytes.length,
    byteIdenticalSendRequired: true,
  },
  transport: {
    product: 'Gemini Developer API',
    apiVersion: 'v1beta',
    endpoint: config.endpoint,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Server-Timeout': String(SERVER_TIMEOUT_SECONDS),
      'x-goog-api-key': '<redacted>',
    },
    clientTimeoutMilliseconds: TIMEOUT_MILLISECONDS,
    automaticRetries: 0,
    generateContentCalls: 0,
  },
  response: {
    httpStatus: null,
    contentType: null,
    rawBinding: null,
    configuredModelId: config.modelId,
    responseModelVersion: null,
    usageMetadata: null,
  },
  cost: {
    inputPriceUsdPerMillion: config.inputPriceUsdPerMillion,
    outputPriceUsdPerMillion: config.outputPriceUsdPerMillion,
    inputTokens: null,
    outputTokensIncludingThinking: null,
    inputUsageBasedCostUsd: null,
    outputUsageBasedCostUsd: null,
    totalUsageBasedCostUsd: null,
    actualBilledAmountUsd: null,
    actualBillingObservation: 'not-observable-from-generateContent-response',
  },
  semanticOutputBinding: null,
  b1: null,
  b4: null,
  stop: null,
});

const persistManifest = async ({config, manifest, apiKey}) => {
  const bytes = formalBytes(manifest);
  assertSecretAbsent(apiKey, [['b6-manifest.json', bytes]]);
  const path = `${config.outputRoot}/b6-manifest.json`;
  await writeExclusiveDurable(path, bytes);
  return artifactBinding(path, bytes);
};

const safeFacts = (facts) => {
  if (facts === null || typeof facts !== 'object' || Array.isArray(facts)) return {};
  return Object.fromEntries(Object.entries(facts).filter(([, value]) =>
    value === null
      || typeof value === 'string'
      || typeof value === 'number'
      || typeof value === 'boolean'));
};

const B6_CONFIG_KEYS = Object.freeze([
  'attemptId',
  'requestPath',
  'expectedRequestSha256',
  'b5ManifestPath',
  'outputRoot',
  'rawResponsePath',
  'semanticRawPath',
  'b1JobPath',
  'b1ReportPath',
  'b4JobPath',
  'b4PairId',
  'b4OutputRoot',
  'b4RunnerOutputPath',
  'b4DisplayPlanPath',
  'b4StaticTemplatePath',
  'sourcePackageRoot',
  'modelId',
  'endpoint',
  'inputPriceUsdPerMillion',
  'outputPriceUsdPerMillion',
]);

const validateB6ConfiguredFormalInput = (config) => {
  if (config === null || typeof config !== 'object' || Array.isArray(config)
    || JSON.stringify(Object.keys(config).sort())
      !== JSON.stringify([...B6_CONFIG_KEYS].sort())) {
    stop('B6_CONFIG_SHAPE_INVALID');
  }
  if (!FORMAL_ID_PATTERN.test(config.attemptId)
    || !FORMAL_ID_PATTERN.test(config.b4PairId)
    || !FORMAL_ID_PATTERN.test(config.modelId)
    || !SHA256_PATTERN.test(config.expectedRequestSha256)) {
    stop('B6_CONFIG_VALUE_INVALID');
  }
  for (const key of B6_CONFIG_KEYS.filter((entry) =>
    entry.endsWith('Path') || entry.endsWith('Root'))) {
    repositoryAbsolute(config[key]);
  }
  const expectedEndpoint =
    `https://generativelanguage.googleapis.com/v1beta/models/${config.modelId}`
    + ':generateContent';
  if (config.endpoint !== expectedEndpoint
    || config.rawResponsePath
      !== `${config.outputRoot}/generate-content-response.raw.json`) {
    stop('B6_CONFIG_RELATION_INVALID');
  }
  decimalPriceParts(config.inputPriceUsdPerMillion);
  decimalPriceParts(config.outputPriceUsdPerMillion);
};

export async function executePresentationCaptionGateB6V001({
  config = PRESENTATION_CAPTION_GATE_B6_FORMAL_CONFIG_V001,
  apiKey = process.env.GEMINI_API_KEY,
  fetchImplementation = globalThis.fetch,
  timeoutSignalFactory = (milliseconds) => AbortSignal.timeout(milliseconds),
  continuePipeline,
  currentDate = new Date(),
}) {
  let manifest = null;
  let outputRootCreated = false;
  try {
    if (typeof apiKey !== 'string' || apiKey.length === 0) {
      stop('GEMINI_API_KEY_UNAVAILABLE');
    }
    if (typeof fetchImplementation !== 'function'
      || typeof timeoutSignalFactory !== 'function'
      || typeof continuePipeline !== 'function') {
      stop('B6_EXECUTION_DEPENDENCY_INVALID');
    }
    validateB6ConfiguredFormalInput(config);
    const request = await readStable(config.requestPath);
    if (request.fileSha256 !== config.expectedRequestSha256) {
      stop('B5_FIXED_REQUEST_SHA256_MISMATCH', {
        expected: config.expectedRequestSha256,
        observed: request.fileSha256,
      });
    }
    assertSecretAbsent(apiKey, [[config.requestPath, request.bytes]]);
    if (await pathExists(config.outputRoot)) {
      stop('B6_OUTPUT_ROOT_ALREADY_EXISTS', {path: config.outputRoot});
    }
    await mkdir(dirname(repositoryAbsolute(config.outputRoot)), {recursive: true});
    await mkdir(repositoryAbsolute(config.outputRoot), {recursive: false});
    syncDirectory(dirname(repositoryAbsolute(config.outputRoot)));
    outputRootCreated = true;
    manifest = makeBaseManifest({
      config,
      request,
      executionStartedAt: currentDate.toISOString(),
    });

    let response;
    manifest.transport.generateContentCalls = 1;
    try {
      response = await fetchImplementation(config.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Server-Timeout': String(SERVER_TIMEOUT_SECONDS),
          'x-goog-api-key': apiKey,
        },
        body: request.bytes,
        redirect: 'error',
        signal: timeoutSignalFactory(TIMEOUT_MILLISECONDS),
      });
    } catch (error) {
      stop('GENERATE_CONTENT_REQUEST_FAILED', {errorName: error?.name ?? 'Error'});
    }

    let rawBytes;
    try {
      rawBytes = Buffer.from(await response.arrayBuffer());
    } catch (error) {
      stop('GENERATE_CONTENT_RESPONSE_READ_FAILED', {
        errorName: error?.name ?? 'Error',
      });
    }
    assertSecretAbsent(apiKey, [[config.rawResponsePath, rawBytes]]);
    await writeExclusiveDurable(config.rawResponsePath, rawBytes);
    manifest.response.httpStatus = response.status;
    manifest.response.contentType = response.headers.get('content-type');
    manifest.response.rawBinding = artifactBinding(config.rawResponsePath, rawBytes);
    if (!response.ok) {
      stop('GENERATE_CONTENT_HTTP_FAILED', {httpStatus: response.status});
    }

    const metadata = decodeHttpMetadata(rawBytes);
    manifest.response.responseModelVersion = metadata.modelVersion;
    manifest.response.usageMetadata = metadata.usageMetadata;
    manifest.cost.inputTokens = metadata.inputTokens;
    manifest.cost.outputTokensIncludingThinking = metadata.outputTokens;
    manifest.cost.inputUsageBasedCostUsd = tokenCost(
      metadata.inputTokens,
      config.inputPriceUsdPerMillion,
    );
    manifest.cost.outputUsageBasedCostUsd = tokenCost(
      metadata.outputTokens,
      config.outputPriceUsdPerMillion,
    );
    manifest.cost.totalUsageBasedCostUsd = totalTokenCost(
      metadata.inputTokens,
      metadata.outputTokens,
      config.inputPriceUsdPerMillion,
      config.outputPriceUsdPerMillion,
    );

    const semanticBytes = decodeCandidateText(metadata.envelope);
    assertSecretAbsent(apiKey, [[config.semanticRawPath, semanticBytes]]);
    await writeExclusiveDurable(config.semanticRawPath, semanticBytes);
    manifest.semanticOutputBinding = artifactBinding(
      config.semanticRawPath,
      semanticBytes,
    );

    const continuation = await continuePipeline({
      config,
      semanticBytes,
      semanticOutputBinding: manifest.semanticOutputBinding,
    });
    if (continuation?.status !== 'display-plan-ready') {
      manifest.status = continuation?.status === 'abstained'
        ? 'abstained'
        : continuation?.status === 'stopped'
          ? 'stopped'
          : 'rejected';
      manifest.stage = continuation?.status === 'stopped'
        ? 'b1-b4-orchestration-stopped'
        : 'b1-acceptance-stopped';
      manifest.b1 = continuation?.b1 ?? null;
      manifest.b4 = null;
      manifest.stop = {
        reason: continuation?.reason ?? 'B1_NOT_ACCEPTED',
        facts: safeFacts(continuation?.facts),
      };
      const manifestBinding = await persistManifest({config, manifest, apiKey});
      return {
        status: manifest.status,
        reason: manifest.stop.reason,
        generateContentCalls: 1,
        automaticRetries: 0,
        manifestBinding,
      };
    }

    manifest.status = 'passed_pending_human_review';
    manifest.stage = 'b4-display-plan-ready';
    manifest.b1 = continuation.b1;
    manifest.b4 = continuation.b4;
    manifest.stop = null;
    const manifestBinding = await persistManifest({config, manifest, apiKey});
    return {
      status: 'display-plan-ready',
      generateContentCalls: 1,
      automaticRetries: 0,
      manifestBinding,
      displayPlanBinding: continuation.b4.displayPlanBinding,
      responseModelVersion: metadata.modelVersion,
      usageMetadata: metadata.usageMetadata,
      usageBasedCostUsd: manifest.cost.totalUsageBasedCostUsd,
    };
  } catch (error) {
    const reason = error instanceof B6Stop ? error.reason : 'B6_INTERNAL_FAILURE';
    const facts = error instanceof B6Stop ? safeFacts(error.facts) : {};
    let manifestBinding = null;
    if (outputRootCreated && manifest !== null) {
      manifest.status = 'stopped';
      manifest.stage = 'b6-stopped';
      manifest.stop = {reason, facts};
      try {
        manifestBinding = await persistManifest({config, manifest, apiKey});
      } catch {
        // The original failure remains the only trusted diagnosis.
      }
    }
    return {
      status: 'stopped',
      reason,
      facts,
      generateContentCalls: manifest?.transport?.generateContentCalls ?? 0,
      automaticRetries: 0,
      manifestBinding,
    };
  }
}

const jsonBinding = async (pathValue) => {
  const snapshot = await readStable(pathValue);
  const value = strictDecode(snapshot.bytes, 'BOUND_JSON_INVALID');
  return {
    path: pathValue,
    fileSha256: snapshot.fileSha256,
    canonicalSha256: canonicalSha256(value),
    value,
  };
};

const implementationBindings = async (entries) => Promise.all(
  entries.map(async ([role, path]) => ({
    role,
    path,
    fileSha256: (await readStable(path)).fileSha256,
  })),
);

const currentGitCommit = () => {
  try {
    const value = execFileSync('git', ['rev-parse', 'HEAD'], {
      cwd: WORKSPACE_ROOT,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
    if (!/^[0-9a-f]{40}$/u.test(value)) stop('GIT_COMMIT_UNAVAILABLE');
    return value;
  } catch {
    stop('GIT_COMMIT_UNAVAILABLE');
  }
};

const runB4Process = async (jobPath) => new Promise((resolvePromise) => {
  const childEnvironment = {...process.env};
  delete childEnvironment.GEMINI_API_KEY;
  const child = spawn(
    process.execPath,
    [repositoryAbsolute(
      'evals/clip_composition/run_presentation_caption_display_pair_job_v001.mjs',
    ), jobPath],
    {
      cwd: WORKSPACE_ROOT,
      env: childEnvironment,
      stdio: ['ignore', 'pipe', 'pipe'],
    },
  );
  const stdout = [];
  const stderr = [];
  child.stdout.on('data', (chunk) => stdout.push(Buffer.from(chunk)));
  child.stderr.on('data', (chunk) => stderr.push(Buffer.from(chunk)));
  child.on('error', () => {
    resolvePromise({exitCode: null, stdout: Buffer.concat(stdout), stderr: Buffer.concat(stderr)});
  });
  child.on('close', (code) => {
    resolvePromise({exitCode: code, stdout: Buffer.concat(stdout), stderr: Buffer.concat(stderr)});
  });
});

const buildB1Job = async ({config, semanticOutputBinding}) => {
  const packageManifest = await jsonBinding(`${config.sourcePackageRoot}/package-manifest.json`);
  const packageReport = await jsonBinding(
    `${config.sourcePackageRoot}/package-validation-report.json`,
  );
  if (packageReport.value?.status !== 'passed') stop('SOURCE_PACKAGE_NOT_PASSED');
  const projection = packageReport.value.observedProjection;
  if (![projection?.sourceAtomCount, projection?.containerCount, projection?.boundaryCandidateCount]
    .every((value) => Number.isSafeInteger(value) && value >= 0)) {
    stop('SOURCE_PACKAGE_PROJECTION_INVALID');
  }
  await ensureRepositoryDirectory(
    config.b1JobPath.slice(0, config.b1JobPath.lastIndexOf('/')),
  );
  const readOnly = await inspectPresentationCaptionSemanticOutputReadOnlyProjectionV001(
    config.b1JobPath,
    {
      filesystemAdapter:
        createPresentationCaptionSemanticOutputProductionFilesystemAdapterV001(),
    },
  );
  if (readOnly?.kind !== 'trusted-projection') {
    stop('B1_READ_ONLY_PROJECTION_UNAVAILABLE', {
      diagnostic: readOnly?.diagnostic ?? null,
    });
  }
  const runtime = packageManifest.value.runtimeBinding;
  const job = {
    schemaVersion: 'presentation-caption-semantic-output-check-job-v001',
    jobId: config.attemptId,
    artifactId: packageManifest.value.artifactId,
    mode: 'read-only-check',
    implementationBinding: {
      gitCommit: currentGitCommit(),
      files: await implementationBindings(B1_DIRECT_IMPLEMENTATIONS),
      dependencyFiles: await implementationBindings(B1_DEPENDENCY_IMPLEMENTATIONS),
    },
    sourcePackageBinding: {
      rootPath: config.sourcePackageRoot,
      manifest: {
        path: packageManifest.path,
        fileSha256: packageManifest.fileSha256,
        canonicalSha256: packageManifest.canonicalSha256,
      },
      validationReport: {
        path: packageReport.path,
        fileSha256: packageReport.fileSha256,
        canonicalSha256: packageReport.canonicalSha256,
      },
    },
    semanticOutputBinding: {
      path: semanticOutputBinding.path,
      fileSha256: semanticOutputBinding.fileSha256,
    },
    expectedRuntime: {
      nodeBinarySha256: runtime.nodeBinarySha256,
      nodeVersion: runtime.nodeVersion,
      icuVersion: runtime.icuVersion,
      resolvedLocale: runtime.resolvedLocale,
      resolvedGranularity: runtime.resolvedGranularity,
    },
    expectedProjection: {
      sourceAtomCount: projection.sourceAtomCount,
      containerCount: projection.containerCount,
      boundaryCandidateCount: projection.boundaryCandidateCount,
    },
    readOnlyGuard: {
      watchedRoot: readOnly.watchedRoot,
      excludedPaths: [...readOnly.excludedPaths],
      expectedBeforeCanonicalSha256: readOnly.expectedBeforeCanonicalSha256,
    },
  };
  return {job, bytes: formalBytes(job)};
};

const runB1 = async ({config, semanticOutputBinding}) => {
  const built = await buildB1Job({config, semanticOutputBinding});
  await writeExclusiveDurable(config.b1JobPath, built.bytes);
  const stdout = [];
  const stderr = [];
  const streams = Object.freeze({
    stdout: Object.freeze({write: (value) => stdout.push(Buffer.from(value))}),
    stderr: Object.freeze({write: (value) => stderr.push(Buffer.from(value))}),
  });
  const exitCode = await runPresentationCaptionSemanticOutputCheckCliV001(
    [config.b1JobPath],
    streams,
  );
  const reportBytes = exitCode === 0 ? Buffer.concat(stdout) : Buffer.concat(stderr);
  if (reportBytes.length === 0) stop('B1_REPORT_MISSING', {exitCode});
  await writeExclusiveDurable(config.b1ReportPath, reportBytes);
  const jobBinding = artifactBinding(config.b1JobPath, built.bytes);
  if (exitCode === 2) {
    let diagnostic;
    try {
      diagnostic = new TextDecoder('utf-8', {fatal: true}).decode(reportBytes);
    } catch {
      stop('B1_FATAL_DIAGNOSTIC_UTF8_INVALID', {
        exitCode,
        reportFileSha256: sha256(reportBytes),
      });
    }
    return {
      exitCode,
      report: null,
      fatalDiagnostic: diagnostic,
      jobBinding,
      reportBinding: artifactBinding(config.b1ReportPath, reportBytes),
    };
  }
  const report = strictDecode(reportBytes, 'B1_REPORT_JSON_INVALID');
  const reportBinding = {
    ...artifactBinding(config.b1ReportPath, reportBytes),
    canonicalSha256: canonicalSha256(report),
  };
  return {exitCode, report, jobBinding, reportBinding};
};

const buildB4Job = async ({config, b1}) => {
  const templateSnapshot = await readStable(config.b4StaticTemplatePath);
  const template = strictDecode(templateSnapshot.bytes, 'B4_TEMPLATE_JSON_INVALID');
  const raw = await jsonBinding(config.semanticRawPath);
  const b1Job = await jsonBinding(config.b1JobPath);
  const b1Report = await jsonBinding(config.b1ReportPath);
  const formalOutputPath = config.b4OutputRoot;
  const allowedWritePaths = [
    formalOutputPath,
    `${formalOutputPath}.lock`,
    `${formalOutputPath}.work`,
  ];
  const readOnly = inspectPresentationCaptionDisplayPairReadOnlyProjectionV001({
    watchedRoot: 'evals/clip_composition/outputs/presentation',
    jobPath: config.b4JobPath,
    allowedWritePaths,
  });
  if (readOnly?.kind !== 'trusted-projection') {
    stop('B4_READ_ONLY_PROJECTION_UNAVAILABLE', {
      diagnostic: readOnly?.diagnostic ?? null,
    });
  }
  const observed = b1.report.observedProjection;
  const compiler = b1.report.compilerInput;
  if (b1.report.status !== 'passed'
    || compiler?.status !== 'generated'
    || ![observed?.sourceAtomCount, observed?.containerCount,
      observed?.boundaryCandidateCount, observed?.meaningGroupCount, observed?.lineCount]
      .every((value) => Number.isSafeInteger(value) && value >= 0)) {
    stop('B1_REPORT_NOT_READY_FOR_B4');
  }
  const job = {
    schemaVersion: 'presentation-caption-display-pair-generation-job-v001',
    jobId: config.attemptId,
    artifactId: template.artifactId,
    mode: 'formal-generation',
    implementationBinding: {
      gitCommit: currentGitCommit(),
      files: await implementationBindings(B4_DIRECT_IMPLEMENTATIONS),
      dependencyFiles: await implementationBindings(B4_DEPENDENCY_IMPLEMENTATIONS),
    },
    sourcePackageBinding: cloneJson(template.sourcePackageBinding),
    semanticCheckBinding: {
      job: {
        path: b1Job.path,
        fileSha256: b1Job.fileSha256,
        canonicalSha256: b1Job.canonicalSha256,
      },
      rawSemanticOutput: {
        path: raw.path,
        fileSha256: raw.fileSha256,
        canonicalSha256: raw.canonicalSha256,
      },
      validationReport: {
        path: b1Report.path,
        fileSha256: b1Report.fileSha256,
        canonicalSha256: b1Report.canonicalSha256,
      },
      expectedCompilerInputObservedByteSha256: compiler.observedByteSha256,
      expectedCompilerInputCanonicalSha256: compiler.canonicalSha256,
    },
    retainedSourceBinding: cloneJson(template.retainedSourceBinding),
    baseMediaBinding: cloneJson(template.baseMediaBinding),
    registryBinding: cloneJson(template.registryBinding),
    expectedRuntime: cloneJson(template.expectedRuntime),
    expectedProjection: {
      sourceAtomCount: observed.sourceAtomCount,
      containerCount: observed.containerCount,
      boundaryCandidateCount: observed.boundaryCandidateCount,
      meaningGroupCount: observed.meaningGroupCount,
      cueCount: observed.meaningGroupCount,
      lineCount: observed.lineCount,
      timelineSegmentCount: template.expectedStaticProjection.timelineSegmentCount,
      compilerInputObservedByteSha256: compiler.observedByteSha256,
      compilerInputCanonicalSha256: compiler.canonicalSha256,
    },
    publication: {
      pairId: config.b4PairId,
      formalOutputPath,
      lockPath: `${formalOutputPath}.lock`,
      workPath: `${formalOutputPath}.work`,
    },
    readOnlyGuard: {
      watchedRoot: readOnly.watchedRoot,
      excludedPaths: [...readOnly.excludedPaths],
      allowedWritePaths: [...readOnly.allowedWritePaths],
      expectedBeforeCanonicalSha256: readOnly.expectedBeforeCanonicalSha256,
    },
  };
  return {job, bytes: formalBytes(job)};
};

const runB4 = async ({config, b1}) => {
  const built = await buildB4Job({config, b1});
  await writeExclusiveDurable(config.b4JobPath, built.bytes);
  const result = await runB4Process(config.b4JobPath);
  const runnerBytes = result.stdout.length > 0 ? result.stdout : result.stderr;
  if (runnerBytes.length > 0) {
    await writeExclusiveDurable(config.b4RunnerOutputPath, runnerBytes);
  }
  if (result.exitCode !== 0) {
    stop('B4_FORMAL_GENERATION_NOT_ACCEPTED', {exitCode: result.exitCode});
  }
  const report = strictDecode(result.stdout, 'B4_RUNNER_REPORT_JSON_INVALID');
  if (report.status !== 'passed_pending_human_review') {
    stop('B4_FORMAL_GENERATION_STATUS_INVALID');
  }
  const displayPlan = await jsonBinding(config.b4DisplayPlanPath);
  return {
    jobBinding: artifactBinding(config.b4JobPath, built.bytes),
    runnerReportBinding: artifactBinding(config.b4RunnerOutputPath, result.stdout),
    pairOutputRoot: config.b4OutputRoot,
    displayPlanBinding: {
      path: displayPlan.path,
      fileSha256: displayPlan.fileSha256,
      canonicalSha256: displayPlan.canonicalSha256,
    },
    reviewState: 'pending_human_review',
  };
};

export async function continuePresentationCaptionGateB6ThroughB1B4V001({
  config,
  semanticOutputBinding,
}) {
  let b1Facts = null;
  try {
    const b1 = await runB1({config, semanticOutputBinding});
    b1Facts = {
      exitCode: b1.exitCode,
      status: b1.report?.status ?? 'fatal',
      jobBinding: b1.jobBinding,
      validationReportBinding: b1.reportBinding,
      fatalDiagnostic: b1.fatalDiagnostic ?? null,
      compilerInput: cloneJson(b1.report?.compilerInput ?? null),
      observedProjection: cloneJson(b1.report?.observedProjection ?? null),
    };
    if (b1.exitCode === 2) {
      return {
        status: 'stopped',
        reason: 'B1_FATAL',
        facts: {diagnostic: b1.fatalDiagnostic},
        b1: b1Facts,
      };
    }
    if (b1.report.status !== 'passed' || b1.exitCode !== 0) {
      return {
        status: b1.report.status === 'abstained' ? 'abstained' : 'rejected',
        reason: b1.report.status === 'abstained'
          ? 'B1_ABSTAINED'
          : 'B1_SEMANTIC_OUTPUT_REJECTED',
        b1: b1Facts,
      };
    }
    const b4 = await runB4({config, b1});
    return {status: 'display-plan-ready', b1: b1Facts, b4};
  } catch (error) {
    if (error instanceof B6Stop) {
      return {
        status: 'stopped',
        reason: error.reason,
        facts: error.facts,
        b1: b1Facts,
      };
    }
    return {
      status: 'stopped',
      reason: 'B1_B4_ORCHESTRATION_INTERNAL_FAILURE',
      facts: {},
      b1: b1Facts,
    };
  }
}

const formalPreexistencePaths = (config) => Object.freeze([
  config.outputRoot,
  config.semanticRawPath,
  config.b1JobPath,
  config.b4JobPath,
  config.b4OutputRoot,
  `${config.b4OutputRoot}.lock`,
  `${config.b4OutputRoot}.work`,
]);

export async function runPresentationCaptionGateB6ConfiguredFormalV001({
  config,
  apiKey = process.env.GEMINI_API_KEY,
  fetchImplementation = globalThis.fetch,
  timeoutSignalFactory = (milliseconds) => AbortSignal.timeout(milliseconds),
  currentDate = new Date(),
  continuePipeline = continuePresentationCaptionGateB6ThroughB1B4V001,
}) {
  try {
    validateB6ConfiguredFormalInput(config);
    await ensureRepositoryDirectory(
      config.b1JobPath.slice(0, config.b1JobPath.lastIndexOf('/')),
    );
    for (const pathValue of formalPreexistencePaths(config)) {
      if (await pathExists(pathValue)) {
        return {
          status: 'stopped',
          reason: 'FORMAL_OUTPUT_PATH_ALREADY_EXISTS',
          facts: {path: pathValue},
          generateContentCalls: 0,
          automaticRetries: 0,
          manifestBinding: null,
        };
      }
    }
    await Promise.all([
      readStable(config.requestPath),
      readStable(config.b5ManifestPath),
      readStable(config.b4StaticTemplatePath),
      ...B1_DIRECT_IMPLEMENTATIONS.map(([, path]) => readStable(path)),
      ...B1_DEPENDENCY_IMPLEMENTATIONS.map(([, path]) => readStable(path)),
      ...B4_DIRECT_IMPLEMENTATIONS.map(([, path]) => readStable(path)),
      ...B4_DEPENDENCY_IMPLEMENTATIONS.map(([, path]) => readStable(path)),
    ]);
    currentGitCommit();
  } catch (error) {
    return {
      status: 'stopped',
      reason: error instanceof B6Stop ? error.reason : 'B6_FORMAL_PREFLIGHT_FAILED',
      facts: error instanceof B6Stop ? safeFacts(error.facts) : {},
      generateContentCalls: 0,
      automaticRetries: 0,
      manifestBinding: null,
    };
  }
  return executePresentationCaptionGateB6V001({
    config,
    apiKey,
    fetchImplementation,
    timeoutSignalFactory,
    currentDate,
    continuePipeline,
  });
}

export async function runPresentationCaptionGateB6FormalV001({
  apiKey = process.env.GEMINI_API_KEY,
  fetchImplementation = globalThis.fetch,
  timeoutSignalFactory = (milliseconds) => AbortSignal.timeout(milliseconds),
  currentDate = new Date(),
} = {}) {
  return runPresentationCaptionGateB6ConfiguredFormalV001({
    config: PRESENTATION_CAPTION_GATE_B6_FORMAL_CONFIG_V001,
    apiKey,
    fetchImplementation,
    timeoutSignalFactory,
    currentDate,
    continuePipeline: continuePresentationCaptionGateB6ThroughB1B4V001,
  });
}

const main = async () => {
  const result = await runPresentationCaptionGateB6FormalV001();
  process.stdout.write(formalBytes(result));
  process.exitCode = result.status === 'display-plan-ready' ? 0 : 1;
};

if (typeof process.argv[1] === 'string'
  && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(() => {
    process.stdout.write(formalBytes({
      status: 'stopped',
      reason: 'B6_FATAL_REPORT_UNAVAILABLE',
      generateContentCalls: 0,
      automaticRetries: 0,
    }));
    process.exitCode = 2;
  });
}
