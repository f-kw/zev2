#!/usr/bin/env node

import assert from 'node:assert/strict';
import {
  mkdir,
  mkdtemp,
  readFile,
  rm,
  writeFile,
} from 'node:fs/promises';
import {dirname, relative, resolve} from 'node:path';
import test from 'node:test';
import {fileURLToPath} from 'node:url';

import {
  runPresentationCaptionGateB6JobV001,
} from './run_presentation_caption_gate_b6_job_v001.mjs';
import {
  canonicalizePresentationCaptionB1JsonV001,
  serializePresentationCaptionB1FormalJsonV001,
  sha256PresentationCaptionB1BytesV001,
} from './presentation_caption_semantic_source_package_v001.mjs';

const WORKSPACE_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const TEST_TEMP_ROOT = resolve(WORKSPACE_ROOT, 'evals/clip_composition/testdata');
const PRESENTATION_ROOT = resolve(
  WORKSPACE_ROOT,
  'evals/clip_composition/outputs/presentation',
);
const JOB_ROOT = resolve(PRESENTATION_ROOT, 'caption-gate-b6-jobs');
const API_KEY = 'synthetic-b6-job-key-never-persist';
const CORE_PATH =
  'evals/clip_composition/run_presentation_caption_gate_b6_v001.mjs';
const RUNNER_PATH =
  'evals/clip_composition/run_presentation_caption_gate_b6_job_v001.mjs';

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

const canonicalSha256 = (value) => {
  const result = canonicalizePresentationCaptionB1JsonV001(value);
  assert.equal(result.status, 'canonicalized');
  return sha256(result.bytes);
};

const repositoryPath = (absolutePath) =>
  relative(WORKSPACE_ROOT, absolutePath).split('/').join('/');

const writeFormal = async (path, value) => {
  const bytes = formalBytes(value);
  await mkdir(dirname(path), {recursive: true});
  await writeFile(path, bytes);
  return {path: repositoryPath(path), bytes, fileSha256: sha256(bytes)};
};

const responseEnvelope = ({
  semanticText = '{"status":"complete","containers":[]}\n',
} = {}) => ({
  candidates: [{
    content: {parts: [{text: semanticText}], role: 'model'},
    finishReason: 'STOP',
  }],
  usageMetadata: {
    promptTokenCount: 10,
    candidatesTokenCount: 4,
    thoughtsTokenCount: 2,
    totalTokenCount: 16,
  },
  modelVersion: 'gemini-synthetic-flash',
});

