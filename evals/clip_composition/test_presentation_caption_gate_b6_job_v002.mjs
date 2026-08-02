import assert from 'node:assert/strict';
import {
  mkdir,
  readFile,
  rm,
  writeFile,
} from 'node:fs/promises';
import {dirname, resolve} from 'node:path';
import test from 'node:test';
import {fileURLToPath} from 'node:url';

import {
  executePresentationCaptionGateB6JobV002,
} from './run_presentation_caption_gate_b6_job_v002.mjs';
import {
  validatePresentationCaptionGateB6CostStateV002,
} from './run_presentation_caption_gate_b6_v001.mjs';
import {
  PRESENTATION_CAPTION_API_OFFICIAL_SOURCE_SPECS_V001,
  buildPresentationCaptionResidualRiskAcceptanceV001,
} from './presentation_caption_api_cost_guard_v001.mjs';
import {
  canonicalizePresentationCaptionB1JsonV001,
  serializePresentationCaptionB1FormalJsonV001,
  sha256PresentationCaptionB1BytesV001,
} from './presentation_caption_semantic_source_package_v001.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const rel = (path) => resolve(ROOT, path);
const API_KEY = 'area5-fixture-api-key';
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

const CLOSURE = Object.freeze([
  ['b6Core', 'evals/clip_composition/run_presentation_caption_gate_b6_v001.mjs'],
  ['sourcePackageCore', 'evals/clip_composition/presentation_caption_semantic_source_package_v001.mjs'],
  ['textLayoutImplementation', 'evals/clip_composition/presentation_renderer_text_layout_v001.mjs'],
  ['gateACore', 'evals/clip_composition/presentation_segmenter_boundary_evidence_v001.mjs'],
  ['gateARetainedSourceAtomsCore', 'evals/clip_composition/presentation_retained_source_atoms_v001.mjs'],
  ['gateARunner', 'evals/clip_composition/run_presentation_segmenter_boundary_preflight_v001.mjs'],
  ['semanticCore', 'evals/clip_composition/presentation_caption_semantic_output_v001.mjs'],
  ['semanticRunnerV001', 'evals/clip_composition/run_presentation_caption_semantic_output_check_v001.mjs'],
  ['displayPairRunnerV001', 'evals/clip_composition/run_presentation_caption_display_pair_job_v001.mjs'],
  ['displayPairCoreV003', 'evals/clip_composition/presentation_caption_display_pair_v003.mjs'],
  ['instructionCoreV003', 'evals/clip_composition/presentation_instruction_contract_v003.mjs'],
  ['captionCoreV003', 'evals/clip_composition/presentation_caption_contract_v003.mjs'],
  ['timelineV002', 'evals/clip_composition/presentation_base_media_timeline_v002.mjs'],
  ['sourceSpeakerPolicy', 'evals/clip_composition/presentation_source_speaker_policy_v001.mjs'],
  ['sourceSpeakerRegistry', 'evals/clip_composition/registries/presentation/presentation-source-speaker-non-identity-registry-v001/registry.json'],
]);

