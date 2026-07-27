#!/usr/bin/env node

import assert from 'node:assert/strict';
import {
  mkdtemp,
  readFile,
  readdir,
  rm,
} from 'node:fs/promises';
import {dirname, relative, resolve} from 'node:path';
import test from 'node:test';
import {fileURLToPath} from 'node:url';

import {
  PRESENTATION_CAPTION_GATE_B6_FORMAL_CONFIG_V001,
  continuePresentationCaptionGateB6ThroughB1B4V001,
  executePresentationCaptionGateB6V001,
} from './run_presentation_caption_gate_b6_v001.mjs';
import {
  serializePresentationCaptionB1FormalJsonV001,
  sha256PresentationCaptionB1BytesV001,
} from './presentation_caption_semantic_source_package_v001.mjs';

const WORKSPACE_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const TEST_TEMP_ROOT = resolve(
  WORKSPACE_ROOT,
  'evals/clip_composition/testdata',
);
const API_KEY = 'synthetic-b6-key-never-persist';

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

const repositoryPath = (absolutePath) =>
  relative(WORKSPACE_ROOT, absolutePath).split('/').join('/');

const makeFixture = async () => {
  const root = await mkdtemp(resolve(TEST_TEMP_ROOT, 'presentation-b6-v001-'));
  const outputRoot = resolve(root, 'output');
  const config = {
    ...PRESENTATION_CAPTION_GATE_B6_FORMAL_CONFIG_V001,
    outputRoot: repositoryPath(outputRoot),
    rawResponsePath: repositoryPath(resolve(outputRoot, 'generate-content-response.raw.json')),
    semanticRawPath: repositoryPath(resolve(root, 'semantic-output.raw.json')),
    b1JobPath: repositoryPath(resolve(root, 'b1-job.json')),
    b1ReportPath: repositoryPath(resolve(outputRoot, 'b1-report.json')),
    b4JobPath: repositoryPath(resolve(root, 'b4-job.json')),
    b4OutputRoot: repositoryPath(resolve(root, 'b4-output')),
    b4RunnerOutputPath: repositoryPath(resolve(outputRoot, 'b4-runner.raw.json')),
    b4DisplayPlanPath: repositoryPath(resolve(root, 'b4-output/display-plan.json')),
  };
  return {
    root,
    outputRoot,
    config,
    cleanup: () => rm(root, {recursive: true, force: true}),
  };
};

const makeFormalIntegrationFixture = async () => {
  const presentationRoot = resolve(
    WORKSPACE_ROOT,
    'evals/clip_composition/outputs/presentation',
  );
  const root = await mkdtemp(resolve(presentationRoot, 'caption-gate-b6-integration-'));
  const suffix = root.slice(root.lastIndexOf('/') + 1);
  const outputRoot = resolve(root, 'run');
  const b4PairId = `synthetic-${suffix}`;
  const b4OutputRoot = resolve(
    presentationRoot,
    'caption-display-pairs',
    b4PairId,
  );
  const b1JobPath = resolve(
    presentationRoot,
    'caption-semantic-output-check-jobs',
    `${suffix}.json`,
  );
  const b4JobPath = resolve(
    presentationRoot,
    'caption-display-pair-generation-jobs',
    `${suffix}.json`,
  );
  const semanticRawPath = resolve(
    presentationRoot,
    'caption-semantic-raw-outputs',
    `${suffix}.json`,
  );
  const config = {
    ...PRESENTATION_CAPTION_GATE_B6_FORMAL_CONFIG_V001,
    outputRoot: repositoryPath(outputRoot),
    rawResponsePath: repositoryPath(resolve(
      outputRoot,
      'generate-content-response.raw.json',
    )),
    semanticRawPath: repositoryPath(semanticRawPath),
    b1JobPath: repositoryPath(b1JobPath),
    b1ReportPath: repositoryPath(resolve(outputRoot, 'b1-report.json')),
    b4JobPath: repositoryPath(b4JobPath),
    b4PairId,
    b4OutputRoot: repositoryPath(b4OutputRoot),
    b4RunnerOutputPath: repositoryPath(resolve(outputRoot, 'b4-runner.raw.json')),
    b4DisplayPlanPath: repositoryPath(resolve(b4OutputRoot, 'display-plan.json')),
  };
  return {
    root,
    outputRoot,
    config,
    cleanup: async () => {
      await rm(root, {recursive: true, force: true});
      await rm(b1JobPath, {force: true});
      await rm(b4JobPath, {force: true});
      await rm(semanticRawPath, {force: true});
      await rm(b4OutputRoot, {recursive: true, force: true});
      await rm(`${b4OutputRoot}.lock`, {recursive: true, force: true});
      await rm(`${b4OutputRoot}.work`, {recursive: true, force: true});
    },
  };
};

