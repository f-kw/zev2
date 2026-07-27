#!/usr/bin/env node

import {
  lstat,
  mkdir,
  readFile,
  readdir,
  writeFile,
} from 'node:fs/promises';
import {dirname, isAbsolute, join, resolve} from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';

import {
  buildPresentationCaptionGateB5RequestsV004,
} from './run_presentation_caption_gate_b5_v004.mjs';
import {
  decodePresentationCaptionB1StrictJsonV001,
  serializePresentationCaptionB1FormalJsonV001,
  sha256PresentationCaptionB1BytesV001,
} from './presentation_caption_semantic_source_package_v001.mjs';
import {
  inspectPresentationCaptionDisplayPairStaticPreflightProjectionV001,
} from './run_presentation_caption_display_pair_static_preflight_v001.mjs';

const workspaceRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const requestBuilderPath = fileURLToPath(
  new URL('./run_presentation_caption_gate_b5_v004.mjs', import.meta.url),
);

const JOB_SCHEMA = 'presentation-caption-gate-b5-initial-job-v001';
const MANIFEST_SCHEMA = 'presentation-caption-gate-b5-initial-manifest-v001';
const APPROVED_MODEL = 'gemini-3.6-flash';
const APPROVED_MODEL_RESOURCE = `models/${APPROVED_MODEL}`;
const APPROVED_TIER = 'PAID_STANDARD_DEFAULT_BY_OMISSION';
const APPROVED_INPUT_LIMIT = 1_048_576;
const APPROVED_OUTPUT_LIMIT = 65_536;
const APPROVED_INPUT_PRICE = '1.50';
const APPROVED_OUTPUT_PRICE = '7.50';
const SERVER_TIMEOUT_SECONDS = 600;
const CLIENT_TIMEOUT_MILLISECONDS = 600_000;
const FORMAL_FILE_NAMES = Object.freeze([
  'generate-content-request.json',
  'input-token-count-request.json',
  'input-token-count-response.raw.json',
  'maximum-response-token-count-request.json',
  'maximum-response-token-count-response.raw.json',
  'b5-initial-manifest.json',
]);

class B5InitialStop extends Error {
  constructor(reason, facts = {}) {
    super(reason);
    this.name = 'B5InitialStop';
    this.reason = reason;
    this.facts = facts;
  }
}

const stop = (reason, facts = {}) => {
  throw new B5InitialStop(reason, facts);
};

const formalBytes = (value) => {
  const result = serializePresentationCaptionB1FormalJsonV001(value);
  if (result.status !== 'serialized') stop('FORMAL_JSON_SERIALIZATION_FAILED');
  return result.bytes;
};

const strictDecode = (bytes, reason) => {
  const result = decodePresentationCaptionB1StrictJsonV001(bytes);
  if (result.status !== 'decoded') {
    stop(reason, {decodeReason: result.reason});
  }
  return result.value;
};

const sha256 = (bytes) => {
  const result = sha256PresentationCaptionB1BytesV001(bytes);
  if (result.status !== 'hashed') stop('SHA256_CALCULATION_FAILED');
  return result.sha256;
};

const isSha256 = (value) => (
  typeof value === 'string' && /^[0-9a-f]{64}$/u.test(value)
);
const isNonEmptyString = (value) => (
  typeof value === 'string' && value.length > 0
);
const isPositiveInteger = (value) => (
  Number.isSafeInteger(value) && value > 0
);
const isNonNegativeInteger = (value) => (
  Number.isSafeInteger(value) && value >= 0
);
const exactKeys = (value, keys) => (
  value !== null
  && typeof value === 'object'
  && !Array.isArray(value)
  && Object.keys(value).length === keys.length
  && keys.every((key) => Object.hasOwn(value, key))
);
const exactJson = (left, right) => JSON.stringify(left) === JSON.stringify(right);

const workspacePath = (value) => (
  isAbsolute(value) ? resolve(value) : resolve(workspaceRoot, value)
);

