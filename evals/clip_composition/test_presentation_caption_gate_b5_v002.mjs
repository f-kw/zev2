#!/usr/bin/env node

import assert from 'node:assert/strict';
import {mkdtemp, readFile, readdir, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {dirname, join, resolve} from 'node:path';
import test from 'node:test';
import {fileURLToPath} from 'node:url';

import {
  buildPresentationCaptionGateB5RequestsV002,
  executePresentationCaptionGateB5V002,
} from './run_presentation_caption_gate_b5_v002.mjs';
import {
  serializePresentationCaptionB1FormalJsonV001,
  sha256PresentationCaptionB1BytesV001,
} from './presentation_caption_semantic_source_package_v001.mjs';

const DESIGN_SHA =
  '93bdc9e40ddf95b5cec9baba73501d9a0507d50a05329244c8123eb098e161cd';
const PROJECTION_SHA = '7'.repeat(64);
const TEST_DATE = '2026-07-27';
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
});

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
  const built = buildPresentationCaptionGateB5RequestsV002({sourceBytes, config});
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

test('formal v002 requests differ from v001 only by omitted serviceTier fields', async () => {
  const sourcePath = resolve(
    workspaceRoot,
    'evals/clip_composition/outputs/presentation/segmenter-boundary-evidence/DmWu0jVQfTE-candidate-13-v001/semantic-source-input.json',
  );
  const v001Root = resolve(
    workspaceRoot,
    'evals/clip_composition/outputs/presentation/caption-gate-b5/DmWu0jVQfTE-candidate-13-v001',
  );
  const [
    sourceBytes,
    v001GenerateBytes,
    v001InputCountBytes,
    v001MaximumCountBytes,
  ] = await Promise.all([
    readFile(sourcePath),
    readFile(join(v001Root, 'generate-content-request.json')),
    readFile(join(v001Root, 'input-token-count-request.json')),
    readFile(join(v001Root, 'maximum-response-token-count-request.json')),
  ]);
  const config = {
    ...makeConfig({
      sourcePath,
      outputRoot: '/unused/formal-v002-output',
      sourceBytes,
    }),
    expectedCharacterCount: 354,
    expectedContainerCount: 3,
    expectedBoundaryCandidateCount: 205,
  };
  const built = buildPresentationCaptionGateB5RequestsV002({sourceBytes, config});

  const projectedGenerate = JSON.parse(v001GenerateBytes.toString('utf8'));
  assert.equal(
    projectedGenerate.serviceTier,
    'SERVICE_TIER_STANDARD',
  );
  delete projectedGenerate.serviceTier;
  const projectedGenerateBytes = formalBytes(projectedGenerate);
  assert.deepEqual(built.generateBytes, projectedGenerateBytes);
  assert.equal(built.generateBytes.length, 36_913);
  assert.equal(
    sha256(built.generateBytes),
    '7fa902580b78bb5da3d36025135e4655ab2528e401ba5a76537f2af3c1939ed2',
  );

  const projectedInputCount = JSON.parse(v001InputCountBytes.toString('utf8'));
  assert.equal(
    projectedInputCount.generateContentRequest.serviceTier,
    'SERVICE_TIER_STANDARD',
  );
  delete projectedInputCount.generateContentRequest.serviceTier;
  const projectedInputCountBytes = formalBytes(projectedInputCount);
  assert.deepEqual(built.inputCountBytes, projectedInputCountBytes);
  assert.equal(built.inputCountBytes.length, 37_209);
  assert.equal(
    sha256(built.inputCountBytes),
    '83470ebfefe94ac07dda023fa7706aa0f63d007feb26dd59bdd21a7b70af07df',
  );

  assert.deepEqual(built.maximumCountBytes, v001MaximumCountBytes);
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
    const result = await executePresentationCaptionGateB5V002({
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
    const result = await executePresentationCaptionGateB5V002({
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
    const apiKey = 'test-only-reflected-key';
    let calls = 0;
    const result = await executePresentationCaptionGateB5V002({
      config: makeConfig({sourcePath, outputRoot, sourceBytes}),
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
    let calls = 0;
    const result = await executePresentationCaptionGateB5V002({
      config: makeConfig({sourcePath, outputRoot, sourceBytes}),
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

test('two countTokens calls produce exactly six files and never start B6', async () => {
  const root = await mkdtemp(join(tmpdir(), 'zev-b5-success-'));
  try {
    const {writeFile} = await import('node:fs/promises');
    const sourcePath = join(root, 'source.json');
    const outputRoot = join(root, 'formal-output');
    const sourceBytes = formalBytes(syntheticSource);
    await writeFile(sourcePath, sourceBytes);
    const rawResponses = [
      Buffer.from('{"totalTokens":123}\n', 'utf8'),
      Buffer.from('{"totalTokens":456}\n', 'utf8'),
    ];
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
      return new Response(rawResponses[index], {
        status: 200,
        headers: {'content-type': 'application/json'},
      });
    };
    const result = await executePresentationCaptionGateB5V002({
      config: makeConfig({sourcePath, outputRoot, sourceBytes}),
      fetchImplementation,
      inspectUpstreamProjection: inspectProjection,
      currentDate: new Date('2026-07-27T03:00:00Z'),
      apiKey: 'test-only-key',
    });
    assert.equal(result.status, 'passed');
    assert.equal(result.formalFileCount, 6);
    assert.equal(result.inputTokens, 123);
    assert.equal(result.maximumResponseStructureTokens, 456);
    assert.equal(result.b6Started, false);
    assert.equal(observedCalls.length, 2);
    const observedInputCount = JSON.parse(observedCalls[0].body.toString('utf8'));
    const observedMaximumCount = JSON.parse(observedCalls[1].body.toString('utf8'));
    assert.equal(
      Object.hasOwn(
        observedInputCount.generateContentRequest,
        'serviceTier',
      ),
      false,
    );
    assert.equal(Object.hasOwn(observedMaximumCount, 'serviceTier'), false);

    const names = (await readdir(outputRoot)).sort();
    assert.deepEqual(names, [
      'b5-manifest.json',
      'generate-content-request.json',
      'input-token-count-request.json',
      'input-token-count-response.raw.json',
      'maximum-response-token-count-request.json',
      'maximum-response-token-count-response.raw.json',
    ]);
    assert.deepEqual(
      await readFile(join(outputRoot, 'input-token-count-response.raw.json')),
      rawResponses[0],
    );
    assert.deepEqual(
      await readFile(
        join(outputRoot, 'maximum-response-token-count-response.raw.json'),
      ),
      rawResponses[1],
    );
    assert.deepEqual(
      observedCalls[0].body,
      await readFile(join(outputRoot, 'input-token-count-request.json')),
    );
    assert.deepEqual(
      observedCalls[1].body,
      await readFile(
        join(outputRoot, 'maximum-response-token-count-request.json'),
      ),
    );
    const manifest = JSON.parse(
      await readFile(join(outputRoot, 'b5-manifest.json'), 'utf8'),
    );
    assert.equal(manifest.status, 'passed');
    assert.equal(manifest.checks.length, 10);
    assert.equal(manifest.checks.every((check) => check.status === 'passed'), true);
    assert.equal(manifest.artifacts.length, 5);
    assert.equal(manifest.manifestSelfHashPolicy, 'manifest-is-not-self-hashed-v001');
    assert.equal(manifest.transport.countTokensCalls, 2);
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