const zeroFrameBoundaryIds = [
  'segmenter-boundary-000073',
  'segmenter-boundary-000074',
  'segmenter-boundary-000075',
];

const makeValidActualPackageSemanticAnswer = async () => {
  const source = JSON.parse(await readFile(resolve(
    WORKSPACE_ROOT,
    PRESENTATION_CAPTION_GATE_B6_FORMAL_CONFIG_V001.sourcePackageRoot,
    'semantic-source-input.json',
  ), 'utf8'));
  return {
    status: 'complete',
    containers: source.containers.map((container) => {
      const meaningGroups = [];
      for (let index = 0; index < container.boundaryCandidates.length; index += 1) {
        const candidate = container.boundaryCandidates[index];
        if (candidate.boundaryCandidateId === zeroFrameBoundaryIds[0]) {
          assert.deepEqual(
            container.boundaryCandidates
              .slice(index, index + zeroFrameBoundaryIds.length)
              .map((entry) => entry.boundaryCandidateId),
            zeroFrameBoundaryIds,
          );
          meaningGroups.push({
            lineEndBoundaryCandidateIds: [zeroFrameBoundaryIds.at(-1)],
          });
          index += zeroFrameBoundaryIds.length - 1;
        } else {
          meaningGroups.push({
            lineEndBoundaryCandidateIds: [candidate.boundaryCandidateId],
          });
        }
      }
      return {containerId: container.containerId, meaningGroups};
    }),
  };
};

const responseEnvelope = ({
  semanticText = '{"status":"complete","containers":[]}\n',
  modelVersion = 'gemini-3.6-flash',
  promptTokenCount = 100,
  candidatesTokenCount = 20,
  thoughtsTokenCount = 5,
  totalTokenCount = 125,
} = {}) => ({
  candidates: [
    {
      content: {
        parts: [{text: semanticText}],
        role: 'model',
      },
      finishReason: 'STOP',
    },
  ],
  usageMetadata: {
    promptTokenCount,
    candidatesTokenCount,
    thoughtsTokenCount,
    totalTokenCount,
  },
  modelVersion,
});

const response = (value, {status = 200} = {}) => {
  const bytes = Buffer.isBuffer(value) ? value : formalBytes(value);
  return {
    bytes,
    response: new Response(bytes, {
      status,
      headers: {'content-type': 'application/json; charset=UTF-8'},
    }),
  };
};

const acceptedContinuation = async () => ({
  status: 'display-plan-ready',
  b1: {
    exitCode: 0,
    status: 'passed',
    validationReportBinding: {
      path: 'synthetic/b1-report.json',
      fileSha256: '1'.repeat(64),
    },
  },
  b4: {
    pairOutputRoot: 'synthetic/b4-output',
    displayPlanBinding: {
      path: 'synthetic/b4-output/display-plan.json',
      fileSha256: '2'.repeat(64),
      canonicalSha256: '3'.repeat(64),
    },
    reviewState: 'pending_human_review',
  },
});

const allFileBytes = async (root) => {
  const values = [];
  const visit = async (directory) => {
    const entries = await readdir(directory, {withFileTypes: true});
    for (const entry of entries) {
      const path = resolve(directory, entry.name);
      if (entry.isDirectory()) await visit(path);
      else if (entry.isFile()) values.push(await readFile(path));
    }
  };
  await visit(root);
  return values;
};