const officialVerification = () => {
  const sources = PRESENTATION_CAPTION_API_OFFICIAL_SOURCE_SPECS_V001.map(
    ({sourceId, url, basename}, index) => ({
      sourceId,
      url,
      observedAt: '2026-07-29T00:00:00.000Z',
      snapshotPath: `fixture/official/${basename}`,
      snapshotFileSha256: (index + 1).toString(16).repeat(64),
      snapshotByteLength: index + 1,
    }),
  );
  const sourceById = new Map(sources.map((source) => [source.sourceId, source]));
  const wholeSnapshotEvidence = (sourceId) => {
    const source = sourceById.get(sourceId);
    return [{
      sourceId,
      utf8ByteOffset: 0,
      utf8ByteLength: source.snapshotByteLength,
      excerptSha256: source.snapshotFileSha256,
      locatorLabel: `whole-snapshot:${sourceId}`,
    }];
  };
  return {
    modelId: 'gemini-3.6-flash',
    modelResource: 'models/gemini-3.6-flash',
    observedAt: '2026-07-29T00:00:00.000Z',
    inputLimit: 1_048_576,
    outputLimit: 65_536,
    tier: 'PAID_STANDARD_DEFAULT_BY_OMISSION',
    inputPriceNanoUsdPerToken: 1_500,
    outputPriceNanoUsdPerToken: 7_500,
    sources,
    claims: [
      ['model-exists', 'latest-model'],
      ['input-limit', 'latest-model'],
      ['output-limit', 'latest-model'],
      ['standard-input-price', 'pricing'],
      ['standard-output-price', 'pricing'],
      ['service-tier-omission-standard', 'pricing'],
    ].map(([claimId, sourceId]) => ({
      claimId,
      verdict: 'verified',
      evidence: wholeSnapshotEvidence(sourceId),
    })).concat([
      {claimId: 'count-tokens-unbilled', verdict: 'unverified', evidence: []},
      {
        claimId: 'count-tokens-upper-bounds-prompt-billing',
        verdict: 'contradicted',
        evidence: wholeSnapshotEvidence('tokens-guide'),
      },
    {
      claimId: 'max-output-upper-bounds-candidate-plus-thinking',
      verdict: 'unverified',
      evidence: [],
      },
    ]),
  };
};

const makeResponseValue = ({
  prompt = 100,
  candidates = 10,
  thoughts = 5,
  tier = 'standard',
  candidateCount = 1,
  text = '{"status":"complete","containers":[]}\n',
  thoughtSignature,
  extraPartKey = false,
} = {}) => ({
  candidates: Array.from({length: candidateCount}, () => ({
    content: {
      parts: [{
        text,
        ...(thoughtSignature === undefined ? {} : {thoughtSignature}),
        ...(extraPartKey ? {extra: true} : {}),
      }],
      role: 'model',
    },
    finishReason: 'STOP',
  })),
  usageMetadata: {
    promptTokenCount: prompt,
    candidatesTokenCount: candidates,
    thoughtsTokenCount: thoughts,
    totalTokenCount: prompt + candidates + thoughts,
    ...(tier === undefined ? {} : {serviceTier: tier}),
  },
  modelVersion: 'gemini-3.6-flash',
});

const fakeResponse = (value, {status = 200, contentType} = {}) => {
  const bytes = Buffer.isBuffer(value) ? value : formalBytes(value);
  return {
    bytes,
    response: new Response(bytes, {
      status,
      headers: {
        'content-type': contentType
          ?? 'application/json; charset=UTF-8',
      },
    }),
  };
};