const pathExists = async (pathValue) => {
  try {
    await lstat(pathValue);
    return true;
  } catch (error) {
    if (error?.code === 'ENOENT') return false;
    throw error;
  }
};

const readBoundBytes = async (binding, mismatchReason) => {
  const bytes = await readFile(workspacePath(binding.path));
  const observed = sha256(bytes);
  if (observed !== binding.fileSha256) {
    stop(mismatchReason, {
      path: binding.path,
      expected: binding.fileSha256,
      observed,
    });
  }
  return bytes;
};

const writeExclusive = async (pathValue, bytes) => {
  await writeFile(pathValue, bytes, {flag: 'wx', mode: 0o600});
  const observed = await readFile(pathValue);
  if (!observed.equals(bytes)) {
    stop('FORMAL_FILE_REREAD_MISMATCH', {path: pathValue});
  }
};

const dateInTokyo = (date) => {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map(({type, value}) => [type, value]));
  return `${values.year}-${values.month}-${values.day}`;
};

const validArtifactBinding = (value) => (
  exactKeys(value, ['path', 'fileSha256'])
  && isNonEmptyString(value.path)
  && isSha256(value.fileSha256)
);

const validateJob = (value, currentDate) => {
  if (!exactKeys(value, [
    'schemaVersion',
    'jobId',
    'sourceBinding',
    'requestBuilderBinding',
    'upstreamProjection',
    'outputDirectory',
    'officialVerification',
  ])
    || value.schemaVersion !== JOB_SCHEMA
    || !isNonEmptyString(value.jobId)
    || !isNonEmptyString(value.outputDirectory)
    || !exactKeys(value.sourceBinding, [
      'path',
      'fileSha256',
      'characterCount',
      'containerCount',
      'boundaryCandidateCount',
    ])
    || !isNonEmptyString(value.sourceBinding.path)
    || !isSha256(value.sourceBinding.fileSha256)
    || !isPositiveInteger(value.sourceBinding.characterCount)
    || !isPositiveInteger(value.sourceBinding.containerCount)
    || !isPositiveInteger(value.sourceBinding.boundaryCandidateCount)
    || !validArtifactBinding(value.requestBuilderBinding)
    || !exactKeys(value.upstreamProjection, [
      'sentinelPath',
      'expectedCanonicalSha256',
    ])
    || !isNonEmptyString(value.upstreamProjection.sentinelPath)
    || !isSha256(value.upstreamProjection.expectedCanonicalSha256)
    || !exactKeys(value.officialVerification, [
      'observedAt',
      'sources',
      'modelId',
      'modelResource',
      'inputLimit',
      'outputLimit',
      'tier',
      'inputPriceUsdPerMillion',
      'outputPriceUsdPerMillion',
    ])
    || !/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/u.test(
      value.officialVerification.observedAt,
    )
    || !Array.isArray(value.officialVerification.sources)
    || value.officialVerification.sources.length === 0
    || value.officialVerification.sources.some(
      (source) => typeof source !== 'string' || !source.startsWith('https://'),
    )
    || value.officialVerification.modelId !== APPROVED_MODEL
    || value.officialVerification.modelResource !== APPROVED_MODEL_RESOURCE
    || value.officialVerification.inputLimit !== APPROVED_INPUT_LIMIT
    || value.officialVerification.outputLimit !== APPROVED_OUTPUT_LIMIT
    || value.officialVerification.tier !== APPROVED_TIER
    || value.officialVerification.inputPriceUsdPerMillion
      !== APPROVED_INPUT_PRICE
    || value.officialVerification.outputPriceUsdPerMillion
      !== APPROVED_OUTPUT_PRICE) {
    stop('JOB_SCHEMA_OR_APPROVED_VALUES_INVALID');
  }
  if (value.officialVerification.observedAt !== dateInTokyo(currentDate)) {
    stop('OFFICIAL_VERIFICATION_DATE_IS_NOT_EXECUTION_DATE', {
      expected: dateInTokyo(currentDate),
      observed: value.officialVerification.observedAt,
    });
  }
  if (workspacePath(value.requestBuilderBinding.path) !== requestBuilderPath) {
    stop('REQUEST_BUILDER_PATH_IS_NOT_V004_CANONICAL', {
      path: value.requestBuilderBinding.path,
    });
  }
  return value;
};