test('固定requestをbyte同一で一回だけ送り、raw保存後にB1→B4へ渡す', async () => {
  const fixture = await makeFixture();
  try {
    const fixedRequest = await readFile(resolve(
      WORKSPACE_ROOT,
      PRESENTATION_CAPTION_GATE_B6_FORMAL_CONFIG_V001.requestPath,
    ));
    assert.equal(
      sha256(fixedRequest),
      '7fa902580b78bb5da3d36025135e4655ab2528e401ba5a76537f2af3c1939ed2',
    );
    assert.equal(
      PRESENTATION_CAPTION_GATE_B6_FORMAL_CONFIG_V001.attemptId,
      'DmWu0jVQfTE-candidate-13-caption-b6-v002',
    );
    assert.equal(
      PRESENTATION_CAPTION_GATE_B6_FORMAL_CONFIG_V001.outputRoot,
      'evals/clip_composition/outputs/presentation/caption-gate-b6/'
        + 'DmWu0jVQfTE-candidate-13-v002',
    );
    const semanticText = ' \n{"status":"complete","containers":[]}\n ';
    const generated = response(responseEnvelope({semanticText}));
    let calls = 0;
    let timeoutMilliseconds = null;
    const signal = {synthetic: true};
    const order = [];
    const result = await executePresentationCaptionGateB6V001({
      config: fixture.config,
      apiKey: API_KEY,
      currentDate: new Date('2026-07-27T12:34:56.000Z'),
      timeoutSignalFactory: (milliseconds) => {
        timeoutMilliseconds = milliseconds;
        return signal;
      },
      fetchImplementation: async (url, options) => {
        calls += 1;
        order.push('generateContent');
        assert.equal(url, fixture.config.endpoint);
        assert.equal(options.method, 'POST');
        assert.equal(options.headers['X-Server-Timeout'], '600');
        assert.equal(options.headers['x-goog-api-key'], API_KEY);
        assert.equal(options.signal, signal);
        assert.deepEqual(Buffer.from(options.body), fixedRequest);
        return generated.response;
      },
      continuePipeline: async ({semanticBytes}) => {
        order.push('B1');
        assert.deepEqual(
          await readFile(resolve(WORKSPACE_ROOT, fixture.config.rawResponsePath)),
          generated.bytes,
        );
        assert.deepEqual(semanticBytes, Buffer.from(semanticText, 'utf8'));
        assert.deepEqual(
          await readFile(resolve(WORKSPACE_ROOT, fixture.config.semanticRawPath)),
          Buffer.from(semanticText, 'utf8'),
        );
        order.push('B4');
        return acceptedContinuation();
      },
    });

    assert.equal(result.status, 'display-plan-ready', JSON.stringify(result));
    assert.equal(result.generateContentCalls, 1);
    assert.equal(result.automaticRetries, 0);
    assert.equal(calls, 1);
    assert.equal(timeoutMilliseconds, 600_000);
    assert.deepEqual(order, ['generateContent', 'B1', 'B4']);
    assert.equal(result.responseModelVersion, 'gemini-3.6-flash');
    assert.equal(result.usageBasedCostUsd, '0.00033750');

    const manifest = JSON.parse(await readFile(
      resolve(fixture.outputRoot, 'b6-manifest.json'),
      'utf8',
    ));
    assert.equal(manifest.status, 'passed_pending_human_review');
    assert.equal(
      manifest.attemptId,
      'DmWu0jVQfTE-candidate-13-caption-b6-v002',
    );
    assert.equal(manifest.transport.generateContentCalls, 1);
    assert.equal(manifest.transport.automaticRetries, 0);
    assert.equal(manifest.response.responseModelVersion, 'gemini-3.6-flash');
    assert.deepEqual(manifest.response.usageMetadata, {
      promptTokenCount: 100,
      candidatesTokenCount: 20,
      thoughtsTokenCount: 5,
      totalTokenCount: 125,
    });
    assert.equal(manifest.cost.inputUsageBasedCostUsd, '0.00015000');
    assert.equal(manifest.cost.outputUsageBasedCostUsd, '0.00018750');
    assert.equal(manifest.cost.totalUsageBasedCostUsd, '0.00033750');
    assert.equal(manifest.cost.actualBilledAmountUsd, null);
    assert.equal(
      manifest.cost.actualBillingObservation,
      'not-observable-from-generateContent-response',
    );
    assert.equal(manifest.transport.headers['x-goog-api-key'], '<redacted>');
    assert.equal(
      (await allFileBytes(fixture.root)).some(
        (bytes) => bytes.includes(Buffer.from(API_KEY, 'utf8')),
      ),
      false,
    );
  } finally {
    await fixture.cleanup();
  }
});