const createFixture = async ({
  requestMutation,
  b5Mutation,
  responseValue = makeResponseValue(),
} = {}) => {
  const id = `area5-b6-${process.pid}-${Date.now()}-${Math.random()
    .toString(16).slice(2)}`;
  const fixtureRoot = `evals/clip_composition/testdata/${id}`;
  const runDirectoryId = `${id}-run`;
  const attemptId = `${id}-attempt`;
  const outputRoot =
    `evals/clip_composition/outputs/presentation/caption-gate-b6/${runDirectoryId}`;
  const b5Root = `${fixtureRoot}/b5`;
  const requestPath = `${b5Root}/generate-content-request.json`;
  const b5ManifestPath = `${b5Root}/b5-manifest-v002.json`;
  const packageRoot = `${fixtureRoot}/package`;
  const packagePath = `${packageRoot}/package-manifest.json`;
  const packageReportPath = `${packageRoot}/package-validation-report.json`;
  const templatePath = `${fixtureRoot}/b4-template.json`;
  const jobPath = `${fixtureRoot}/b6-job.json`;
  await mkdir(rel(b5Root), {recursive: true});
  await mkdir(rel(packageRoot), {recursive: true});
  const request = {
    systemInstruction: {parts: [{text: 'fixture'}]},
    contents: [{role: 'user', parts: [{text: 'fixture input'}]}],
    generationConfig: {
      candidateCount: 1,
      maxOutputTokens: 1_000,
      responseMimeType: 'application/json',
      thinkingConfig: {thinkingLevel: 'medium'},
    },
  };
  requestMutation?.(request);
  const requestBytes = formalBytes(request);
  const verification = officialVerification();
  const acceptance =
    buildPresentationCaptionResidualRiskAcceptanceV001(verification);
  assert.equal(acceptance.status, 'built');
  const preSendEstimateNanoUsd = 100 * 1_500 + 1_000 * 7_500;
  const b5Manifest = {
    schemaVersion: 'presentation-caption-gate-b5-manifest-v002',
    status: 'passed',
    stage: 'ready-for-b6',
    executionStartedAt: '2026-07-29T00:00:00.000Z',
    officialVerification: verification,
    residualRiskAcceptance: structuredClone(acceptance.value),
    requestBindings: {
      generateContent: {
        requestPath,
        requestFileSha256: sha256(requestBytes),
        rawResponsePath: null,
        rawResponseFileSha256: null,
      },
    },
    tokenDiagnosis: {probeInputTokens: 100, finalInputTokens: 100},
    spendingAuthorization: {
      currency: 'USD',
      maximumNanoUsd: 500_000_000,
      inputPriceNanoUsdPerToken: 1_500,
      outputPriceNanoUsdPerToken: 7_500,
      finalInputTokens: 100,
      maxOutputTokens: 1_000,
      preSendEstimateNanoUsd,
      officialClaimsCanonicalSha256:
        acceptance.value.officialClaimsCanonicalSha256,
      residualRiskAcceptanceCanonicalSha256:
        canonicalSha256(acceptance.value),
      status: 'approved-for-single-send',
    },
    transport: {generateContentCalls: 0},
    nextStage: {generateContentAllowed: true},
  };
  b5Mutation?.(b5Manifest);
  const b5ManifestBytes = formalBytes(b5Manifest);
  const packageManifest = {
    schemaVersion: 'presentation-caption-semantic-source-package-manifest-v002',
  };
  const packageBytes = formalBytes(packageManifest);
  const packageReport = {
    schemaVersion: 'presentation-caption-semantic-source-package-validation-report-v002',
    status: 'passed',
  };
  const packageReportBytes = formalBytes(packageReport);
  const template = {
    schemaVersion: 'presentation-caption-display-pair-static-preflight-job-v002',
    mode: 'read-only-preflight',
  };
  const templateBytes = formalBytes(template);
  await Promise.all([
    writeFile(rel(requestPath), requestBytes),
    writeFile(rel(b5ManifestPath), b5ManifestBytes),
    writeFile(rel(packagePath), packageBytes),
    writeFile(rel(packageReportPath), packageReportBytes),
    writeFile(rel(templatePath), templateBytes),
  ]);
  const entryPath =
    'evals/clip_composition/run_presentation_caption_gate_b6_job_v002.mjs';
  const closure = await Promise.all(CLOSURE.map(async ([role, path]) => ({
    role,
    path,
    fileSha256: sha256(await readFile(rel(path))),
  })));
  const job = {
    schemaVersion: 'presentation-caption-gate-b6-execution-job-v002',
    jobId: id,
    mode: 'formal-one-shot',
    attemptId,
    runDirectoryId,
    implementationBinding: {
      entry: {
        path: entryPath,
        fileSha256: sha256(await readFile(rel(entryPath))),
      },
      localImportClosure: closure,
    },
    b5: {
      initialManifest: {
        path: b5ManifestPath,
        fileSha256: sha256(b5ManifestBytes),
      },
      fixedRequest: {path: requestPath, fileSha256: sha256(requestBytes)},
    },
    sourcePackage: {
      rootPath: packageRoot,
      manifest: {
        path: packagePath,
        fileSha256: sha256(packageBytes),
        canonicalSha256: canonicalSha256(packageManifest),
      },
      validationReport: {
        path: packageReportPath,
        fileSha256: sha256(packageReportBytes),
        canonicalSha256: canonicalSha256(packageReport),
      },
    },
    b4StaticTemplate: {path: templatePath, fileSha256: sha256(templateBytes)},
    publication: {
      outputRoot,
      semanticRawPath: `${fixtureRoot}/semantic.raw.json`,
      b1JobPath: `${fixtureRoot}/b1-job.json`,
      b1ReportPath: `${outputRoot}/b1-report.json`,
      b4JobPath: `${fixtureRoot}/b4-job.json`,
      b4PairId: attemptId,
      b4OutputRoot: `${fixtureRoot}/b4-output`,
      b4RunnerOutputPath: `${outputRoot}/b4-runner-output.raw.json`,
      b4DisplayPlanPath: `${fixtureRoot}/b4-output/display-plan.json`,
    },
  };
  const jobBytes = formalBytes(job);
  await writeFile(rel(jobPath), jobBytes);
  const generated = fakeResponse(responseValue);
  return {
    id,
    jobPath,
    job,
    outputRoot,
    fixtureRoot,
    generated,
    requestBytes,
    b5Manifest,
    cleanup: async () => {
      await Promise.all([
        rm(rel(fixtureRoot), {recursive: true, force: true}),
        rm(rel(outputRoot), {recursive: true, force: true}),
      ]);
    },
  };
};