const syntheticResponse = (value, {status = 200} = {}) => {
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

const makeFixture = async () => {
  const inputRoot = await mkdtemp(resolve(TEST_TEMP_ROOT, 'presentation-b6-job-v001-'));
  const suffix = inputRoot.slice(inputRoot.lastIndexOf('/') + 1);
  const formalId = `synthetic-${suffix}`;
  const runDirectoryId = `${formalId}-run`;
  const sourcePackageRoot = resolve(inputRoot, 'source-package');
  const request = await writeFormal(resolve(inputRoot, 'request.json'), {
    contents: [{role: 'user', parts: [{text: 'synthetic input'}]}],
  });
  const semanticSource = await writeFormal(
    resolve(sourcePackageRoot, 'semantic-source-input.json'),
    {
      schemaVersion: 'synthetic-semantic-source-v001',
      taskDescription: 'synthetic',
      containers: [{containerId: 'container-a', boundaryCandidates: [{}]}],
      atoms: [{atomId: 'atom-a', text: 'a'}],
    },
  );
  const packageManifestValue = {
    schemaVersion: 'presentation-caption-semantic-source-package-manifest-v001',
    artifactId: formalId,
    formalOutputPath: repositoryPath(sourcePackageRoot),
    contentArtifacts: [{
      role: 'semanticSourceInput',
      fileName: 'semantic-source-input.json',
      fileSha256: semanticSource.fileSha256,
    }],
  };
  const packageManifest = await writeFormal(
    resolve(sourcePackageRoot, 'package-manifest.json'),
    packageManifestValue,
  );
  const packageReportValue = {
    schemaVersion: 'presentation-caption-semantic-source-package-validation-report-v001',
    status: 'passed',
    package: {
      artifactId: formalId,
      formalOutputPath: repositoryPath(sourcePackageRoot),
    },
    observedProjection: {
      sourceAtomCount: 1,
      containerCount: 1,
      boundaryCandidateCount: 1,
    },
  };
  const packageReport = await writeFormal(
    resolve(sourcePackageRoot, 'package-validation-report.json'),
    packageReportValue,
  );
  const b4TemplateValue = {
    schemaVersion: 'presentation-caption-display-pair-static-preflight-job-v001',
    artifactId: formalId,
    sourcePackageBinding: {
      rootPath: repositoryPath(sourcePackageRoot),
      manifest: {
        path: packageManifest.path,
        fileSha256: packageManifest.fileSha256,
        canonicalSha256: canonicalSha256(packageManifestValue),
      },
      validationReport: {
        path: packageReport.path,
        fileSha256: packageReport.fileSha256,
        canonicalSha256: canonicalSha256(packageReportValue),
      },
    },
  };
  let b4Template = await writeFormal(
    resolve(inputRoot, 'b4-template.json'),
    b4TemplateValue,
  );
  const tokenResponseA = await writeFormal(resolve(inputRoot, 'token-a.json'), {
    totalTokens: 8,
  });
  const tokenResponseB = await writeFormal(resolve(inputRoot, 'token-b.json'), {
    totalTokens: 5,
  });
  const inputTokenRequest = await writeFormal(
    resolve(inputRoot, 'input-token-request.json'),
    {contents: []},
  );
  const maximumTokenRequest = await writeFormal(
    resolve(inputRoot, 'maximum-token-request.json'),
    {contents: []},
  );
  let b5ManifestValue = {
    schemaVersion: 'presentation-caption-gate-b5-initial-manifest-v001',
    status: 'passed',
    stage: 'b5-initial-token-diagnosis-only',
    jobBinding: {
      path: repositoryPath(resolve(inputRoot, 'b5-job.json')),
      fileSha256: 'a'.repeat(64),
      jobId: `${formalId}-b5`,
    },
    requestBuilderBinding: {
      path: request.path,
      fileSha256: request.fileSha256,
    },
    upstreamProjection: {
      sentinelPath: repositoryPath(resolve(inputRoot, 'upstream-sentinel.json')),
      expectedCanonicalSha256: 'b'.repeat(64),
    },
    sourceBinding: {
      path: semanticSource.path,
      fileSha256: semanticSource.fileSha256,
      characterCount: 1,
      containerCount: 1,
      boundaryCandidateCount: 1,
    },
    requestBindings: {
      generateContent: {
        path: request.path,
        fileSha256: request.fileSha256,
        byteLength: request.bytes.length,
      },
      inputTokenCount: {
        path: inputTokenRequest.path,
        fileSha256: inputTokenRequest.fileSha256,
        byteLength: inputTokenRequest.bytes.length,
      },
      maximumResponseTokenCount: {
        path: maximumTokenRequest.path,
        fileSha256: maximumTokenRequest.fileSha256,
        byteLength: maximumTokenRequest.bytes.length,
      },
    },
    officialVerification: {
      observedAt: '2026-07-27',
      sources: ['https://example.invalid/model', 'https://example.invalid/pricing'],
      modelId: 'gemini-synthetic-flash',
      modelResource: 'models/gemini-synthetic-flash',
      inputLimit: 1000,
      outputLimit: 100,
      tier: 'PAID_STANDARD_DEFAULT_BY_OMISSION',
      inputPriceUsdPerMillion: '1.50',
      outputPriceUsdPerMillion: '7.50',
    },
    transport: {
      product: 'Gemini Developer API',
      apiVersion: 'v1beta',
      endpoint:
        'https://generativelanguage.googleapis.com/v1beta/models/'
        + 'gemini-synthetic-flash:countTokens',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Server-Timeout': '600',
        'x-goog-api-key': '<redacted>',
      },
      clientTimeoutMilliseconds: 600000,
      automaticRetries: 0,
      countTokensCalls: 2,
      generateContentCalls: 0,
    },
    tokenDiagnosis: {
      inputTokens: 8,
      maximumResponseStructureTokens: 5,
      maximumResponseStructureWithinOfficialOutputLimit: true,
      inputMeasurement: {
        status: 'measured-in-this-attempt',
        countTokensCallsInThisAttempt: 1,
        responsePath: tokenResponseA.path,
        responseSha256: tokenResponseA.fileSha256,
      },
      maximumResponseStructureMeasurement: {
        status: 'measured-in-this-attempt',
        countTokensCallsInThisAttempt: 1,
        responsePath: tokenResponseB.path,
        responseSha256: tokenResponseB.fileSha256,
      },
    },
    cost: {
      calculationPolicy: 'synthetic-test-only',
    },
    artifacts: [
      {
        path: request.path,
        fileSha256: request.fileSha256,
        byteLength: request.bytes.length,
      },
      {
        path: inputTokenRequest.path,
        fileSha256: inputTokenRequest.fileSha256,
        byteLength: inputTokenRequest.bytes.length,
      },
      {
        path: tokenResponseA.path,
        fileSha256: tokenResponseA.fileSha256,
        byteLength: tokenResponseA.bytes.length,
      },
      {
        path: maximumTokenRequest.path,
        fileSha256: maximumTokenRequest.fileSha256,
        byteLength: maximumTokenRequest.bytes.length,
      },
      {
        path: tokenResponseB.path,
        fileSha256: tokenResponseB.fileSha256,
        byteLength: tokenResponseB.bytes.length,
      },
    ],
    checks: Array.from({length: 10}, (_, index) => ({
      id: index + 1,
      status: 'passed',
      meaning: `synthetic-${index + 1}`,
      evidence: {},
    })),
    nextStage: {b6AutomaticallyStarted: false},
  };
  let b5Manifest = await writeFormal(
    resolve(inputRoot, 'b5-initial-manifest.json'),
    b5ManifestValue,
  );

  const outputRoot = resolve(PRESENTATION_ROOT, 'caption-gate-b6', runDirectoryId);
  const semanticRawPath = resolve(
    PRESENTATION_ROOT,
    'caption-semantic-raw-outputs',
    `${formalId}.json`,
  );
  const b1JobPath = resolve(
    PRESENTATION_ROOT,
    'caption-semantic-output-check-jobs',
    `${formalId}.json`,
  );
  const b4JobPath = resolve(
    PRESENTATION_ROOT,
    'caption-display-pair-generation-jobs',
    `${formalId}.json`,
  );
  const b4OutputRoot = resolve(
    PRESENTATION_ROOT,
    'caption-display-pairs',
    formalId,
  );
  const jobPath = resolve(JOB_ROOT, `${formalId}.json`);
  const coreBytes = await readFile(resolve(WORKSPACE_ROOT, CORE_PATH));
  const runnerBytes = await readFile(resolve(WORKSPACE_ROOT, RUNNER_PATH));
  let jobValue = {
    schemaVersion: 'presentation-caption-gate-b6-execution-job-v001',
    jobId: formalId,
    mode: 'formal-one-shot',
    attemptId: formalId,
    runDirectoryId,
    implementationBinding: {
      b6Core: {path: CORE_PATH, fileSha256: sha256(coreBytes)},
      b6JobRunner: {path: RUNNER_PATH, fileSha256: sha256(runnerBytes)},
    },
    b5: {
      initialManifest: {
        path: b5Manifest.path,
        fileSha256: b5Manifest.fileSha256,
      },
      fixedRequest: {
        path: request.path,
        fileSha256: request.fileSha256,
      },
    },
    sourcePackage: {
      rootPath: repositoryPath(sourcePackageRoot),
      manifest: {
        path: packageManifest.path,
        fileSha256: packageManifest.fileSha256,
      },
      validationReport: {
        path: packageReport.path,
        fileSha256: packageReport.fileSha256,
      },
    },
    b4StaticTemplate: {
      path: b4Template.path,
      fileSha256: b4Template.fileSha256,
    },
    publication: {
      outputRoot: repositoryPath(outputRoot),
      semanticRawPath: repositoryPath(semanticRawPath),
      b1JobPath: repositoryPath(b1JobPath),
      b1ReportPath: repositoryPath(resolve(outputRoot, 'semantic-output-validation-report.json')),
      b4JobPath: repositoryPath(b4JobPath),
      b4PairId: formalId,
      b4OutputRoot: repositoryPath(b4OutputRoot),
      b4RunnerOutputPath: repositoryPath(resolve(outputRoot, 'b4-runner-output.raw.json')),
      b4DisplayPlanPath: repositoryPath(resolve(b4OutputRoot, 'display-plan.json')),
    },
  };
  await mkdir(JOB_ROOT, {recursive: true});
  let job = await writeFormal(jobPath, jobValue);

  const rewriteJob = async (mutator) => {
    jobValue = structuredClone(jobValue);
    mutator(jobValue);
    job = await writeFormal(jobPath, jobValue);
  };
  const rewriteB5 = async (mutator) => {
    b5ManifestValue = structuredClone(b5ManifestValue);
    mutator(b5ManifestValue);
    b5Manifest = await writeFormal(
      resolve(inputRoot, 'b5-initial-manifest.json'),
      b5ManifestValue,
    );
    await rewriteJob((value) => {
      value.b5.initialManifest.fileSha256 = b5Manifest.fileSha256;
    });
  };
  const rewriteB4Template = async (mutator) => {
    const value = structuredClone(b4TemplateValue);
    mutator(value);
    b4Template = await writeFormal(resolve(inputRoot, 'b4-template.json'), value);
    await rewriteJob((entry) => {
      entry.b4StaticTemplate.fileSha256 = b4Template.fileSha256;
    });
  };
  const cleanup = async () => {
    await rm(inputRoot, {recursive: true, force: true});
    await rm(jobPath, {force: true});
    await rm(outputRoot, {recursive: true, force: true});
    await rm(semanticRawPath, {force: true});
    await rm(b1JobPath, {force: true});
    await rm(b4JobPath, {force: true});
    await rm(b4OutputRoot, {recursive: true, force: true});
    await rm(`${b4OutputRoot}.lock`, {recursive: true, force: true});
    await rm(`${b4OutputRoot}.work`, {recursive: true, force: true});
  };
  return {
    jobPath: repositoryPath(jobPath),
    jobValue,
    request,
    outputRoot,
    rewriteJob,
    rewriteB5,
    rewriteB4Template,
    cleanup,
  };
};