test('HTTP bodyが無効でもraw byteを解析前に保存し再試行しない', async () => {
  const fixture = await makeFixture();
  try {
    const raw = Buffer.from('not-json\n', 'utf8');
    let calls = 0;
    let continuationCalls = 0;
    const result = await executePresentationCaptionGateB6V001({
      config: fixture.config,
      apiKey: API_KEY,
      fetchImplementation: async () => {
        calls += 1;
        return new Response(raw, {
          status: 200,
          headers: {'content-type': 'application/json'},
        });
      },
      timeoutSignalFactory: () => ({synthetic: true}),
      continuePipeline: async () => {
        continuationCalls += 1;
        return acceptedContinuation();
      },
    });
    assert.equal(result.status, 'stopped');
    assert.equal(result.reason, 'HTTP_RESPONSE_JSON_INVALID');
    assert.equal(result.generateContentCalls, 1);
    assert.equal(result.automaticRetries, 0);
    assert.equal(calls, 1);
    assert.equal(continuationCalls, 0);
    assert.deepEqual(
      await readFile(resolve(WORKSPACE_ROOT, fixture.config.rawResponsePath)),
      raw,
    );
  } finally {
    await fixture.cleanup();
  }
});

test('候補本文が不受理でもresponse model・usage・費用をmanifestへ残す', async () => {
  const fixture = await makeFixture();
  try {
    const envelope = responseEnvelope();
    envelope.candidates = [{
      finishReason: 'SAFETY',
      content: {role: 'model', parts: []},
    }];
    const generated = response(envelope);
    const result = await executePresentationCaptionGateB6V001({
      config: fixture.config,
      apiKey: API_KEY,
      fetchImplementation: async () => generated.response,
      timeoutSignalFactory: () => ({synthetic: true}),
      continuePipeline: acceptedContinuation,
    });
    assert.equal(result.status, 'stopped');
    assert.equal(result.reason, 'HTTP_RESPONSE_CANDIDATE_TEXT_INVALID');
    assert.equal(result.generateContentCalls, 1);
    const manifest = JSON.parse(await readFile(
      resolve(fixture.outputRoot, 'b6-manifest.json'),
      'utf8',
    ));
    assert.equal(manifest.response.responseModelVersion, 'gemini-3.6-flash');
    assert.equal(manifest.response.usageMetadata.promptTokenCount, 100);
    assert.equal(manifest.cost.inputTokens, 100);
    assert.equal(manifest.cost.outputTokensIncludingThinking, 25);
    assert.equal(manifest.cost.totalUsageBasedCostUsd, '0.00033750');
    assert.deepEqual(
      await readFile(resolve(WORKSPACE_ROOT, fixture.config.rawResponsePath)),
      generated.bytes,
    );
    await assert.rejects(
      readFile(resolve(WORKSPACE_ROOT, fixture.config.semanticRawPath)),
      {code: 'ENOENT'},
    );
  } finally {
    await fixture.cleanup();
  }
});