const passedDownstream = async () => ({
  status: 'passed-to-b4',
  b1: {
    exitCode: 0,
    status: 'passed',
    jobBinding: {path: 'fixture/b1-job.json'},
    validationReportBinding: {path: 'fixture/b1-report.json'},
  },
  b4: {
    exitCode: 0,
    status: 'passed',
    jobBinding: {path: 'fixture/b4-job.json'},
    outputRoot: 'fixture/b4-output',
    validationReportBinding: {path: 'fixture/b4-report.json'},
  },
  displayPlanBinding: {
    path: 'fixture/display-plan.json',
    fileSha256: 'a'.repeat(64),
  },
});

const runFixture = async (fixture, overrides = {}) => {
  let calls = 0;
  const result = await executePresentationCaptionGateB6JobV002({
    jobPath: fixture.jobPath,
    apiKey: API_KEY,
    fetchImplementation: async () => {
      calls += 1;
      return fixture.generated.response;
    },
    timeoutSignalFactory: () => ({fixture: true}),
    downstreamExecutor: passedDownstream,
    currentDate: new Date('2026-07-29T01:00:00.000Z'),
    ...overrides,
  });
  return {result, calls};
};

test('C11 固定jobとrequestを束縛し一回だけ送信する', async () => {
  const fixture = await createFixture();
  try {
    const {result, calls} = await runFixture(fixture);
    assert.equal(result.status, 'passed-to-b4');
    assert.equal(calls, 1);
    assert.equal(result.generateContentCalls, 1);
    assert.deepEqual(
      await readFile(
        rel(`${fixture.outputRoot}/generate-content-response.raw.json`),
      ),
      fixture.generated.bytes,
    );
  } finally {
    await fixture.cleanup();
  }
  const changedJobFixture = await createFixture();
  try {
    const {result, calls} = await runFixture(changedJobFixture, {
      downstreamExecutor: async () => {
        await writeFile(rel(changedJobFixture.jobPath), Buffer.from('{}\n'));
        return passedDownstream();
      },
    });
    assert.equal(calls, 1);
    assert.equal(result.status, 'fatal');
    assert.equal(
      result.diagnosticCode,
      'B6_COMMIT_RECORD_PUBLICATION_FAILED',
    );
  } finally {
    await changedJobFixture.cleanup();
  }
});

test('C12 raw保存後の応答外形違反をtransportへ帰属する', async () => {
  const fixture = await createFixture({
    responseValue: makeResponseValue({extraPartKey: true}),
  });
  try {
    const {result} = await runFixture(fixture);
    assert.equal(result.status, 'stopped');
    assert.equal(result.violationCode, 'API_TRANSPORT_CONTRACT_VIOLATION');
    assert.equal(result.generateContentCalls, 1);
    assert.deepEqual(
      await readFile(
        rel(`${fixture.outputRoot}/generate-content-response.raw.json`),
      ),
      fixture.generated.bytes,
    );
  } finally {
    await fixture.cleanup();
  }
});