test('strict jobから固定requestを一回だけ送り、生応答保存後に既存継続へ渡す', async () => {
  const fixture = await makeFixture();
  try {
    const generated = syntheticResponse(responseEnvelope());
    let calls = 0;
    let timeoutMilliseconds = null;
    let continuationCalls = 0;
    const signal = {synthetic: true};
    const result = await runPresentationCaptionGateB6JobV001(fixture.jobPath, {
      apiKey: API_KEY,
      currentDate: new Date('2026-07-27T15:00:00.000Z'),
      timeoutSignalFactory: (milliseconds) => {
        timeoutMilliseconds = milliseconds;
        return signal;
      },
      fetchImplementation: async (url, options) => {
        calls += 1;
        assert.equal(
          url,
          'https://generativelanguage.googleapis.com/v1beta/models/'
            + 'gemini-synthetic-flash:generateContent',
        );
        assert.equal(options.method, 'POST');
        assert.equal(options.headers['X-Server-Timeout'], '600');
        assert.equal(options.headers['x-goog-api-key'], API_KEY);
        assert.equal(options.signal, signal);
        assert.deepEqual(Buffer.from(options.body), fixture.request.bytes);
        return generated.response;
      },
      continuePipeline: async (input) => {
        continuationCalls += 1;
        const rawPath = resolve(fixture.outputRoot, 'generate-content-response.raw.json');
        assert.deepEqual(await readFile(rawPath), generated.bytes);
        assert.equal(input.config.attemptId, fixture.jobValue.attemptId);
        return acceptedContinuation();
      },
    });
    assert.equal(result.status, 'display-plan-ready', JSON.stringify(result));
    assert.equal(result.b6Result.status, 'display-plan-ready');
    assert.equal(result.b6Result.generateContentCalls, 1);
    assert.equal(result.b6Result.automaticRetries, 0);
    assert.equal(calls, 1);
    assert.equal(continuationCalls, 1);
    assert.equal(timeoutMilliseconds, 600_000);
    assert.equal(result.jobBinding.path, fixture.jobPath);
  } finally {
    await fixture.cleanup();
  }
});

