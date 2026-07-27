#!/usr/bin/env node

import assert from 'node:assert/strict';
import {
  mkdtemp,
  readFile,
  readdir,
  rm,
  writeFile,
} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {dirname, join, resolve} from 'node:path';
import test from 'node:test';
import {fileURLToPath} from 'node:url';

import {
  executePresentationCaptionGateB5InitialV001,
} from './run_presentation_caption_gate_b5_initial_v001.mjs';
import {
  buildPresentationCaptionGateB5RequestsV004,
} from './run_presentation_caption_gate_b5_v004.mjs';
import {
  serializePresentationCaptionB1FormalJsonV001,
  sha256PresentationCaptionB1BytesV001,
} from './presentation_caption_semantic_source_package_v001.mjs';

const workspaceRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const requestBuilderPath = resolve(
  workspaceRoot,
  'evals/clip_composition/run_presentation_caption_gate_b5_v004.mjs',
);
const TEST_DATE = '2026-07-27';
const PROJECTION_SHA = '7'.repeat(64);
const API_KEY = 'test-only-b5-initial-secret-value';

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
      containerId: 'synthetic-container-alpha',
      text: '赤青',
      boundaryCandidates: [
        {
          boundaryCandidateId: 'synthetic-boundary-alpha-1',
          text: '赤',
          logicalWidth: 2,
        },
        {
          boundaryCandidateId: 'synthetic-boundary-alpha-2',
          text: '青',
          logicalWidth: 2,
        },
      ],
    },
    {
      containerId: 'synthetic-container-beta',
      text: '白',
      boundaryCandidates: [
        {
          boundaryCandidateId: 'synthetic-boundary-beta-1',
          text: '白',
          logicalWidth: 2,
        },
      ],
    },
  ],
};

const inspectProjection = async () => ({
  kind: 'trusted-projection',
  expectedBeforeCanonicalSha256: PROJECTION_SHA,
});

const prepareCase = async () => {
  const root = await mkdtemp(join(tmpdir(), 'zev-b5-initial-'));
  const sourcePath = join(root, 'semantic-source-input.json');
  const jobPath = join(root, 'b5-initial-job.json');
  const outputDirectory = join(root, 'formal-output');
  const sourceBytes = formalBytes(syntheticSource);
  const builderBytes = await readFile(requestBuilderPath);
  const job = {
    schemaVersion: 'presentation-caption-gate-b5-initial-job-v001',
    jobId: 'synthetic-b5-initial-attempt',
    sourceBinding: {
      path: sourcePath,
      fileSha256: sha256(sourceBytes),
      characterCount: 3,
      containerCount: 2,
      boundaryCandidateCount: 3,
    },
    requestBuilderBinding: {
      path: requestBuilderPath,
      fileSha256: sha256(builderBytes),
    },
    upstreamProjection: {
      sentinelPath: 'synthetic-projection-sentinel.json',
      expectedCanonicalSha256: PROJECTION_SHA,
    },
    outputDirectory,
    officialVerification: {
      observedAt: TEST_DATE,
      sources: [
        'https://ai.google.dev/gemini-api/docs/models/gemini-3.6-flash',
        'https://ai.google.dev/gemini-api/docs/pricing',
      ],
      modelId: 'gemini-3.6-flash',
      modelResource: 'models/gemini-3.6-flash',
      inputLimit: 1_048_576,
      outputLimit: 65_536,
      tier: 'PAID_STANDARD_DEFAULT_BY_OMISSION',
      inputPriceUsdPerMillion: '1.50',
      outputPriceUsdPerMillion: '7.50',
    },
  };
  await Promise.all([
    writeFile(sourcePath, sourceBytes),
    writeFile(jobPath, formalBytes(job)),
  ]);
  return {
    root,
    sourcePath,
    sourceBytes,
    jobPath,
    outputDirectory,
    job,
  };
};

const execute = (prepared, overrides = {}) =>
  executePresentationCaptionGateB5InitialV001({
    jobPath: prepared.jobPath,
    inspectUpstreamProjection: inspectProjection,
    currentDate: new Date('2026-07-27T03:00:00Z'),
    apiKey: API_KEY,
    ...overrides,
  });