test('最初の通信失敗は一回で停止し二回目を作らない', async () => {
  const fixture = await makeFixture();
  try {
    let calls = 0;
    const result = await executePresentationCaptionGateB6V001({
      config: fixture.config,
      apiKey: API_KEY,
      fetchImplementation: async () => {
        calls += 1;
        throw new TypeError('synthetic transport failure');
      },
      timeoutSignalFactory: () => ({synthetic: true}),
      continuePipeline: acceptedContinuation,
    });
    assert.equal(result.status, 'stopped');
    assert.equal(result.reason, 'GENERATE_CONTENT_REQUEST_FAILED');
    assert.equal(result.generateContentCalls, 1);
    assert.equal(calls, 1);
    await assert.rejects(
      readFile(resolve(WORKSPACE_ROOT, fixture.config.rawResponsePath)),
      {code: 'ENOENT'},
    );
  } finally {
    await fixture.cleanup();
  }
});

test('生応答にsecretが反射した場合は正式byteへ保存しない', async () => {
  const fixture = await makeFixture();
  try {
    const reflected = Buffer.from(`{"echo":"${API_KEY}"}\n`, 'utf8');
    const result = await executePresentationCaptionGateB6V001({
      config: fixture.config,
      apiKey: API_KEY,
      fetchImplementation: async () => new Response(reflected, {
        status: 200,
        headers: {'content-type': 'application/json'},
      }),
      timeoutSignalFactory: () => ({synthetic: true}),
      continuePipeline: acceptedContinuation,
    });
    assert.equal(result.status, 'stopped');
    assert.equal(result.reason, 'SECRET_PRESENT_IN_FORMAL_BYTES');
    await assert.rejects(
      readFile(resolve(WORKSPACE_ROOT, fixture.config.rawResponsePath)),
      {code: 'ENOENT'},
    );
    assert.equal(
      (await allFileBytes(fixture.root)).some(
        (bytes) => bytes.includes(Buffer.from(API_KEY, 'utf8')),
      ),
      false,
    );
  } finally {
    await fixture.cleanup();
  }
});

test('fenceや前後空白を除去せずB1の不受理を正常結果として止める', async () => {
  const fixture = await makeFixture();
  try {
    const semanticText = '```json\n{"status":"abstained"}\n```\n';
    let observedSemantic = null;
    const result = await executePresentationCaptionGateB6V001({
      config: fixture.config,
      apiKey: API_KEY,
      fetchImplementation: async () =>
        response(responseEnvelope({semanticText})).response,
      timeoutSignalFactory: () => ({synthetic: true}),
      continuePipeline: async ({semanticBytes}) => {
        observedSemantic = semanticBytes;
        return {
          status: 'rejected',
          reason: 'B1_SEMANTIC_OUTPUT_REJECTED',
          b1: {status: 'failed'},
        };
      },
    });
    assert.equal(result.status, 'rejected');
    assert.equal(result.reason, 'B1_SEMANTIC_OUTPUT_REJECTED');
    assert.deepEqual(observedSemantic, Buffer.from(semanticText, 'utf8'));
    assert.deepEqual(
      await readFile(resolve(WORKSPACE_ROOT, fixture.config.semanticRawPath)),
      Buffer.from(semanticText, 'utf8'),
    );
  } finally {
    await fixture.cleanup();
  }
});

test('abstainedはB4へ進めず正常なabstained結果として保存する', async () => {
  const fixture = await makeFixture();
  try {
    let b4Calls = 0;
    const result = await executePresentationCaptionGateB6V001({
      config: fixture.config,
      apiKey: API_KEY,
      fetchImplementation: async () =>
        response(responseEnvelope({semanticText: '{"status":"abstained"}\n'})).response,
      timeoutSignalFactory: () => ({synthetic: true}),
      continuePipeline: async () => ({
        status: 'abstained',
        reason: 'B1_ABSTAINED',
        b1: {status: 'abstained'},
        b4Calls: b4Calls += 0,
      }),
    });
    assert.equal(result.status, 'abstained');
    assert.equal(result.reason, 'B1_ABSTAINED');
    assert.equal(b4Calls, 0);
    const manifest = JSON.parse(await readFile(
      resolve(fixture.outputRoot, 'b6-manifest.json'),
      'utf8',
    ));
    assert.equal(manifest.status, 'abstained');
    assert.equal(manifest.b4, null);
  } finally {
    await fixture.cleanup();
  }
});