test('C12a thoughtSignatureはrawにだけ保持し意味回答へ渡さない', async () => {
  const semanticText = '{"status":"complete","containers":[]}\n';
  const fixture = await createFixture({
    responseValue: makeResponseValue({
      text: semanticText,
      thoughtSignature: 'opaque-provider-metadata',
    }),
  });
  let observedSemanticBytes = null;
  try {
    const {result} = await runFixture(fixture, {
      downstreamExecutor: async ({semanticBytes}) => {
        observedSemanticBytes = Buffer.from(semanticBytes);
        return passedDownstream();
      },
    });
    assert.equal(result.status, 'passed-to-b4', JSON.stringify(result));
    assert.deepEqual(
      observedSemanticBytes,
      Buffer.from(semanticText, 'utf8'),
    );
    assert.deepEqual(
      await readFile(
        rel(`${fixture.outputRoot}/generate-content-response.raw.json`),
      ),
      fixture.generated.bytes,
    );
  } finally {
    await fixture.cleanup();
  }
});

test('C13 生keyが応答へ反射したらsecret違反にする', async () => {
  const fixture = await createFixture({
    responseValue: Buffer.from(`{"echo":"${API_KEY}"}`),
  });
  try {
    const {result} = await runFixture(fixture);
    assert.equal(result.violationCode, 'SECRET_LEAK_DETECTED');
  } finally {
    await fixture.cleanup();
  }
});

test('C14 usage算術不一致を拒否する', () => {
  const result = validatePresentationCaptionGateB6CostStateV002({
    b5Manifest: {
      tokenDiagnosis: {finalInputTokens: 100},
      spendingAuthorization: {
        currency: 'USD',
        maximumNanoUsd: 500_000_000,
        inputPriceNanoUsdPerToken: 1_500,
        outputPriceNanoUsdPerToken: 7_500,
        finalInputTokens: 100,
        maxOutputTokens: 1_000,
        preSendEstimateNanoUsd: 7_650_000,
        status: 'approved-for-single-send',
      },
    },
    usageMetadata: {
      promptTokenCount: 100,
      candidatesTokenCount: 10,
      thoughtsTokenCount: 5,
      totalTokenCount: 999,
    },
  });
  assert.equal(result.code, 'API_USAGE_ACCOUNTING_INVALID');
});

test('C15 事前見積り超過は事実記録し上限内なら停止しない', async () => {
  const fixture = await createFixture({
    responseValue: makeResponseValue({prompt: 101, candidates: 900, thoughts: 101}),
  });
  try {
    const {result} = await runFixture(fixture);
    assert.equal(result.status, 'passed-to-b4');
    const manifest = JSON.parse(
      await readFile(rel(`${fixture.outputRoot}/b6-manifest-v002.json`)),
    );
    assert.equal(
      manifest.spendingAuthorization.estimateComparison
        .promptTokensExceededFinalInputTokens,
      true,
    );
    assert.equal(
      manifest.spendingAuthorization.estimateComparison
        .outputTokensExceededDerivedMaxOutputTokens,
      true,
    );
  } finally {
    await fixture.cleanup();
  }
});

test('C16 Standard以外のtierを専用違反へ帰属する', async () => {
  const fixture = await createFixture({
    responseValue: makeResponseValue({tier: 'batch'}),
  });
  try {
    const {result} = await runFixture(fixture);
    assert.equal(result.violationCode, 'API_RESPONSE_TIER_MISMATCH');
  } finally {
    await fixture.cleanup();
  }
});

test('C17 事後usage換算が上限超過ならB1前停止', async () => {
  const fixture = await createFixture({
    responseValue: makeResponseValue({
      prompt: 333_334,
      candidates: 0,
      thoughts: 0,
    }),
  });
  try {
    const {result} = await runFixture(fixture);
    assert.equal(result.reason, 'usage-budget-violation');
    assert.equal(result.status, 'stopped-after-response');
  } finally {
    await fixture.cleanup();
  }
});