test('jobの未知fieldを通信前に拒否する', async () => {
  const fixture = await makeFixture();
  try {
    await fixture.rewriteJob((job) => {
      job.unapproved = true;
    });
    let calls = 0;
    const result = await runPresentationCaptionGateB6JobV001(fixture.jobPath, {
      apiKey: API_KEY,
      fetchImplementation: async () => {
        calls += 1;
        throw new Error('must not call');
      },
    });
    assert.equal(result.status, 'stopped');
    assert.equal(result.b6Result.reason, 'B6_JOB_SHAPE_INVALID');
    assert.equal(result.b6Result.generateContentCalls, 0);
    assert.equal(calls, 0);
  } finally {
    await fixture.cleanup();
  }
});

test('実装bindingの不一致を通信前に拒否する', async () => {
  const fixture = await makeFixture();
  try {
    await fixture.rewriteJob((job) => {
      job.implementationBinding.b6Core.fileSha256 = '0'.repeat(64);
    });
    let calls = 0;
    const result = await runPresentationCaptionGateB6JobV001(fixture.jobPath, {
      apiKey: API_KEY,
      fetchImplementation: async () => {
        calls += 1;
        throw new Error('must not call');
      },
    });
    assert.equal(result.status, 'stopped');
    assert.equal(
      result.b6Result.reason,
      'B6_JOB_IMPLEMENTATION_BINDING_MISMATCH',
    );
    assert.equal(calls, 0);
  } finally {
    await fixture.cleanup();
  }
});