const containsPropertyName = (value, propertyName) => {
  if (Array.isArray(value)) {
    return value.some((entry) => containsPropertyName(entry, propertyName));
  }
  if (value && typeof value === 'object') {
    return Object.entries(value).some(
      ([key, child]) => (
        key === propertyName || containsPropertyName(child, propertyName)
      ),
    );
  }
  return false;
};

const assertNoSecret = (apiKey, namedBytes) => {
  if (typeof apiKey !== 'string' || apiKey.length === 0) {
    stop('GEMINI_API_KEY_UNAVAILABLE');
  }
  const secret = Buffer.from(apiKey, 'utf8');
  for (const [name, bytes] of namedBytes) {
    if (bytes.includes(secret)) {
      stop('SECRET_PRESENT_IN_SAVED_BYTES', {fileName: name});
    }
  }
};

const responseTotalTokens = (bytes, label) => {
  const value = strictDecode(bytes, `${label}_RESPONSE_JSON_INVALID`);
  if (value === null
    || typeof value !== 'object'
    || Array.isArray(value)
    || !isNonNegativeInteger(value.totalTokens)) {
    stop(`${label}_TOTAL_TOKENS_INVALID`);
  }
  return value.totalTokens;
};

const performCountTokens = async ({
  endpoint,
  apiKey,
  bodyBytes,
  responsePath,
  responseLabel,
  fetchImplementation,
}) => {
  let response;
  try {
    response = await fetchImplementation(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Server-Timeout': String(SERVER_TIMEOUT_SECONDS),
        'x-goog-api-key': apiKey,
      },
      body: bodyBytes,
      redirect: 'error',
      signal: AbortSignal.timeout(CLIENT_TIMEOUT_MILLISECONDS),
    });
  } catch (error) {
    stop(`${responseLabel}_REQUEST_FAILED`, {
      errorName: error?.name ?? 'Error',
    });
  }
  let rawBytes;
  try {
    rawBytes = Buffer.from(await response.arrayBuffer());
  } catch (error) {
    stop(`${responseLabel}_RESPONSE_READ_FAILED`, {
      errorName: error?.name ?? 'Error',
    });
  }
  assertNoSecret(apiKey, [[responsePath, rawBytes]]);
  await writeExclusive(responsePath, rawBytes);
  if (!response.ok) {
    stop(`${responseLabel}_HTTP_FAILED`, {httpStatus: response.status});
  }
  return {
    rawBytes,
    httpStatus: response.status,
    contentType: response.headers.get('content-type'),
  };
};

const artifactBinding = (declaredDirectory, fileName, bytes) => ({
  path: join(declaredDirectory, fileName),
  fileSha256: sha256(bytes),
  byteLength: bytes.length,
});

const passedCheck = (id, meaning, evidence) => ({
  id,
  status: 'passed',
  meaning,
  evidence,
});

