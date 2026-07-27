#!/usr/bin/env node

import assert from 'node:assert/strict';
import {mkdtemp, readFile, readdir, rm, writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {dirname, join, resolve} from 'node:path';
import test from 'node:test';
import {fileURLToPath} from 'node:url';

import {
  buildPresentationCaptionGateB5RequestsV004,
  executePresentationCaptionGateB5V004,
} from './run_presentation_caption_gate_b5_v004.mjs';
import {
  serializePresentationCaptionB1FormalJsonV001,
  sha256PresentationCaptionB1BytesV001,
} from './presentation_caption_semantic_source_package_v001.mjs';

const DESIGN_SHA =
  'caf54f70f48849e5109a67e7135299118c15b5a529fb8eb0f5bc28d353bbbaa4';
const PREVIOUS_MAXIMUM_REQUEST_SHA =
  '0de805415b0fb62206d2a436b1bea1c85f4e73e6d518252fd9528eb1f25bb158';
const PREVIOUS_MAXIMUM_RESPONSE_SHA =
  '0f4af6abb87c012f4560864b481e38f9cb7e957abd098d3c3e53bb39906d0cc2';
const PROJECTION_SHA = '7'.repeat(64);
const TEST_DATE = '2026-07-27';
const READABILITY_INSTRUCTION =
  '行は上限以下に収めるだけでなく、意味の切れ目を優先しながら読みやすい短い行へ積極的に分けてください。1つのまとまりには2行まで使えるので、長い1行より短い2行を優先してください';
const workspaceRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

const formalBytes = (value) => {
  const result = serializePresentationCaptionB1FormalJsonV001(value);
  assert.equal(result.status, 'serialized');
  return result.bytes;
};

const sha256 = (bytes) => {
  const result = sha256PresentationCaptionB1BytesV001(bytes);
  assert.equal(result.status, 'hashed');
  return result.sha256;
};

const syntheticSource = {
  schemaVersion: 'presentation-caption-semantic-source-input-v001',
  taskDescription:
    '各containerのboundaryCandidatesを記載順どおり一度ずつ使用し、本文を変更せず、各行のlogicalWidth合計がmaxLogicalWidthPerLine以下になる意味の読める短い行へ分ける。連続する1行または2行を1つのmeaningGroupとしてまとめ、行末はboundaryCandidateIdで示す。',
  displayConstraints: {
    maxLogicalWidthPerLine: 20,
  },
  containers: [
    {
      containerId: 'synthetic-container-a',
      text: '赤青',
      boundaryCandidates: [
        {
          boundaryCandidateId: 'synthetic-boundary-a1',
          text: '赤',
          logicalWidth: 2,
        },
        {
          boundaryCandidateId: 'synthetic-boundary-a2',
          text: '青',
          logicalWidth: 2,
        },
      ],
    },
    {
      containerId: 'synthetic-container-b',
      text: '白',
      boundaryCandidates: [
        {
          boundaryCandidateId: 'synthetic-boundary-b1',
          text: '白',
          logicalWidth: 2,
        },
      ],
    },
  ],
};

const makeConfig = ({sourcePath, outputRoot, sourceBytes}) => ({
  sourceInputPath: sourcePath,
  outputRoot,
  expectedSourceSha256: sha256(sourceBytes),
  expectedCharacterCount: 3,
  expectedContainerCount: 2,
  expectedBoundaryCandidateCount: 3,
  modelId: 'gemini-3.6-flash',
  officialInputLimit: 1_048_576,
  officialOutputLimit: 65_536,
  inputPriceUsdPerMillion: '1.50',
  outputPriceUsdPerMillion: '7.50',
  officialVerificationDate: TEST_DATE,
  expectedUpstreamProjection: PROJECTION_SHA,
  projectionSentinelPath:
    'evals/clip_composition/outputs/presentation/caption-display-pair-static-preflight-jobs/synthetic-caption-b5-v001-projection-sentinel.json',
  designSha256: DESIGN_SHA,
  previousMaximumCountRequestPath:
    resolve(
      workspaceRoot,
      'evals/clip_composition/outputs/presentation/caption-gate-b5/'
        + 'DmWu0jVQfTE-candidate-13-v002/'
        + 'maximum-response-token-count-request.json',
    ),
  previousMaximumCountResponsePath:
    resolve(
      workspaceRoot,
      'evals/clip_composition/outputs/presentation/caption-gate-b5/'
        + 'DmWu0jVQfTE-candidate-13-v002/'
        + 'maximum-response-token-count-response.raw.json',
    ),
  expectedPreviousMaximumCountRequestSha256: PREVIOUS_MAXIMUM_REQUEST_SHA,
  expectedPreviousMaximumCountResponseSha256: PREVIOUS_MAXIMUM_RESPONSE_SHA,
  expectedPreviousMaximumResponseTokens: 3_758,
});

const prepareSyntheticMaximumDiagnostic = async ({
  root,
  sourcePath,
  outputRoot,
  sourceBytes,
  totalTokens = 456,
}) => {
  const baseConfig = makeConfig({sourcePath, outputRoot, sourceBytes});
  const built = buildPresentationCaptionGateB5RequestsV004({
    sourceBytes,
    config: baseConfig,
  });
  const requestPath = join(root, 'previous-maximum-count-request.json');
  const responsePath = join(root, 'previous-maximum-count-response.raw.json');
  const responseBytes = Buffer.from(`{"totalTokens":${totalTokens}}\n`, 'utf8');
  await Promise.all([
    writeFile(requestPath, built.maximumCountBytes),
    writeFile(responsePath, responseBytes),
  ]);
  return {
    ...baseConfig,
    previousMaximumCountRequestPath: requestPath,
    previousMaximumCountResponsePath: responsePath,
    expectedPreviousMaximumCountRequestSha256: sha256(built.maximumCountBytes),
    expectedPreviousMaximumCountResponseSha256: sha256(responseBytes),
    expectedPreviousMaximumResponseTokens: totalTokens,
  };
};

const inspectProjection = async () => ({
  kind: 'trusted-projection',
  expectedBeforeCanonicalSha256: PROJECTION_SHA,
});

test('pure builder keeps the source exact and uses every candidate once', () => {
  const sourceBytes = formalBytes(syntheticSource);
  const config = makeConfig({
    sourcePath: '/unused/source.json',
    outputRoot: '/unused/output',
    sourceBytes,
  });
  const built = buildPresentationCaptionGateB5RequestsV004({sourceBytes, config});
  assert.equal(Object.hasOwn(built.generateRequest, 'serviceTier'), false);
  assert.equal(
    Object.hasOwn(
      built.inputTokenCountRequest.generateContentRequest,
      'serviceTier',
    ),
    false,
  );
  assert.equal(
    built.generateRequest.contents[0].parts[0].text,
    sourceBytes.toString('utf8'),
  );
  assert.deepEqual(
    built.inputTokenCountRequest.generateContentRequest,
    {
      model: 'models/gemini-3.6-flash',
      ...built.generateRequest,
    },
  );
  assert.deepEqual(
    built.maximumResponse.containers.flatMap(
      (container) => container.meaningGroups.flatMap(
        (group) => group.lineEndBoundaryCandidateIds,
      ),
    ),
    [
      'synthetic-boundary-a1',
      'synthetic-boundary-a2',
      'synthetic-boundary-b1',
    ],
  );
});

test('formal v004 requests differ from v003 only by one readability instruction', async () => {
  const sourcePath = resolve(
    workspaceRoot,
    'evals/clip_composition/outputs/presentation/segmenter-boundary-evidence/DmWu0jVQfTE-candidate-13-v001/semantic-source-input.json',
  );
  const v003Root = resolve(
    workspaceRoot,
    'evals/clip_composition/outputs/presentation/caption-gate-b5/DmWu0jVQfTE-candidate-13-v003',
  );
  const v002Root = resolve(
    workspaceRoot,
    'evals/clip_composition/outputs/presentation/caption-gate-b5/DmWu0jVQfTE-candidate-13-v002',
  );
  const [
    sourceBytes,
    v003GenerateBytes,
    v003InputCountBytes,
    v002MaximumCountBytes,
  ] = await Promise.all([
    readFile(sourcePath),
    readFile(join(v003Root, 'generate-content-request.json')),
    readFile(join(v003Root, 'input-token-count-request.json')),
    readFile(join(v002Root, 'maximum-response-token-count-request.json')),
  ]);
  const config = {
    ...makeConfig({
      sourcePath,
      outputRoot: '/unused/formal-v004-output',
      sourceBytes,
    }),
    expectedCharacterCount: 354,
    expectedContainerCount: 3,
    expectedBoundaryCandidateCount: 205,
  };
  const built = buildPresentationCaptionGateB5RequestsV004({sourceBytes, config});

  const projectedGenerate = JSON.parse(v003GenerateBytes.toString('utf8'));
  assert.equal(
    projectedGenerate.generationConfig.thinkingConfig.thinkingLevel,
    'medium',
  );
  projectedGenerate.systemInstruction.parts[0].text +=
    `\n${READABILITY_INSTRUCTION}`;
  const projectedGenerateBytes = formalBytes(projectedGenerate);
  assert.deepEqual(built.generateBytes, projectedGenerateBytes);
  assert.equal(
    built.generateRequest.systemInstruction.parts[0].text
      .split(READABILITY_INSTRUCTION).length - 1,
    1,
  );
  assert.equal(
    built.generateRequest.systemInstruction.parts[0].text.includes('36'),
    false,
  );
  assert.equal(built.generateBytes.length, 37_170);
  assert.equal(
    sha256(built.generateBytes),
    '92b8bee3426d6ad0822f0e81acb832a2340d468362ecff3d5b31f5a1b52bcfc0',
  );

  const projectedInputCount = JSON.parse(v003InputCountBytes.toString('utf8'));
  assert.equal(
    projectedInputCount.generateContentRequest.generationConfig
      .thinkingConfig.thinkingLevel,
    'medium',
  );
  projectedInputCount.generateContentRequest.systemInstruction.parts[0].text +=
    `\n${READABILITY_INSTRUCTION}`;
  const projectedInputCountBytes = formalBytes(projectedInputCount);
  assert.deepEqual(built.inputCountBytes, projectedInputCountBytes);
  assert.equal(built.inputCountBytes.length, 37_466);
  assert.equal(
    sha256(built.inputCountBytes),
    '734e4e1e49cc7a647ae89df78e0d93b862430017182e6daaab0351e63864e94f',
  );

  assert.deepEqual(built.maximumCountBytes, v002MaximumCountBytes);
  assert.equal(built.maximumCountBytes.length, 13_903);
  assert.equal(
    sha256(built.maximumCountBytes),
    '0de805415b0fb62206d2a436b1bea1c85f4e73e6d518252fd9528eb1f25bb158',
  );
});

test('missing environment key stops before output and communication', async () => {
  const root = await mkdtemp(join(tmpdir(), 'zev-b5-no-key-'));
  try {
    const sourcePath = join(root, 'source.json');
    const outputRoot = join(root, 'formal-output');
    const sourceBytes = formalBytes(syntheticSource);
    await import('node:fs/promises').then(({writeFile}) => writeFile(sourcePath, sourceBytes));
    let calls = 0;
    const result = await executePresentationCaptionGateB5V004({
      config: makeConfig({sourcePath, outputRoot, sourceBytes}),
      fetchImplementation: async () => {
        calls += 1;
        throw new Error('must not be called');
      },
      inspectUpstreamProjection: inspectProjection,
      currentDate: new Date('2026-07-27T03:00:00Z'),
      apiKey: undefined,
    });
    assert.deepEqual(result, {
      status: 'stopped',
      reason: 'GEMINI_API_KEY_UNAVAILABLE',
      facts: {},
      b6Started: false,
    });
    assert.equal(calls, 0);
    await assert.rejects(readFile(outputRoot), {code: 'ENOENT'});
  } finally {
    await rm(root, {recursive: true, force: true});
  }
});

test('unapproved execution values stop before output and communication', async () => {
  const root = await mkdtemp(join(tmpdir(), 'zev-b5-wrong-config-'));
  try {
    const sourcePath = join(root, 'source.json');
    const outputRoot = join(root, 'formal-output');
    const sourceBytes = formalBytes(syntheticSource);
    const {writeFile} = await import('node:fs/promises');
    await writeFile(sourcePath, sourceBytes);
    let calls = 0;
    const config = makeConfig({sourcePath, outputRoot, sourceBytes});
    config.modelId = 'different-model';
    const result = await executePresentationCaptionGateB5V004({
      config,
      fetchImplementation: async () => {
        calls += 1;
        throw new Error('must not be called');
      },
      inspectUpstreamProjection: inspectProjection,
      currentDate: new Date('2026-07-27T03:00:00Z'),
      apiKey: 'test-only-key',
    });
    assert.equal(result.status, 'stopped');
    assert.equal(result.reason, 'OFFICIAL_VALUES_DIFFER_FROM_APPROVED_DESIGN');
    assert.equal(calls, 0);
    await assert.rejects(readFile(outputRoot), {code: 'ENOENT'});
  } finally {
    await rm(root, {recursive: true, force: true});
  }
});

test('a reflected key is rejected before the raw response is saved', async () => {
  const root = await mkdtemp(join(tmpdir(), 'zev-b5-reflected-key-'));
  try {
    const {writeFile} = await import('node:fs/promises');
    const sourcePath = join(root, 'source.json');
    const outputRoot = join(root, 'formal-output');
    const sourceBytes = formalBytes(syntheticSource);
    await writeFile(sourcePath, sourceBytes);
    const config = await prepareSyntheticMaximumDiagnostic({
      root,
      sourcePath,
      outputRoot,
      sourceBytes,
    });
    const apiKey = 'test-only-reflected-key';
    let calls = 0;
    const result = await executePresentationCaptionGateB5V004({
      config,
      fetchImplementation: async () => {
        calls += 1;
        return new Response(
          Buffer.from(`{"totalTokens":1,"echo":"${apiKey}"}\n`, 'utf8'),
          {
            status: 200,
            headers: {'content-type': 'application/json'},
          },
        );
      },
      inspectUpstreamProjection: inspectProjection,
      currentDate: new Date('2026-07-27T03:00:00Z'),
      apiKey,
    });
    assert.equal(result.status, 'stopped');
    assert.equal(result.reason, 'SECRET_PRESENT_IN_SAVED_BYTES');
    assert.equal(calls, 1);
    await assert.rejects(
      readFile(join(outputRoot, 'input-token-count-response.raw.json')),
      {code: 'ENOENT'},
    );
  } finally {
    await rm(root, {recursive: true, force: true});
  }
});

test('a failed first call is not retried and never starts the second call', async () => {
  const root = await mkdtemp(join(tmpdir(), 'zev-b5-no-retry-'));
  try {
    const {writeFile} = await import('node:fs/promises');
    const sourcePath = join(root, 'source.json');
    const outputRoot = join(root, 'formal-output');
    const sourceBytes = formalBytes(syntheticSource);
    await writeFile(sourcePath, sourceBytes);
    const config = await prepareSyntheticMaximumDiagnostic({
      root,
      sourcePath,
      outputRoot,
      sourceBytes,
    });
    let calls = 0;
    const result = await executePresentationCaptionGateB5V004({
      config,
      fetchImplementation: async () => {
        calls += 1;
        throw new Error('simulated timeout');
      },
      inspectUpstreamProjection: inspectProjection,
      currentDate: new Date('2026-07-27T03:00:00Z'),
      apiKey: 'test-only-key',
    });
    assert.equal(result.status, 'stopped');
    assert.equal(result.reason, 'INPUT_COUNT_TOKENS_REQUEST_FAILED');
    assert.equal(calls, 1);
    assert.equal(result.b6Started, false);
  } finally {
    await rm(root, {recursive: true, force: true});
  }
});

test('one input countTokens call produces exactly four files and never starts B6', async () => {
  const root = await mkdtemp(join(tmpdir(), 'zev-b5-success-'));
  try {
    const {writeFile} = await import('node:fs/promises');
    const sourcePath = join(root, 'source.json');
    const outputRoot = join(root, 'formal-output');
    const sourceBytes = formalBytes(syntheticSource);
    await writeFile(sourcePath, sourceBytes);
    const config = await prepareSyntheticMaximumDiagnostic({
      root,
      sourcePath,
      outputRoot,
      sourceBytes,
    });
    const rawResponse = Buffer.from('{"totalTokens":123}\n', 'utf8');
    const observedCalls = [];
    const fetchImplementation = async (url, options) => {
      const index = observedCalls.length;
      assert.equal(url.endsWith(':countTokens'), true);
      assert.equal(options.method, 'POST');
      assert.equal(options.headers['X-Server-Timeout'], '600');
      assert.equal(options.headers['x-goog-api-key'], 'test-only-key');
      assert.equal(options.redirect, 'error');
      const names = await readdir(outputRoot);
      assert.equal(names.includes('b5-manifest.json'), false);
      observedCalls.push({
        url,
        body: Buffer.from(options.body),
      });
      return new Response(rawResponse, {
        status: 200,
        headers: {'content-type': 'application/json'},
      });
    };
    const result = await executePresentationCaptionGateB5V004({
      config,
      fetchImplementation,
      inspectUpstreamProjection: inspectProjection,
      currentDate: new Date('2026-07-27T03:00:00Z'),
      apiKey: 'test-only-key',
    });
    assert.equal(result.status, 'passed');
    assert.equal(result.formalFileCount, 4);
    assert.equal(result.inputTokens, 123);
    assert.equal(result.maximumResponseStructureTokens, 456);
    assert.equal(result.b6Started, false);
    assert.equal(observedCalls.length, 1);
    const observedInputCount = JSON.parse(observedCalls[0].body.toString('utf8'));
    assert.equal(
      Object.hasOwn(
        observedInputCount.generateContentRequest,
        'serviceTier',
      ),
      false,
    );
    assert.equal(
      observedInputCount.generateContentRequest.generationConfig
        .thinkingConfig.thinkingLevel,
      'medium',
    );

    const names = (await readdir(outputRoot)).sort();
    assert.deepEqual(names, [
      'b5-manifest.json',
      'generate-content-request.json',
      'input-token-count-request.json',
      'input-token-count-response.raw.json',
    ]);
    assert.deepEqual(
      await readFile(join(outputRoot, 'input-token-count-response.raw.json')),
      rawResponse,
    );
    assert.deepEqual(
      observedCalls[0].body,
      await readFile(join(outputRoot, 'input-token-count-request.json')),
    );
    const manifest = JSON.parse(
      await readFile(join(outputRoot, 'b5-manifest.json'), 'utf8'),
    );
    assert.equal(manifest.status, 'passed');
    assert.equal(manifest.designBinding.baseDesignVersion, 'v004');
    assert.equal(manifest.designBinding.fileSha256, DESIGN_SHA);
    assert.equal(
      manifest.designBinding.approvedRevision.onlyRequestFieldChange,
      'systemInstruction:append-one-readability-short-line-procedure',
    );
    assert.equal(manifest.checks.length, 10);
    assert.equal(manifest.checks.every((check) => check.status === 'passed'), true);
    assert.equal(manifest.artifacts.length, 3);
    assert.equal(manifest.manifestSelfHashPolicy, 'manifest-is-not-self-hashed-v001');
    assert.equal(manifest.transport.countTokensCalls, 1);
    assert.equal(manifest.transport.generateContentCalls, 0);
    assert.equal(manifest.transport.headers['x-goog-api-key'], '<redacted>');
    assert.equal(
      manifest.officialVerification.tier,
      'PAID_STANDARD_DEFAULT_BY_OMISSION',
    );
    assert.equal(
      manifest.checks[5].evidence.serviceTierRequestField,
      'omitted',
    );
    assert.equal(manifest.checks[5].evidence.thinkingLevel, 'medium');
    assert.equal(
      manifest.tokenDiagnosis.maximumResponseStructureMeasurement.status,
      'reused-from-b5-v002-with-byte-identical-request',
    );
    assert.equal(
      manifest.tokenDiagnosis.maximumResponseStructureMeasurement
        .countTokensCallsInThisAttempt,
      0,
    );
    for (const artifact of manifest.artifacts) {
      const bytes = await readFile(join(outputRoot, artifact.fileName));
      assert.equal(artifact.fileSha256, sha256(bytes));
      assert.equal(artifact.byteLength, bytes.length);
    }
    assert.equal(
      (await Promise.all(names.map((name) =>
        readFile(join(outputRoot, name), 'utf8')))).some(
        (text) => text.includes('test-only-key'),
      ),
      false,
    );
  } finally {
    await rm(root, {recursive: true, force: true});
  }
});
