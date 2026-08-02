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
  executePresentationCaptionGateB5InitialV002,
} from './run_presentation_caption_gate_b5_initial_v002.mjs';
import {
  inspectPresentationCaptionDisplayPairStaticPreflightProjectionV001,
} from './run_presentation_caption_display_pair_static_preflight_v001.mjs';
import {
  buildPresentationCaptionGateB5BoundRequestV002,
} from './run_presentation_caption_gate_b5_v004.mjs';
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
  ['sharedBuilder', 'evals/clip_composition/run_presentation_caption_gate_b5_v004.mjs'],
  ['sourcePackageCore', 'evals/clip_composition/presentation_caption_semantic_source_package_v001.mjs'],
  ['textLayoutImplementation', 'evals/clip_composition/presentation_renderer_text_layout_v001.mjs'],
  ['gateACore', 'evals/clip_composition/presentation_segmenter_boundary_evidence_v001.mjs'],
  ['gateARetainedSourceAtomsCore', 'evals/clip_composition/presentation_retained_source_atoms_v001.mjs'],
  ['gateARunner', 'evals/clip_composition/run_presentation_segmenter_boundary_preflight_v001.mjs'],
  ['staticPreflightRunner', 'evals/clip_composition/run_presentation_caption_display_pair_static_preflight_v001.mjs'],
  ['displayPairCoreV003', 'evals/clip_composition/presentation_caption_display_pair_v003.mjs'],
  ['semanticCore', 'evals/clip_composition/presentation_caption_semantic_output_v001.mjs'],
  ['instructionCoreV003', 'evals/clip_composition/presentation_instruction_contract_v003.mjs'],
  ['captionCoreV003', 'evals/clip_composition/presentation_caption_contract_v003.mjs'],
  ['timelineV002', 'evals/clip_composition/presentation_base_media_timeline_v002.mjs'],
  ['sourceSpeakerPolicy', 'evals/clip_composition/presentation_source_speaker_policy_v001.mjs'],
  ['sourceSpeakerRegistry', 'evals/clip_composition/registries/presentation/presentation-source-speaker-non-identity-registry-v001/registry.json'],
  ['apiCostGuard', 'evals/clip_composition/presentation_caption_api_cost_guard_v001.mjs'],
]);

const sourceValue = (width = 14) => ({
  schemaVersion: 'presentation-caption-semantic-source-input-v002',
  taskDescription:
    '各containerのboundaryCandidatesを記載順どおり一度ずつ使用し、本文を変更せず、各行のlogicalWidth合計がmaxLogicalWidthPerLine以下になる意味の読める短い行へ分ける。連続する1行または2行を1つのmeaningGroupとしてまとめ、行末はboundaryCandidateIdで示す。',
  displayConstraints: {
    maxLogicalWidthPerLine: width,
    maxLinesPerMeaningGroup: 2,
  },
  containers: [{
    containerId: 'container-a',
    text: '赤青',
    boundaryCandidates: [
      {boundaryCandidateId: 'boundary-a', text: '赤', logicalWidth: 2},
      {boundaryCandidateId: 'boundary-b', text: '青', logicalWidth: 2},
    ],
  }],
});