test('初回計測はv004の3 requestをbyte同一で使い、2回だけcountTokensする', async () => {
  const prepared = await prepareCase();
  try {
    const built = buildPresentationCaptionGateB5RequestsV004({
      sourceBytes: prepared.sourceBytes,
      config: {
        expectedSourceSha256: sha256(prepared.sourceBytes),
        expectedCharacterCount: 3,
        expectedContainerCount: 2,
        expectedBoundaryCandidateCount: 3,
        modelId: 'gemini-3.6-flash',
        officialOutputLimit: 65_536,
      },
    });
    const responses = [
      Buffer.from(
        '{"totalTokens":123,"promptTokensDetails":[{"modality":"TEXT","tokenCount":123}]}\n',
        'utf8',
      ),
      Buffer.from(
        '{"totalTokens":45,"promptTokensDetails":[{"modality":"TEXT","tokenCount":45}]}\n',
        'utf8',
      ),
    ];
    const calls = [];
    const result = await execute(prepared, {
      fetchImplementation: async (url, options) => {
        const callIndex = calls.length;
        assert.ok(callIndex < 2);
        assert.equal(url.endsWith(':countTokens'), true);
        assert.equal(options.method, 'POST');
        assert.equal(options.headers['X-Server-Timeout'], '600');
        assert.equal(options.headers['x-goog-api-key'], API_KEY);
        assert.equal(options.redirect, 'error');
        if (callIndex === 0) {
          assert.deepEqual(Buffer.from(options.body), built.inputCountBytes);
        } else {
          assert.deepEqual(Buffer.from(options.body), built.maximumCountBytes);
          assert.deepEqual(
            await readFile(join(
              prepared.outputDirectory,
              'input-token-count-response.raw.json',
            )),
            responses[0],
          );
        }
        calls.push({url, body: Buffer.from(options.body)});
        return new Response(responses[callIndex], {
          status: 200,
          headers: {'content-type': 'application/json'},
        });
      },
    });

    assert.equal(result.status, 'passed');
    assert.equal(result.formalFileCount, 6);
    assert.equal(result.inputTokens, 123);
    assert.equal(result.maximumResponseStructureTokens, 45);
    assert.equal(result.countTokensCalls, 2);
    assert.equal(result.generateContentCalls, 0);
    assert.equal(result.b6Started, false);
    assert.equal(calls.length, 2);

    const names = (await readdir(prepared.outputDirectory)).sort();
    assert.deepEqual(names, [
      'b5-initial-manifest.json',
      'generate-content-request.json',
      'input-token-count-request.json',
      'input-token-count-response.raw.json',
      'maximum-response-token-count-request.json',
      'maximum-response-token-count-response.raw.json',
    ]);
    assert.deepEqual(
      await readFile(join(
        prepared.outputDirectory,
        'generate-content-request.json',
      )),
      built.generateBytes,
    );
    assert.deepEqual(
      await readFile(join(
        prepared.outputDirectory,
        'input-token-count-request.json',
      )),
      built.inputCountBytes,
    );
    assert.deepEqual(
      await readFile(join(
        prepared.outputDirectory,
        'maximum-response-token-count-request.json',
      )),
      built.maximumCountBytes,
    );
    assert.deepEqual(
      await readFile(join(
        prepared.outputDirectory,
        'maximum-response-token-count-response.raw.json',
      )),
      responses[1],
    );

    const manifest = JSON.parse(
      await readFile(
        join(prepared.outputDirectory, 'b5-initial-manifest.json'),
        'utf8',
      ),
    );
    assert.equal(
      manifest.schemaVersion,
      'presentation-caption-gate-b5-initial-manifest-v001',
    );
    assert.equal(manifest.status, 'passed');
    assert.equal(manifest.stage, 'b5-initial-token-diagnosis-only');
    assert.equal(manifest.sourceBinding.characterCount, 3);
    assert.equal(manifest.sourceBinding.containerCount, 2);
    assert.equal(manifest.sourceBinding.boundaryCandidateCount, 3);
    assert.equal(
      manifest.requestBindings.generateContent.fileSha256,
      sha256(built.generateBytes),
    );
    assert.equal(
      manifest.requestBindings.inputTokenCount.fileSha256,
      sha256(built.inputCountBytes),
    );
    assert.equal(
      manifest.requestBindings.maximumResponseTokenCount.fileSha256,
      sha256(built.maximumCountBytes),
    );
    assert.equal(manifest.transport.countTokensCalls, 2);
    assert.equal(manifest.transport.generateContentCalls, 0);
    assert.equal(manifest.transport.automaticRetries, 0);
    assert.equal(
      manifest.transport.headers['x-goog-api-key'],
      '<redacted>',
    );
    assert.equal(manifest.tokenDiagnosis.inputTokens, 123);
    assert.equal(manifest.tokenDiagnosis.maximumResponseStructureTokens, 45);
    assert.equal(
      manifest.tokenDiagnosis.inputMeasurement.status,
      'measured-in-this-attempt',
    );
    assert.equal(
      manifest.tokenDiagnosis.maximumResponseStructureMeasurement
        .countTokensCallsInThisAttempt,
      1,
    );
    assert.equal(
      manifest.cost.inputMeasurement.officialUnitPriceUsdPerMillion,
      '1.50',
    );
    assert.equal(
      manifest.cost.inputMeasurement.formula,
      '123 * 1.50 / 1000000',
    );
    assert.equal(
      manifest.cost.maximumResponseStructureMeasurement.formula,
      '45 * 1.50 / 1000000',
    );
    assert.equal(
      manifest.cost.actualCharge,
      'not-observable-from-countTokens-responses',
    );
    assert.equal(Object.hasOwn(manifest.cost.inputMeasurement, 'usd'), false);
    assert.equal(manifest.checks.length, 10);
    assert.equal(
      manifest.checks.every((check) => check.status === 'passed'),
      true,
    );
    assert.equal(manifest.nextStage.b6AutomaticallyStarted, false);

    const savedText = (
      await Promise.all(names.map((name) =>
        readFile(join(prepared.outputDirectory, name), 'utf8')))
    ).join('\n');
    assert.equal(savedText.includes(API_KEY), false);
    assert.equal(savedText.includes('"serviceTier"'), false);
    const generateRequest = JSON.parse(
      await readFile(
        join(prepared.outputDirectory, 'generate-content-request.json'),
        'utf8',
      ),
    );
    assert.equal(
      generateRequest.generationConfig.thinkingConfig.thinkingLevel,
      'medium',
    );
    assert.equal(
      generateRequest.generationConfig.responseJsonSchema.oneOf[1]
        .properties.containers.items.properties.meaningGroups.items.properties
        .lineEndBoundaryCandidateIds.maxItems,
      2,
    );
  } finally {
    await rm(prepared.root, {recursive: true, force: true});
  }
});