test('実packageと有効な合成回答を正式B1→B4経路へ通し表示計画まで作る', {
  timeout: 120_000,
}, async () => {
  const fixture = await makeFormalIntegrationFixture();
  try {
    const semanticText = formalBytes(await makeValidActualPackageSemanticAnswer())
      .toString('utf8');
    const generated = response(responseEnvelope({semanticText}));
    let calls = 0;
    const result = await executePresentationCaptionGateB6V001({
      config: fixture.config,
      apiKey: API_KEY,
      currentDate: new Date('2026-07-27T13:00:00.000Z'),
      fetchImplementation: async (_url, options) => {
        calls += 1;
        assert.deepEqual(
          Buffer.from(options.body),
          await readFile(resolve(
            WORKSPACE_ROOT,
            PRESENTATION_CAPTION_GATE_B6_FORMAL_CONFIG_V001.requestPath,
          )),
        );
        return generated.response;
      },
      timeoutSignalFactory: () => ({synthetic: true}),
      continuePipeline: continuePresentationCaptionGateB6ThroughB1B4V001,
    });
    assert.equal(calls, 1);
    assert.equal(result.status, 'display-plan-ready', JSON.stringify(result));
    assert.equal(result.generateContentCalls, 1);
    assert.equal(result.automaticRetries, 0);
    const displayPlan = JSON.parse(await readFile(resolve(
      WORKSPACE_ROOT,
      result.displayPlanBinding.path,
    ), 'utf8'));
    assert.equal(
      displayPlan.containers.flatMap((container) => container.cues).length,
      203,
    );
    const b1Job = JSON.parse(await readFile(resolve(
      WORKSPACE_ROOT,
      fixture.config.b1JobPath,
    ), 'utf8'));
    const b4Job = JSON.parse(await readFile(resolve(
      WORKSPACE_ROOT,
      fixture.config.b4JobPath,
    ), 'utf8'));
    assert.equal(
      b1Job.jobId,
      'DmWu0jVQfTE-candidate-13-caption-b6-v002',
    );
    assert.equal(
      b4Job.jobId,
      'DmWu0jVQfTE-candidate-13-caption-b6-v002',
    );
    const manifest = JSON.parse(await readFile(
      resolve(fixture.outputRoot, 'b6-manifest.json'),
      'utf8',
    ));
    assert.equal(manifest.b4.reviewState, 'pending_human_review');
  } finally {
    await fixture.cleanup();
  }
});

test('B1合格後にB4が停止してもB1の合格事実をmanifestへ残す', {
  timeout: 120_000,
}, async () => {
  const fixture = await makeFormalIntegrationFixture();
  try {
    const semanticText = formalBytes(await makeValidActualPackageSemanticAnswer())
      .toString('utf8');
    const generated = response(responseEnvelope({semanticText}));
    const config = {
      ...fixture.config,
      b4StaticTemplatePath:
        'evals/clip_composition/testdata/nonexistent-b4-static-template.json',
    };
    const result = await executePresentationCaptionGateB6V001({
      config,
      apiKey: API_KEY,
      currentDate: new Date('2026-07-27T13:05:00.000Z'),
      fetchImplementation: async () => generated.response,
      timeoutSignalFactory: () => ({synthetic: true}),
      continuePipeline: continuePresentationCaptionGateB6ThroughB1B4V001,
    });
    assert.equal(result.status, 'stopped');
    assert.equal(result.reason, 'B1_B4_ORCHESTRATION_INTERNAL_FAILURE');
    const manifest = JSON.parse(await readFile(
      resolve(fixture.outputRoot, 'b6-manifest.json'),
      'utf8',
    ));
    assert.equal(manifest.b1.status, 'passed');
    assert.equal(manifest.b1.exitCode, 0);
    assert.equal(manifest.b1.validationReportBinding.fileSha256.length, 64);
    assert.equal(manifest.b4, null);
  } finally {
    await fixture.cleanup();
  }
});