test('B5 initial manifestの未知fieldを通信前に拒否する', async () => {
  const fixture = await makeFixture();
  try {
    await fixture.rewriteB5((manifest) => {
      manifest.unapproved = true;
    });
    let calls = 0;
    const result = await runPresentationCaptionGateB6JobV001(fixture.jobPath, {
      apiKey: API_KEY,
      fetchImplementation: async () => {
        calls += 1;
        throw new Error('must not call');
      },
    });
    assert.equal(result.status, 'stopped');
    assert.equal(result.b6Result.reason, 'B6_JOB_B5_MANIFEST_SCHEMA_INVALID');
    assert.equal(calls, 0);
  } finally {
    await fixture.cleanup();
  }
});

test('B5固定requestのSHA不一致を通信前に拒否する', async () => {
  const fixture = await makeFixture();
  try {
    await fixture.rewriteB5((manifest) => {
      manifest.requestBindings.generateContent.fileSha256 = 'f'.repeat(64);
    });
    let calls = 0;
    const result = await runPresentationCaptionGateB6JobV001(fixture.jobPath, {
      apiKey: API_KEY,
      fetchImplementation: async () => {
        calls += 1;
        throw new Error('must not call');
      },
    });
    assert.equal(result.status, 'stopped');
    assert.equal(result.b6Result.reason, 'B6_JOB_FIXED_REQUEST_BINDING_MISMATCH');
    assert.equal(calls, 0);
  } finally {
    await fixture.cleanup();
  }
});

test('B5とB3の素材不一致を通信前に拒否する', async () => {
  const fixture = await makeFixture();
  try {
    await fixture.rewriteB5((manifest) => {
      manifest.sourceBinding.fileSha256 = 'e'.repeat(64);
    });
    let calls = 0;
    const result = await runPresentationCaptionGateB6JobV001(fixture.jobPath, {
      apiKey: API_KEY,
      fetchImplementation: async () => {
        calls += 1;
        throw new Error('must not call');
      },
    });
    assert.equal(result.status, 'stopped');
    assert.equal(result.b6Result.reason, 'B6_JOB_B5_B3_SOURCE_BINDING_MISMATCH');
    assert.equal(calls, 0);
  } finally {
    await fixture.cleanup();
  }
});