test('API keyが無ければ出力と通信の前で停止する', async () => {
  const prepared = await prepareCase();
  try {
    let calls = 0;
    const result = await execute(prepared, {
      apiKey: undefined,
      fetchImplementation: async () => {
        calls += 1;
        throw new Error('must not communicate');
      },
    });
    assert.equal(result.status, 'stopped');
    assert.equal(result.reason, 'GEMINI_API_KEY_UNAVAILABLE');
    assert.equal(calls, 0);
    await assert.rejects(readFile(prepared.outputDirectory), {code: 'ENOENT'});
  } finally {
    await rm(prepared.root, {recursive: true, force: true});
  }
});

test('v004以外のrequest builder pathは通信前に拒否する', async () => {
  const prepared = await prepareCase();
  try {
    prepared.job.requestBuilderBinding.path = prepared.sourcePath;
    prepared.job.requestBuilderBinding.fileSha256 = sha256(prepared.sourceBytes);
    await writeFile(prepared.jobPath, formalBytes(prepared.job));
    let calls = 0;
    const result = await execute(prepared, {
      fetchImplementation: async () => {
        calls += 1;
        throw new Error('must not communicate');
      },
    });
    assert.equal(result.status, 'stopped');
    assert.equal(result.reason, 'REQUEST_BUILDER_PATH_IS_NOT_V004_CANONICAL');
    assert.equal(calls, 0);
  } finally {
    await rm(prepared.root, {recursive: true, force: true});
  }
});