export async function executePresentationCaptionGateB5InitialV001({
  jobPath,
  fetchImplementation = globalThis.fetch,
  inspectUpstreamProjection =
    inspectPresentationCaptionDisplayPairStaticPreflightProjectionV001,
  currentDate = new Date(),
  apiKey = process.env.GEMINI_API_KEY,
}) {
  try {
    if (!isNonEmptyString(jobPath)) stop('JOB_PATH_INVALID');
    const absoluteJobPath = workspacePath(jobPath);
    const jobBytes = await readFile(absoluteJobPath);
    const jobSha256 = sha256(jobBytes);
    const job = validateJob(
      strictDecode(jobBytes, 'JOB_JSON_INVALID'),
      currentDate,
    );

    const outputRoot = workspacePath(job.outputDirectory);
    if (await pathExists(outputRoot)) {
      stop('FORMAL_OUTPUT_DIRECTORY_ALREADY_EXISTS', {
        outputDirectory: job.outputDirectory,
      });
    }

    const builderBytes = await readBoundBytes(
      job.requestBuilderBinding,
      'REQUEST_BUILDER_SHA256_MISMATCH',
    );
    const sourceBytes = await readBoundBytes(
      job.sourceBinding,
      'SEMANTIC_SOURCE_SHA256_MISMATCH',
    );
    const built = buildPresentationCaptionGateB5RequestsV004({
      sourceBytes,
      config: {
        expectedSourceSha256: job.sourceBinding.fileSha256,
        expectedCharacterCount: job.sourceBinding.characterCount,
        expectedContainerCount: job.sourceBinding.containerCount,
        expectedBoundaryCandidateCount:
          job.sourceBinding.boundaryCandidateCount,
        modelId: job.officialVerification.modelId,
        officialOutputLimit: job.officialVerification.outputLimit,
      },
    });

    const projection = await inspectUpstreamProjection(
      job.upstreamProjection.sentinelPath,
    );
    if (projection?.kind !== 'trusted-projection'
      || projection.expectedBeforeCanonicalSha256
        !== job.upstreamProjection.expectedCanonicalSha256) {
      stop('UPSTREAM_READ_ONLY_PROJECTION_MISMATCH', {
        expected: job.upstreamProjection.expectedCanonicalSha256,
        observed: projection?.expectedBeforeCanonicalSha256 ?? null,
      });
    }

    const endpoint =
      `https://generativelanguage.googleapis.com/v1beta/models/`
      + `${job.officialVerification.modelId}:countTokens`;
    const requestCandidates = [
      ['generate-content-request.json', built.generateBytes],
      ['input-token-count-request.json', built.inputCountBytes],
      ['maximum-response-token-count-request.json', built.maximumCountBytes],
    ];
    assertNoSecret(apiKey, requestCandidates);

    await mkdir(dirname(outputRoot), {recursive: true});
    await mkdir(outputRoot);
    for (const [fileName, bytes] of requestCandidates) {
      await writeExclusive(join(outputRoot, fileName), bytes);
    }

    const inputResponsePath = join(
      outputRoot,
      'input-token-count-response.raw.json',
    );
    const inputResponse = await performCountTokens({
      endpoint,
      apiKey,
      bodyBytes: built.inputCountBytes,
      responsePath: inputResponsePath,
      responseLabel: 'INPUT_COUNT_TOKENS',
      fetchImplementation,
    });
    const inputTokens = responseTotalTokens(
      inputResponse.rawBytes,
      'INPUT_COUNT_TOKENS',
    );
    if (inputTokens > job.officialVerification.inputLimit) {
      stop('INPUT_COUNT_TOKENS_EXCEEDS_OFFICIAL_INPUT_LIMIT', {
        inputTokens,
        officialInputLimit: job.officialVerification.inputLimit,
      });
    }

    const maximumResponsePath = join(
      outputRoot,
      'maximum-response-token-count-response.raw.json',
    );
    const maximumResponse = await performCountTokens({
      endpoint,
      apiKey,
      bodyBytes: built.maximumCountBytes,
      responsePath: maximumResponsePath,
      responseLabel: 'MAXIMUM_RESPONSE_COUNT_TOKENS',
      fetchImplementation,
    });
    const maximumResponseTokens = responseTotalTokens(
      maximumResponse.rawBytes,
      'MAXIMUM_RESPONSE_COUNT_TOKENS',
    );
    if (maximumResponseTokens > job.officialVerification.outputLimit) {
      stop('MAXIMUM_RESPONSE_COUNT_TOKENS_EXCEEDS_OFFICIAL_OUTPUT_LIMIT', {
        maximumResponseTokens,
        officialOutputLimit: job.officialVerification.outputLimit,
      });
    }

    const [
      sourceAfterBytes,
      builderAfterBytes,
      jobAfterBytes,
    ] = await Promise.all([
      readFile(workspacePath(job.sourceBinding.path)),
      readFile(requestBuilderPath),
      readFile(absoluteJobPath),
    ]);
    if (sha256(sourceAfterBytes) !== built.sourceSha256) {
      stop('SEMANTIC_SOURCE_CHANGED_DURING_B5_INITIAL');
    }
    if (!builderAfterBytes.equals(builderBytes)) {
      stop('REQUEST_BUILDER_CHANGED_DURING_B5_INITIAL');
    }
    if (!jobAfterBytes.equals(jobBytes)) {
      stop('JOB_CHANGED_DURING_B5_INITIAL');
    }

    const rawBindings = [
      artifactBinding(
        job.outputDirectory,
        'input-token-count-response.raw.json',
        inputResponse.rawBytes,
      ),
      artifactBinding(
        job.outputDirectory,
        'maximum-response-token-count-response.raw.json',
        maximumResponse.rawBytes,
      ),
    ];
    const requestBindings = {
      generateContent: artifactBinding(
        job.outputDirectory,
        'generate-content-request.json',
        built.generateBytes,
      ),
      inputTokenCount: artifactBinding(
        job.outputDirectory,
        'input-token-count-request.json',
        built.inputCountBytes,
      ),
      maximumResponseTokenCount: artifactBinding(
        job.outputDirectory,
        'maximum-response-token-count-request.json',
        built.maximumCountBytes,
      ),
    };
    const artifacts = [
      requestBindings.generateContent,
      requestBindings.inputTokenCount,
      rawBindings[0],
      requestBindings.maximumResponseTokenCount,
      rawBindings[1],
    ];
    const officialVerification = {
      ...job.officialVerification,
    };
    const tokenDiagnosis = {
      inputTokens,
      maximumResponseStructureTokens: maximumResponseTokens,
      maximumResponseStructureWithinOfficialOutputLimit: true,
      inputMeasurement: {
        status: 'measured-in-this-attempt',
        countTokensCallsInThisAttempt: 1,
        responsePath: rawBindings[0].path,
        responseSha256: rawBindings[0].fileSha256,
      },
      maximumResponseStructureMeasurement: {
        status: 'measured-in-this-attempt',
        countTokensCallsInThisAttempt: 1,
        responsePath: rawBindings[1].path,
        responseSha256: rawBindings[1].fileSha256,
      },
    };
    const checks = [
      passedCheck(1, 'B3意味入力のpath・SHA・件数をjobへ束縛', {
        sourcePath: job.sourceBinding.path,
        sourceSha256: built.sourceSha256,
        characterCount: built.sourceFacts.characterCount,
        containerCount: built.sourceFacts.containerCount,
        boundaryCandidateCount: built.sourceFacts.boundaryCandidateCount,
      }),
      passedCheck(2, 'B5 v004公開処理を3 requestの唯一の正本として使用', {
        requestBuilderPath: job.requestBuilderBinding.path,
        requestBuilderSha256: job.requestBuilderBinding.fileSha256,
        requestCount: 3,
      }),
      passedCheck(3, '生成requestがB3意味入力をbyte同一のuser contentとして保持', {
        sourceSha256: built.sourceSha256,
        userContentSha256: sha256(Buffer.from(
          built.generateRequest.contents[0].parts[0].text,
          'utf8',
        )),
      }),
      passedCheck(4, '最大有効回答が全行末候補を記載順に一度ずつ使用', {
        boundaryCandidateCount: built.sourceFacts.boundaryCandidateCount,
      }),
      passedCheck(5, 'service tierをrequestへ送らずmedium・2行schemaを維持', {
        serviceTierRequestField: 'omitted',
        thinkingLevel:
          built.generateRequest.generationConfig.thinkingConfig.thinkingLevel,
        maximumLinesPerMeaningGroup:
          built.generateRequest.generationConfig.responseJsonSchema
            .oneOf[1].properties.containers.items.properties.meaningGroups.items
            .properties.lineEndBoundaryCandidateIds.maxItems,
      }),
      passedCheck(6, 'countTokensを入力と最大構造へ各1回だけ実行', {
        inputCountTokensCalls: 1,
        maximumResponseCountTokensCalls: 1,
        totalCountTokensCalls: 2,
        automaticRetries: 0,
        generateContentCalls: 0,
      }),
      passedCheck(7, 'raw responseを解析前に保存しSHAで束縛', {
        inputResponse: rawBindings[0],
        maximumResponse: rawBindings[1],
      }),
      passedCheck(8, '実測tokenが安全な整数で公式上限内', {
        inputTokens,
        inputLimit: job.officialVerification.inputLimit,
        maximumResponseStructureTokens: maximumResponseTokens,
        outputLimit: job.officialVerification.outputLimit,
      }),
      passedCheck(9, '実行日・model・省略時Standard・公式単価を記録', {
        observedAt: job.officialVerification.observedAt,
        modelId: job.officialVerification.modelId,
        tier: job.officialVerification.tier,
        inputPriceUsdPerMillion:
          job.officialVerification.inputPriceUsdPerMillion,
        outputPriceUsdPerMillion:
          job.officialVerification.outputPriceUsdPerMillion,
      }),
      passedCheck(10, 'secret非保存・入力不変・B6未開始を確認', {
        secretOccurrencesInFormalBytes: 0,
        sourceShaBefore: built.sourceSha256,
        sourceShaAfter: sha256(sourceAfterBytes),
        requestBuilderShaBefore: sha256(builderBytes),
        requestBuilderShaAfter: sha256(builderAfterBytes),
        jobShaBefore: jobSha256,
        jobShaAfter: sha256(jobAfterBytes),
        upstreamProjectionBeforePublication:
          projection.expectedBeforeCanonicalSha256,
        b6AutomaticallyStarted: false,
      }),
    ];
    const manifest = {
      schemaVersion: MANIFEST_SCHEMA,
      status: 'passed',
      stage: 'b5-initial-token-diagnosis-only',
      jobBinding: {
        path: jobPath,
        fileSha256: jobSha256,
        jobId: job.jobId,
      },
      requestBuilderBinding: {
        path: job.requestBuilderBinding.path,
        fileSha256: job.requestBuilderBinding.fileSha256,
      },
      upstreamProjection: {
        sentinelPath: job.upstreamProjection.sentinelPath,
        expectedCanonicalSha256:
          job.upstreamProjection.expectedCanonicalSha256,
      },
      sourceBinding: {
        path: job.sourceBinding.path,
        fileSha256: built.sourceSha256,
        characterCount: built.sourceFacts.characterCount,
        containerCount: built.sourceFacts.containerCount,
        boundaryCandidateCount: built.sourceFacts.boundaryCandidateCount,
      },
      requestBindings,
      officialVerification,
      transport: {
        product: 'Gemini Developer API',
        apiVersion: 'v1beta',
        endpoint,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Server-Timeout': String(SERVER_TIMEOUT_SECONDS),
          'x-goog-api-key': '<redacted>',
        },
        clientTimeoutMilliseconds: CLIENT_TIMEOUT_MILLISECONDS,
        automaticRetries: 0,
        countTokensCalls: 2,
        generateContentCalls: 0,
      },
      tokenDiagnosis,
      cost: {
        calculationPolicy:
          'record-measured-tokens-official-unit-price-and-formula-without-private-helper',
        inputMeasurement: {
          measuredTokens: inputTokens,
          officialUnitPriceUsdPerMillion:
            job.officialVerification.inputPriceUsdPerMillion,
          formula:
            `${inputTokens} * `
            + `${job.officialVerification.inputPriceUsdPerMillion} / 1000000`,
        },
        maximumResponseStructureMeasurement: {
          measuredTokens: maximumResponseTokens,
          officialUnitPriceUsdPerMillion:
            job.officialVerification.inputPriceUsdPerMillion,
          formula:
            `${maximumResponseTokens} * `
            + `${job.officialVerification.inputPriceUsdPerMillion} / 1000000`,
        },
        theoreticalB6UpperBoundFormula:
          `${job.officialVerification.inputLimit} * `
          + `${job.officialVerification.inputPriceUsdPerMillion} / 1000000`
          + ` + ${job.officialVerification.outputLimit} * `
          + `${job.officialVerification.outputPriceUsdPerMillion} / 1000000`,
        actualCharge: 'not-observable-from-countTokens-responses',
      },
      artifacts,
      checks,
      nextStage: {
        b6AutomaticallyStarted: false,
      },
    };
    const manifestBytes = formalBytes(manifest);
    assertNoSecret(apiKey, [
      ...requestCandidates,
      ['input-token-count-response.raw.json', inputResponse.rawBytes],
      [
        'maximum-response-token-count-response.raw.json',
        maximumResponse.rawBytes,
      ],
      ['b5-initial-manifest.json', manifestBytes],
    ]);
    await writeExclusive(
      join(outputRoot, 'b5-initial-manifest.json'),
      manifestBytes,
    );
    const observedNames = (await readdir(outputRoot)).sort();
    const expectedNames = [...FORMAL_FILE_NAMES].sort();
    if (!exactJson(observedNames, expectedNames)) {
      stop('FORMAL_FILE_SET_MISMATCH', {
        expected: expectedNames,
        observed: observedNames,
      });
    }
    if (containsPropertyName(built.generateRequest, 'serviceTier')
      || containsPropertyName(built.inputTokenCountRequest, 'serviceTier')
      || containsPropertyName(
        built.maximumResponseTokenCountRequest,
        'serviceTier',
      )) {
      stop('REQUEST_CONTAINS_SERVICE_TIER_FIELD');
    }

    return {
      status: 'passed',
      outputDirectory: job.outputDirectory,
      formalFileCount: FORMAL_FILE_NAMES.length,
      manifestSha256: sha256(manifestBytes),
      inputTokens,
      maximumResponseStructureTokens: maximumResponseTokens,
      countTokensCalls: 2,
      generateContentCalls: 0,
      b6Started: false,
    };
  } catch (error) {
    if (error instanceof B5InitialStop) {
      return {
        status: 'stopped',
        reason: error.reason,
        facts: error.facts,
        b6Started: false,
      };
    }
    if (typeof error?.reason === 'string') {
      return {
        status: 'stopped',
        reason: error.reason,
        facts: error.facts ?? {},
        b6Started: false,
      };
    }
    return {
      status: 'stopped',
      reason: 'UNEXPECTED_IMPLEMENTATION_FAILURE',
      facts: {
        errorName: error?.name ?? 'Error',
        errorCode: typeof error?.code === 'string' ? error.code : null,
      },
      b6Started: false,
    };
  }
}

const main = async () => {
  let result;
  if (process.argv.length !== 4 || process.argv[2] !== '--job') {
    result = {
      status: 'stopped',
      reason: 'CLI_ARGUMENT_INVALID',
      facts: {},
      b6Started: false,
    };
  } else {
    result = await executePresentationCaptionGateB5InitialV001({
      jobPath: process.argv[3],
    });
  }
  process.stdout.write(formalBytes(result));
  process.exitCode = result.status === 'passed' ? 0 : 1;
};

if (typeof process.argv[1] === 'string'
  && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