test('B3とB4 templateの素材不一致を通信前に拒否する', async () => {
  const fixture = await makeFixture();
  try {
    await fixture.rewriteB4Template((template) => {
      template.sourcePackageBinding.manifest.fileSha256 = 'd'.repeat(64);
    });
    let calls = 0;
    const result = await runPresentationCaptionGateB6JobV001(fixture.jobPath, {
      apiKey: API_KEY,
      fetchImplementation: async () => {
        calls += 1;
        throw new Error('must not call');
      },
    });
    assert.equal(result.status, 'stopped');
    assert.equal(result.b6Result.reason, 'B6_JOB_B3_B4_SOURCE_BINDING_MISMATCH');
    assert.equal(calls, 0);
  } finally {
    await fixture.cleanup();
  }
});

test('使用済み出力pathを通信前に拒否する', async () => {
  const fixture = await makeFixture();
  try {
    await mkdir(fixture.outputRoot, {recursive: true});
    let calls = 0;
    const result = await runPresentationCaptionGateB6JobV001(fixture.jobPath, {
      apiKey: API_KEY,
      fetchImplementation: async () => {
        calls += 1;
        throw new Error('must not call');
      },
    });
    assert.equal(result.status, 'stopped');
    assert.equal(result.b6Result.reason, 'B6_JOB_OUTPUT_PATH_ALREADY_EXISTS');
    assert.equal(calls, 0);
  } finally {
    await fixture.cleanup();
  }
});

test('無効なHTTP bodyもraw byteを解析前に保存し再試行しない', async () => {
  const fixture = await makeFixture();
  try {
    const raw = Buffer.from('not-json\n', 'utf8');
    let calls = 0;
    let continuationCalls = 0;
    const result = await runPresentationCaptionGateB6JobV001(fixture.jobPath, {
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
    assert.equal(result.b6Result.reason, 'HTTP_RESPONSE_JSON_INVALID');
    assert.equal(result.b6Result.generateContentCalls, 1);
    assert.equal(result.b6Result.automaticRetries, 0);
    assert.equal(calls, 1);
    assert.equal(continuationCalls, 0);
    assert.deepEqual(
      await readFile(resolve(fixture.outputRoot, 'generate-content-response.raw.json')),
      raw,
    );
  } finally {
    await fixture.cleanup();
  }
});

test('B1不受理はB4へ進めず検査済み結果として止める', async () => {
  const fixture = await makeFixture();
  try {
    let calls = 0;
    let continuationCalls = 0;
    const result = await runPresentationCaptionGateB6JobV001(fixture.jobPath, {
      apiKey: API_KEY,
      fetchImplementation: async () => {
        calls += 1;
        return syntheticResponse(responseEnvelope()).response;
      },
      timeoutSignalFactory: () => ({synthetic: true}),
      continuePipeline: async () => {
        continuationCalls += 1;
        return {
          status: 'rejected',
          reason: 'B1_SEMANTIC_OUTPUT_REJECTED',
          b1: {status: 'failed'},
        };
      },
    });
    assert.equal(result.status, 'rejected');
    assert.equal(result.b6Result.reason, 'B1_SEMANTIC_OUTPUT_REJECTED');
    assert.equal(result.b6Result.generateContentCalls, 1);
    assert.equal(calls, 1);
    assert.equal(continuationCalls, 1);
    assert.equal(result.b6Result.displayPlanBinding, undefined);
  } finally {
    await fixture.cleanup();
  }
});

test('abstainedは表示計画を作らず正常な結果として止める', async () => {
  const fixture = await makeFixture();
  try {
    const result = await runPresentationCaptionGateB6JobV001(fixture.jobPath, {
      apiKey: API_KEY,
      fetchImplementation: async () =>
        syntheticResponse(responseEnvelope({
          semanticText: '{"status":"abstained"}\n',
        })).response,
      timeoutSignalFactory: () => ({synthetic: true}),
      continuePipeline: async () => ({
        status: 'abstained',
        reason: 'B1_ABSTAINED',
        b1: {status: 'abstained'},
      }),
    });
    assert.equal(result.status, 'abstained');
    assert.equal(result.b6Result.reason, 'B1_ABSTAINED');
    assert.equal(result.b6Result.displayPlanBinding, undefined);
  } finally {
    await fixture.cleanup();
  }
});