test('上流projection不一致は通信前に拒否する', async () => {
  const prepared = await prepareCase();
  try {
    let calls = 0;
    const result = await execute(prepared, {
      inspectUpstreamProjection: async () => ({
        kind: 'trusted-projection',
        expectedBeforeCanonicalSha256: '8'.repeat(64),
      }),
      fetchImplementation: async () => {
        calls += 1;
        throw new Error('must not communicate');
      },
    });
    assert.equal(result.status, 'stopped');
    assert.equal(result.reason, 'UPSTREAM_READ_ONLY_PROJECTION_MISMATCH');
    assert.equal(calls, 0);
  } finally {
    await rm(prepared.root, {recursive: true, force: true});
  }
});

test('1回目の通信失敗を再試行せず2回目へ進まない', async () => {
  const prepared = await prepareCase();
  try {
    let calls = 0;
    const result = await execute(prepared, {
      fetchImplementation: async () => {
        calls += 1;
        throw new Error('simulated timeout');
      },
    });
    assert.equal(result.status, 'stopped');
    assert.equal(result.reason, 'INPUT_COUNT_TOKENS_REQUEST_FAILED');
    assert.equal(calls, 1);
    assert.equal(result.b6Started, false);
  } finally {
    await rm(prepared.root, {recursive: true, force: true});
  }
});

test('2回目の無効応答はraw保存後に停止しmanifestを作らない', async () => {
  const prepared = await prepareCase();
  try {
    const rawResponses = [
      Buffer.from('{"totalTokens":12}\n', 'utf8'),
      Buffer.from('{"totalTokens":"invalid"}\n', 'utf8'),
    ];
    let calls = 0;
    const result = await execute(prepared, {
      fetchImplementation: async () => {
        const response = rawResponses[calls];
        calls += 1;
        return new Response(response, {
          status: 200,
          headers: {'content-type': 'application/json'},
        });
      },
    });
    assert.equal(result.status, 'stopped');
    assert.equal(result.reason, 'MAXIMUM_RESPONSE_COUNT_TOKENS_TOTAL_TOKENS_INVALID');
    assert.equal(calls, 2);
    assert.deepEqual(
      await readFile(join(
        prepared.outputDirectory,
        'maximum-response-token-count-response.raw.json',
      )),
      rawResponses[1],
    );
    await assert.rejects(
      readFile(join(prepared.outputDirectory, 'b5-initial-manifest.json')),
      {code: 'ENOENT'},
    );
  } finally {
    await rm(prepared.root, {recursive: true, force: true});
  }
});

test('応答に反射されたsecretはraw保存前に拒否する', async () => {
  const prepared = await prepareCase();
  try {
    let calls = 0;
    const result = await execute(prepared, {
      fetchImplementation: async () => {
        calls += 1;
        return new Response(
          Buffer.from(
            `{"totalTokens":12,"reflected":"${API_KEY}"}\n`,
            'utf8',
          ),
          {
            status: 200,
            headers: {'content-type': 'application/json'},
          },
        );
      },
    });
    assert.equal(result.status, 'stopped');
    assert.equal(result.reason, 'SECRET_PRESENT_IN_SAVED_BYTES');
    assert.equal(calls, 1);
    await assert.rejects(
      readFile(join(
        prepared.outputDirectory,
        'input-token-count-response.raw.json',
      )),
      {code: 'ENOENT'},
    );
  } finally {
    await rm(prepared.root, {recursive: true, force: true});
  }
});

test('旧B5 manifest schemaを初回jobとして受け付けない', async () => {
  const prepared = await prepareCase();
  try {
    prepared.job.schemaVersion = 'presentation-caption-gate-b5-manifest-v002';
    await writeFile(prepared.jobPath, formalBytes(prepared.job));
    let calls = 0;
    const result = await execute(prepared, {
      fetchImplementation: async () => {
        calls += 1;
        throw new Error('must not communicate');
      },
    });
    assert.equal(result.status, 'stopped');
    assert.equal(result.reason, 'JOB_SCHEMA_OR_APPROVED_VALUES_INVALID');
    assert.equal(calls, 0);
  } finally {
    await rm(prepared.root, {recursive: true, force: true});
  }
});