const makeOfficialVerification = (jobId, snapshotFacts) => {
  const urlBySourceId = new Map(
    PRESENTATION_CAPTION_API_OFFICIAL_SOURCE_SPECS_V001.map(
      ({sourceId, url}) => [sourceId, url],
    ),
  );
  const sources = snapshotFacts.map(({sourceId, basename, bytes}) => ({
    sourceId,
    url: urlBySourceId.get(sourceId),
    observedAt: '2026-07-29T00:00:00.000Z',
    snapshotPath:
      `evals/clip_composition/inputs/presentation/`
        + `gemini-api-official-snapshots/${jobId}/${basename}`,
    snapshotFileSha256: sha256(bytes),
    snapshotByteLength: bytes.length,
  }));
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
      {
        claimId: 'count-tokens-unbilled',
        verdict: 'unverified',
        evidence: [],
      },
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

const createFixture = async ({
  widthMismatch = false,
  useRealUpstreamProjection = false,
} = {}) => {
  const jobId = `area5-b5-${process.pid}-${Date.now()}-${Math.random()
    .toString(16).slice(2)}`;
  const fixtureRoot = `evals/clip_composition/testdata/${jobId}`;
  const outputDirectory =
    `evals/clip_composition/outputs/presentation/caption-gate-b5/${jobId}`;
  const workDirectory =
    `evals/clip_composition/outputs/presentation-caption-gate-b5-work/${jobId}`;
  const snapshotRoot =
    `evals/clip_composition/inputs/presentation/`
      + `gemini-api-official-snapshots/${jobId}`;
  const sourcePath = `${fixtureRoot}/semantic-source-input.json`;
  const packagePath = `${fixtureRoot}/package-manifest.json`;
  const jobPath = `${fixtureRoot}/b5-job.json`;
  const source = sourceValue(14);
  const sourceBytes = formalBytes(source);
  const packageManifest = {
    schemaVersion: 'presentation-caption-semantic-source-package-manifest-v002',
    displayConstraintInput: {
      maxLogicalWidthPerLine: widthMismatch ? 15 : 14,
      maxLinesPerMeaningGroup: 2,
      characterWidthRule: 'U+0000..U+00FF=1; other Unicode code point=2',
    },
  };
  const packageBytes = formalBytes(packageManifest);
  const snapshotFacts = [
    ['pricing', 'pricing.snapshot.html'],
    ['tokens-guide', 'tokens-guide.snapshot.html'],
    ['count-tokens-api', 'count-tokens-api.snapshot.html'],
    ['billing', 'billing.snapshot.html'],
    ['thinking', 'thinking.snapshot.html'],
    ['latest-model', 'latest-model.snapshot.html'],
  ].map(([sourceId, basename]) => ({
    sourceId,
    basename,
    bytes: Buffer.from(`${sourceId}\n`, 'utf8'),
  }));
  await mkdir(rel(fixtureRoot), {recursive: true});
  await mkdir(rel(snapshotRoot), {recursive: true});
  await Promise.all([
    writeFile(rel(sourcePath), sourceBytes),
    writeFile(rel(packagePath), packageBytes),
    ...snapshotFacts.map(({basename, bytes}) =>
      writeFile(rel(`${snapshotRoot}/${basename}`), bytes)),
  ]);
  const officialVerification =
    makeOfficialVerification(jobId, snapshotFacts);
  const acceptance =
    buildPresentationCaptionResidualRiskAcceptanceV001(officialVerification);
  assert.equal(acceptance.status, 'built');
  const entryPath =
    'evals/clip_composition/run_presentation_caption_gate_b5_initial_v002.mjs';
  const entryBytes = await readFile(rel(entryPath));
  const closure = await Promise.all(CLOSURE.map(async ([role, path]) => ({
    role,
    path,
    fileSha256: sha256(await readFile(rel(path))),
  })));
  const sentinelPath =
    'evals/clip_composition/outputs/presentation/'
      + `caption-display-pair-static-preflight-jobs/${jobId}.json`;
  const realProjection = useRealUpstreamProjection
    ? await inspectPresentationCaptionDisplayPairStaticPreflightProjectionV001(
      sentinelPath,
    )
    : null;
  if (useRealUpstreamProjection) {
    assert.equal(realProjection.kind, 'trusted-projection');
  }
  const job = {
    schemaVersion: 'presentation-caption-gate-b5-initial-job-v002',
    jobId,
    sourceBinding: {
      path: sourcePath,
      fileSha256: sha256(sourceBytes),
      canonicalSha256: canonicalSha256(source),
      packageManifestPath: packagePath,
      packageManifestFileSha256: sha256(packageBytes),
      packageManifestCanonicalSha256: canonicalSha256(packageManifest),
      characterCount: 2,
      containerCount: 1,
      boundaryCandidateCount: 2,
    },
    requestBuilderBinding: {
      entry: {path: entryPath, fileSha256: sha256(entryBytes)},
      localImportClosure: closure,
    },
    upstreamProjection: {
      sentinelPath,
      expectedCanonicalSha256: useRealUpstreamProjection
        ? realProjection.expectedBeforeCanonicalSha256
        : '7'.repeat(64),
    },
    outputDirectory,
    officialVerification,
    residualRiskAcceptance: acceptance.value,
    budgetPolicy: {
      currency: 'USD',
      maximumNanoUsd: 500_000_000,
      chargeScope:
        'one-vertical-caption-run-count-tokens-and-generate-content-token-fees',
      countTokensCalls: 2,
      generateContentCalls: 1,
      automaticRetries: 0,
      timeoutMilliseconds: 600_000,
    },
  };
  await writeFile(rel(jobPath), formalBytes(job));
  return {
    jobId,
    jobPath,
    fixtureRoot,
    snapshotRoot,
    outputDirectory,
    workDirectory,
    cleanup: async () => {
      await Promise.all([
        rm(rel(fixtureRoot), {recursive: true, force: true}),
        rm(rel(snapshotRoot), {recursive: true, force: true}),
        rm(rel(outputDirectory), {recursive: true, force: true}),
        rm(rel(workDirectory), {recursive: true, force: true}),
      ]);
    },
  };
};

const fakeCountTokens = ({onCall = async () => {}} = {}) => {
  let calls = 0;
  return {
    get calls() {
      return calls;
    },
    fetch: async () => {
      calls += 1;
      await onCall(calls);
      const totalTokens = calls === 1 ? 100 : 101;
      return new Response(
        Buffer.from(
          JSON.stringify({
            totalTokens,
            promptTokensDetails: [{modality: 'TEXT', tokenCount: totalTokens}],
          }),
        ),
        {
          status: 200,
          headers: {'content-type': 'application/json; charset=UTF-8'},
        },
      );
    },
  };
};

test('W09 B5は実装を束縛し幅不一致を通信0回で止める', async () => {
  const fixture = await createFixture({widthMismatch: true});
  const transport = fakeCountTokens();
  try {
    const result = await executePresentationCaptionGateB5InitialV002({
      jobPath: fixture.jobPath,
      apiKey: 'fixture-secret',
      fetchImplementation: transport.fetch,
      inspectUpstreamProjection: async () => ({
        kind: 'trusted-projection',
        expectedBeforeCanonicalSha256: '7'.repeat(64),
      }),
      currentDate: new Date('2026-07-29T01:00:00.000Z'),
    });
    assert.equal(result.status, 'stopped');
    assert.equal(result.violationCode, 'API_BUDGET_BINDING_INVALID');
    assert.equal(result.countTokensCalls, 0);
    assert.equal(transport.calls, 0);
    const stopReport = JSON.parse(
      await readFile(rel(result.stopReportBinding.path)),
    );
    assert.equal(
      stopReport.schemaVersion,
      'presentation-caption-gate-b5-measurement-stop-report-v001',
    );
    assert.equal(stopReport.stage, 'pre-measurement');
    assert.equal(stopReport.artifacts.length, 6);
  } finally {
    await fixture.cleanup();
  }
  const changedJobFixture = await createFixture();
  const changedJobTransport = fakeCountTokens({
    onCall: async (callCount) => {
      if (callCount === 2) {
        await writeFile(rel(changedJobFixture.jobPath), Buffer.from('{}\n'));
      }
    },
  });
  try {
    const result = await executePresentationCaptionGateB5InitialV002({
      jobPath: changedJobFixture.jobPath,
      apiKey: 'fixture-secret',
      fetchImplementation: changedJobTransport.fetch,
      inspectUpstreamProjection: async () => ({
        kind: 'trusted-projection',
        expectedBeforeCanonicalSha256: '7'.repeat(64),
      }),
      currentDate: new Date('2026-07-29T01:00:00.000Z'),
    });
    assert.equal(result.status, 'fatal');
    assert.equal(
      result.diagnosticCode,
      'CAPTION_B5_V002_RUNNER_FATAL',
    );
    assert.equal(changedJobTransport.calls, 2);
  } finally {
    await changedJobFixture.cleanup();
  }
});

test('W10 B5 instructionは幅数値を焼き込まず入力fieldを参照する', () => {
  const source = sourceValue(14);
  const sourceBytes = formalBytes(source);
  const built = buildPresentationCaptionGateB5BoundRequestV002({
    sourceBytes,
    config: {
      expectedSourceSha256: sha256(sourceBytes),
      expectedCharacterCount: 2,
      expectedContainerCount: 1,
      expectedBoundaryCandidateCount: 2,
      modelId: 'gemini-3.6-flash',
    },
    maxOutputTokens: 123,
  });
  const instruction = built.generateRequest.systemInstruction.parts[0].text;
  assert.equal(instruction.includes('14'), false);
  assert.equal(instruction.includes('36'), false);
  assert.match(instruction, /上限/u);
});

test('W11 B3の仕事本文だけが意味指示でB5は本文を複製しない', async () => {
  const source = sourceValue(14);
  const sourceBytes = formalBytes(source);
  const built = buildPresentationCaptionGateB5BoundRequestV002({
    sourceBytes,
    config: {
      expectedSourceSha256: sha256(sourceBytes),
      expectedCharacterCount: 2,
      expectedContainerCount: 1,
      expectedBoundaryCandidateCount: 2,
      modelId: 'gemini-3.6-flash',
    },
    maxOutputTokens: 123,
  });
  assert.equal(
    built.generateRequest.systemInstruction.parts[0].text
      .includes(source.taskDescription),
    false,
  );
  assert.equal(
    built.generateRequest.contents[0].parts[0].text,
    sourceBytes.toString('utf8'),
  );
  const fixture = await createFixture();
  const transport = fakeCountTokens();
  try {
    const result = await executePresentationCaptionGateB5InitialV002({
      jobPath: fixture.jobPath,
      apiKey: 'fixture-secret',
      fetchImplementation: transport.fetch,
      inspectUpstreamProjection: async () => ({
        kind: 'trusted-projection',
        expectedBeforeCanonicalSha256: '7'.repeat(64),
      }),
      currentDate: new Date('2026-07-29T01:00:00.000Z'),
    });
    assert.equal(result.status, 'ready-for-b6');
    assert.equal(transport.calls, 2);
    const manifest = JSON.parse(
      await readFile(rel(result.manifestBinding.path)),
    );
    assert.deepEqual(Object.keys(manifest), [
      'schemaVersion',
      'status',
      'stage',
      'executionStartedAt',
      'jobBinding',
      'sourceBinding',
      'requestBuilderBinding',
      'upstreamProjection',
      'officialVerification',
      'residualRiskAcceptance',
      'requestBindings',
      'tokenDiagnosis',
      'spendingAuthorization',
      'transport',
      'cost',
      'checks',
      'artifacts',
      'nextStage',
    ]);
    assert.equal(manifest.artifacts.length, 12);
  } finally {
    await fixture.cleanup();
  }
});

test('W12 B5は実物の上流監視を保ったまま監視外で一時作業する', async () => {
  const fixture = await createFixture({useRealUpstreamProjection: true});
  const transport = fakeCountTokens();
  try {
    const result = await executePresentationCaptionGateB5InitialV002({
      jobPath: fixture.jobPath,
      apiKey: 'fixture-secret',
      fetchImplementation: transport.fetch,
      currentDate: new Date('2026-07-29T01:00:00.000Z'),
    });
    assert.equal(result.status, 'ready-for-b6');
    assert.equal(result.countTokensCalls, 2);
    assert.equal(transport.calls, 2);
    assert.equal(
      await readFile(rel(result.manifestBinding.path)).then(() => true),
      true,
    );
    await assert.rejects(
      readFile(rel(`${fixture.workDirectory}/b5-manifest-v002.json`)),
      {code: 'ENOENT'},
    );
  } finally {
    await fixture.cleanup();
  }
});

test('W13 B5は既存の他者作業directoryを削除せず通信前に止まる', async () => {
  const fixture = await createFixture();
  const markerPath = `${fixture.workDirectory}/owner-marker.txt`;
  const markerBytes = Buffer.from('not-owned-by-this-run\n', 'utf8');
  const transport = fakeCountTokens();
  try {
    await mkdir(rel(fixture.workDirectory), {recursive: true});
    await writeFile(rel(markerPath), markerBytes);
    const result = await executePresentationCaptionGateB5InitialV002({
      jobPath: fixture.jobPath,
      apiKey: 'fixture-secret',
      fetchImplementation: transport.fetch,
      inspectUpstreamProjection: async () => ({
        kind: 'trusted-projection',
        expectedBeforeCanonicalSha256: '7'.repeat(64),
      }),
      currentDate: new Date('2026-07-29T01:00:00.000Z'),
    });
    assert.equal(result.status, 'fatal');
    assert.equal(result.countTokensCalls, 0);
    assert.equal(transport.calls, 0);
    assert.deepEqual(await readFile(rel(markerPath)), markerBytes);
    await assert.rejects(
      readFile(rel(`${fixture.outputDirectory}/b5-manifest-v002.json`)),
      {code: 'ENOENT'},
    );
  } finally {
    await fixture.cleanup();
  }
});