test('C18 candidateCountは整数1以外を通信前拒否する', async () => {
  const fixture = await createFixture({
    requestMutation: (request) => {
      request.generationConfig.candidateCount = 2;
    },
  });
  try {
    const {result, calls} = await runFixture(fixture);
    assert.equal(result.status, 'stopped');
    assert.equal(result.violationCode, 'API_BUDGET_REQUEST_MISMATCH');
    assert.equal(calls, 0);
  } finally {
    await fixture.cleanup();
  }
});

test('C19 応答candidateが複数ならusage違反でB1へ進めない', async () => {
  const fixture = await createFixture({
    responseValue: makeResponseValue({candidateCount: 2}),
  });
  try {
    const {result} = await runFixture(fixture);
    assert.equal(result.violationCode, 'API_USAGE_ACCOUNTING_INVALID');
  } finally {
    await fixture.cleanup();
  }
});

test('C20 残余riskの段間verdict改変をcode 24へ帰属する', async () => {
  const fixture = await createFixture({
    b5Mutation: (manifest) => {
      manifest.residualRiskAcceptance.claimBindings[1].acceptedVerdict =
        'verified';
      manifest.spendingAuthorization
        .residualRiskAcceptanceCanonicalSha256 =
        canonicalSha256(manifest.residualRiskAcceptance);
    },
  });
  try {
    const {result, calls} = await runFixture(fixture);
    assert.equal(
      result.violationCode,
      'API_PROMPT_TOKEN_BOUND_RISK_ACCEPTANCE_INVALID',
    );
    assert.equal(calls, 0);
  } finally {
    await fixture.cleanup();
  }
});

test('C21 child終了2をdownstream stopへ帰属する', async () => {
  const fixture = await createFixture();
  try {
    const {result} = await runFixture(fixture, {
      downstreamExecutor: async () => ({
        status: 'fatal',
        child: 'b1',
        exitCode: 2,
        stdout: Buffer.from('{"status":"fatal"}\n'),
        stderr: Buffer.alloc(0),
      }),
    });
    assert.equal(result.violationCode, 'B6_DOWNSTREAM_EXECUTION_FAILED');
    const report = JSON.parse(
      await readFile(rel(`${fixture.outputRoot}/b6-stop-report-v001.json`)),
    );
    assert.equal(report.childObservation.exitCode, 2);
  } finally {
    await fixture.cleanup();
  }
});

test('C22 abstainedはB4へ進めず検査済み停止として残す', async () => {
  const fixture = await createFixture();
  try {
    const {result} = await runFixture(fixture, {
      downstreamExecutor: async () => ({
        status: 'stopped-after-response',
        reason: 'semantic-output-abstained',
        violationCodes: [],
        b1: {exitCode: 1, status: 'abstained'},
        b4: null,
      }),
    });
    assert.equal(result.status, 'stopped-after-response');
    const manifest = JSON.parse(
      await readFile(rel(`${fixture.outputRoot}/b6-manifest-v002.json`)),
    );
    assert.deepEqual(manifest.stop.violationCodes, []);
    assert.equal(manifest.b4, null);
  } finally {
    await fixture.cleanup();
  }
});

test('C23 commit recordを公開できなければfatalで成功を名乗らない', async () => {
  const fixture = await createFixture();
  try {
    const {result} = await runFixture(fixture, {
      downstreamExecutor: async () => {
        await Promise.all([
          writeFile(
            rel(`${fixture.outputRoot}/b6-manifest-v002.json`),
            Buffer.from('{}\n'),
          ),
          writeFile(
            rel(`${fixture.outputRoot}/b6-stop-report-v001.json`),
            Buffer.from('{}\n'),
          ),
        ]);
        return passedDownstream();
      },
    });
    assert.equal(result.status, 'fatal');
    assert.equal(
      result.diagnosticCode,
      'B6_COMMIT_RECORD_PUBLICATION_FAILED',
    );
  } finally {
    await fixture.cleanup();
  }
});
