import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import test from 'node:test';
import {fileURLToPath} from 'node:url';

import {
  DISTANT_CONNECTION_COMPARISON_B6_RUN_MANIFEST_SCHEMA_V001,
  DISTANT_CONNECTION_COMPARISON_CANDIDATE_RESPONSE_SCHEMA_V001,
  DistantConnectionComparisonB6ResultErrorV001,
  assertDistantConnectionComparisonB6ArtifactSetV001,
  assertDistantConnectionComparisonB6PreflightV001,
  assertDistantConnectionComparisonCandidateResponseV001,
  buildDistantConnectionComparisonB6ResultArtifactsV001,
  decodeDistantConnectionComparisonB6RunManifestV001,
  decodeDistantConnectionComparisonCandidateResponseV001,
  type BuildDistantConnectionComparisonB6ResultInputV001
} from '../src/distant-connection-comparison-luna-b6-result-v001.js';
import {
  decodeDistantConnectionComparisonB5LocalManifestV001,
  decodeDistantConnectionComparisonIndexedModelInputV001,
  deriveDistantConnectionComparisonCandidateIdV001,
  type DistantConnectionComparisonIndexResponseV001
} from '../src/distant-connection-comparison-luna-b5-local-v001.js';
import {
  buildDistantConnectionComparisonTokenCountMeasurementV001,
  serializeDistantConnectionComparisonTokenCountMeasurementV001
} from '../src/distant-connection-comparison-luna-b5-token-count-v001.js';
import {
  DISTANT_CONNECTION_COMPARISON_INDEX_RESPONSE_SCHEMA_V001,
  decodeDistantConnectionComparisonSourcePackageV001
} from '../src/distant-connection-comparison-source-package-v001.js';

const workspaceRoot = fileURLToPath(new URL('../../', import.meta.url));
const inputRoot =
  'evals/clip_composition/outputs/work-distant-connection-comparison-input-o8rZAhARXAc-v001';
const tokenRoot =
  'evals/clip_composition/outputs/'
  + 'work-distant-connection-comparison-luna-b5-token-count-o8rZAhARXAc-v001';
const sourcePackagePath = `${inputRoot}/source-package-v001.json`;
const indexedModelInputPath = `${inputRoot}/indexed-model-input-v001.json`;
const exactRequestPath = `${inputRoot}/exact-request-v001.json`;
const b5LocalManifestPath = `${inputRoot}/b5-local-manifest-v001.json`;
const tokenCountRequestPath = `${tokenRoot}/attempt-0001/input-token-count-request-v001.json`;
const tokenCountRawResponsePath =
  `${tokenRoot}/attempt-0001/input-token-count-raw-response-v001.json`;
const tokenCountMeasurementPath = `${tokenRoot}/input-token-count-measurement-v001.json`;
const priceSnapshotPath =
  'evals/clip_composition/reports/presentation/provider-research/'
  + 'openai-gpt-5-6-luna-official-snapshot-20260816-v001.json';
const expectedPriceSnapshotSha256 =
  '9d53b52a6e1726bcbf715137a32d6819d668c4023e89ddf2d81edaec7f5166d7';
const rawResponsePath = 'outputs/test-comparison-b6/attempt-0001/raw-response-v001.json';
const candidateResponsePath = 'outputs/test-comparison-b6/candidate-response-v001.json';

type Fixture = {
  input: BuildDistantConnectionComparisonB6ResultInputV001;
  indexResponse: DistantConnectionComparisonIndexResponseV001;
  anchorIndex: number;
  anchorUtteranceIndex: number;
};

function sha256(bytes: Uint8Array): string {
  return createHash('sha256').update(bytes).digest('hex');
}

function providerRaw(
  indexResponse: DistantConnectionComparisonIndexResponseV001,
  overrides: Record<string, unknown> = {}
): Buffer {
  const value = {
    object: 'response',
    id: 'resp_comparison_test_v001',
    model: 'gpt-5.6-luna',
    status: 'completed',
    error: null,
    incomplete_details: null,
    output: [{
      type: 'message',
      status: 'completed',
      role: 'assistant',
      content: [{type: 'output_text', text: JSON.stringify(indexResponse)}]
    }],
    usage: {
      input_tokens: 97_818,
      input_tokens_details: {cached_tokens: 0, cache_write_tokens: 97_818},
      output_tokens: 1_000,
      output_tokens_details: {reasoning_tokens: 600},
      total_tokens: 98_818
    },
    ...overrides
  };
  return Buffer.from(`${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

let fixturePromise: Promise<Fixture> | undefined;

async function fixture(): Promise<Fixture> {
  fixturePromise ??= (async () => {
    const [
      sourcePackageBytes,
      indexedModelInputBytes,
      exactRequestBytes,
      b5LocalManifestBytes,
      tokenCountRequestBytes,
      tokenCountRawResponseBytes,
      tokenCountMeasurementBytes,
      priceSnapshotBytes
    ] = await Promise.all([
      readFile(`${workspaceRoot}/${sourcePackagePath}`),
      readFile(`${workspaceRoot}/${indexedModelInputPath}`),
      readFile(`${workspaceRoot}/${exactRequestPath}`),
      readFile(`${workspaceRoot}/${b5LocalManifestPath}`),
      readFile(`${workspaceRoot}/${tokenCountRequestPath}`),
      readFile(`${workspaceRoot}/${tokenCountRawResponsePath}`),
      readFile(`${workspaceRoot}/${tokenCountMeasurementPath}`),
      readFile(`${workspaceRoot}/${priceSnapshotPath}`)
    ]);
    const indexedModelInput = decodeDistantConnectionComparisonIndexedModelInputV001(
      indexedModelInputBytes
    );
    const anchor = indexedModelInput.anchors.find(
      (item) => item.utteranceIndex < indexedModelInput.utteranceCount - 1
    );
    assert.ok(anchor);
    const indexResponse: DistantConnectionComparisonIndexResponseV001 = {
      schemaVersion: DISTANT_CONNECTION_COMPARISON_INDEX_RESPONSE_SCHEMA_V001,
      candidates: [{
        anchorIndex: anchor.anchorIndex,
        firstPartUtteranceIndexes: [anchor.utteranceIndex],
        secondPartUtteranceIndexes: [anchor.utteranceIndex + 1],
        addedUnderstanding: '前半の具体的な判断が後半の結果として回収される。',
        direction: 'future'
      }]
    };
    return {
      indexResponse,
      anchorIndex: anchor.anchorIndex,
      anchorUtteranceIndex: anchor.utteranceIndex,
      input: {
        sourcePackagePath,
        sourcePackageBytes,
        indexedModelInputPath,
        indexedModelInputBytes,
        exactRequestPath,
        exactRequestBytes,
        b5LocalManifestPath,
        b5LocalManifestBytes,
        tokenCountRequestPath,
        tokenCountRequestBytes,
        tokenCountRawResponsePath,
        tokenCountRawResponseBytes,
        tokenCountMeasurementPath,
        tokenCountMeasurementBytes,
        priceSnapshotPath,
        priceSnapshotBytes,
        expectedPriceSnapshotSha256,
        rawResponsePath,
        rawResponseBytes: providerRaw(indexResponse),
        candidateResponsePath,
        maximumNanoUsd: 1_000_000_000
      }
    };
  })();
  return fixturePromise;
}

function expectCode(
  code: string,
  action: () => unknown,
  causeCode?: string
): void {
  assert.throws(action, (error: unknown) => {
    if (!(error instanceof DistantConnectionComparisonB6ResultErrorV001)
      || error.code !== code) return false;
    return causeCode === undefined
      || (error.cause as {code?: string} | undefined)?.code === causeCode;
  });
}

function rawWithIndexResponse(
  bytes: Uint8Array,
  response: DistantConnectionComparisonIndexResponseV001
): Buffer {
  const raw = JSON.parse(Buffer.from(bytes).toString('utf8'));
  raw.output[0].content[0].text = JSON.stringify(response);
  return Buffer.from(`${JSON.stringify(raw, null, 2)}\n`, 'utf8');
}

test('固定B5・token計測を再検証しindexだけからcommon utterance正式候補を作る', async () => {
  const {input, anchorIndex, anchorUtteranceIndex} = await fixture();
  assert.doesNotThrow(() => assertDistantConnectionComparisonB6PreflightV001(input));
  const sourcePackage = decodeDistantConnectionComparisonSourcePackageV001(
    input.sourcePackageBytes
  );
  const artifacts = buildDistantConnectionComparisonB6ResultArtifactsV001(input);
  const candidate = artifacts.candidateResponse.candidates[0]!;
  assert.equal(
    artifacts.candidateResponse.schemaVersion,
    DISTANT_CONNECTION_COMPARISON_CANDIDATE_RESPONSE_SCHEMA_V001
  );
  assert.equal(artifacts.candidateResponse.sourceVideoId, 'o8rZAhARXAc');
  assert.equal(candidate.anchorId, sourcePackage.anchors[anchorIndex]!.anchorId);
  assert.deepEqual(candidate.firstPartUtteranceIds, [
    sourcePackage.utterances[anchorUtteranceIndex]!.utteranceId
  ]);
  assert.deepEqual(candidate.secondPartUtteranceIds, [
    sourcePackage.utterances[anchorUtteranceIndex + 1]!.utteranceId
  ]);
  assert.equal('firstPartSemanticUtteranceIds' in candidate, false);
  assert.match(candidate.candidateId, /^candidate-[0-9a-f]{64}$/u);
  assert.equal(
    artifacts.manifest.schemaVersion,
    DISTANT_CONNECTION_COMPARISON_B6_RUN_MANIFEST_SCHEMA_V001
  );
  assert.equal(artifacts.manifest.providerResponse.id, 'resp_comparison_test_v001');
  assert.equal(artifacts.manifest.usage.inputTokens, 97_818);
  assert.equal(artifacts.manifest.cost.totalNanoUsd, 25_654_500);
  assert.equal(artifacts.manifest.cost.totalUsd, 0.0256545);
  assert.equal(artifacts.manifest.cost.longContextPricingApplies, false);
  assert.equal(
    artifacts.manifest.tokenCountMeasurementBinding.fileSha256,
    sha256(input.tokenCountMeasurementBytes)
  );
  assert.deepEqual(artifacts.manifest.validation, {
    decision: 'passed',
    tokenCountMeasurementRevalidated: true,
    indexReferenceValidation: 'passed',
    deterministicFormalIdResolution: 'passed',
    candidateCount: 1
  });
});

test('source・request・token計測のpath/SHA差をprovider解析前に拒否する', async () => {
  const {input} = await fixture();
  expectCode('B6_BINDING_MISMATCH', () => (
    buildDistantConnectionComparisonB6ResultArtifactsV001({
      ...input,
      sourcePackagePath: 'different/source-package-v001.json'
    })
  ));
  const changedRequest = Buffer.from(input.exactRequestBytes);
  changedRequest[changedRequest.length - 2] ^= 1;
  expectCode('B6_BINDING_MISMATCH', () => (
    buildDistantConnectionComparisonB6ResultArtifactsV001({
      ...input,
      exactRequestBytes: changedRequest
    })
  ));
  const changedMeasurement = Buffer.from(input.tokenCountMeasurementBytes);
  changedMeasurement[changedMeasurement.length - 2] ^= 1;
  expectCode('B6_TOKEN_MEASUREMENT_INVALID', () => (
    buildDistantConnectionComparisonB6ResultArtifactsV001({
      ...input,
      tokenCountMeasurementBytes: changedMeasurement
    })
  ));
});

test('incomplete・refusal・複数output_textを正式候補化しない', async () => {
  const {input} = await fixture();
  const raw = JSON.parse(Buffer.from(input.rawResponseBytes).toString('utf8'));
  expectCode('B6_RESPONSE_INCOMPLETE', () => (
    buildDistantConnectionComparisonB6ResultArtifactsV001({
      ...input,
      rawResponseBytes: Buffer.from(JSON.stringify({...raw, status: 'incomplete'}))
    })
  ));
  const refusal = structuredClone(raw);
  refusal.output[0].content = [{type: 'refusal', refusal: 'declined'}];
  expectCode('B6_REFUSAL', () => (
    buildDistantConnectionComparisonB6ResultArtifactsV001({
      ...input,
      rawResponseBytes: Buffer.from(JSON.stringify(refusal))
    })
  ));
  const duplicateText = structuredClone(raw);
  duplicateText.output[0].content.push(structuredClone(duplicateText.output[0].content[0]));
  expectCode('B6_RAW_RESPONSE_INVALID', () => (
    buildDistantConnectionComparisonB6ResultArtifactsV001({
      ...input,
      rawResponseBytes: Buffer.from(JSON.stringify(duplicateText))
    })
  ));
});

test('provider objectとoutput item種類を固定しreasoning+messageだけを受理する', async () => {
  const {input} = await fixture();
  const raw = JSON.parse(Buffer.from(input.rawResponseBytes).toString('utf8'));
  const wrongObject = {...structuredClone(raw), object: 'response.invalid'};
  expectCode('B6_RAW_RESPONSE_INVALID', () => (
    buildDistantConnectionComparisonB6ResultArtifactsV001({
      ...input,
      rawResponseBytes: Buffer.from(JSON.stringify(wrongObject))
    })
  ));
  const missingObject = structuredClone(raw);
  delete missingObject.object;
  expectCode('B6_RAW_RESPONSE_INVALID', () => (
    buildDistantConnectionComparisonB6ResultArtifactsV001({
      ...input,
      rawResponseBytes: Buffer.from(JSON.stringify(missingObject))
    })
  ));
  for (const item of [
    {type: 'function_call', name: 'unexpected', arguments: '{}'},
    {type: 'unknown_provider_item'}
  ]) {
    const disallowed = structuredClone(raw);
    disallowed.output.unshift(item);
    expectCode('B6_RAW_RESPONSE_INVALID', () => (
      buildDistantConnectionComparisonB6ResultArtifactsV001({
        ...input,
        rawResponseBytes: Buffer.from(JSON.stringify(disallowed))
      })
    ));
  }
  const withReasoning = structuredClone(raw);
  withReasoning.output.unshift({type: 'reasoning', id: 'rs_test', summary: []});
  assert.doesNotThrow(() => buildDistantConnectionComparisonB6ResultArtifactsV001({
    ...input,
    rawResponseBytes: Buffer.from(`${JSON.stringify(withReasoning, null, 2)}\n`, 'utf8')
  }));
});

test('範囲外・重複・方向不一致のindexを決定解決前にfail-closedする', async () => {
  const {input, indexResponse} = await fixture();
  const outside = structuredClone(indexResponse);
  outside.candidates[0]!.anchorIndex = 741;
  expectCode('B6_INDEX_RESPONSE_INVALID', () => (
    buildDistantConnectionComparisonB6ResultArtifactsV001({
      ...input,
      rawResponseBytes: rawWithIndexResponse(input.rawResponseBytes, outside)
    })
  ), 'INDEX_OUT_OF_RANGE');
  const duplicate = structuredClone(indexResponse);
  duplicate.candidates[0]!.firstPartUtteranceIndexes = [0, 0];
  expectCode('B6_INDEX_RESPONSE_INVALID', () => (
    buildDistantConnectionComparisonB6ResultArtifactsV001({
      ...input,
      rawResponseBytes: rawWithIndexResponse(input.rawResponseBytes, duplicate)
    })
  ), 'INDEX_DUPLICATE');
  const direction = structuredClone(indexResponse);
  direction.candidates[0]!.direction = 'past';
  expectCode('B6_INDEX_RESPONSE_INVALID', () => (
    buildDistantConnectionComparisonB6ResultArtifactsV001({
      ...input,
      rawResponseBytes: rawWithIndexResponse(input.rawResponseBytes, direction)
    })
  ), 'ANCHOR_DIRECTION_MISMATCH');
});

test('usageは計測済みinput token・内訳・費用上限と一致しなければ拒否する', async () => {
  const {input, indexResponse} = await fixture();
  const differentInput = providerRaw(indexResponse, {
    usage: {
      input_tokens: 97_819,
      input_tokens_details: {cached_tokens: 0, cache_write_tokens: 97_819},
      output_tokens: 1_000,
      output_tokens_details: {reasoning_tokens: 600},
      total_tokens: 98_819
    }
  });
  expectCode('B6_USAGE_INVALID', () => (
    buildDistantConnectionComparisonB6ResultArtifactsV001({
      ...input,
      rawResponseBytes: differentInput
    })
  ));
  expectCode('B6_COST_LIMIT_EXCEEDED', () => (
    buildDistantConnectionComparisonB6ResultArtifactsV001({
      ...input,
      maximumNanoUsd: 25_654_499
    })
  ));
});

test('context上限外の正式token計測成果物をpreflightで拒否する', async () => {
  const {input} = await fixture();
  const overContextRawBytes = Buffer.from(JSON.stringify({
    object: 'response.input_tokens',
    input_tokens: 1_050_001
  }, null, 2), 'utf8');
  const measurement = buildDistantConnectionComparisonTokenCountMeasurementV001({
    manifestPath: input.b5LocalManifestPath,
    manifestBytes: input.b5LocalManifestBytes,
    sourcePackageBytes: input.sourcePackageBytes,
    indexedModelInputBytes: input.indexedModelInputBytes,
    exactRequestBytes: input.exactRequestBytes,
    tokenCountRequestPath: input.tokenCountRequestPath,
    tokenCountRequestBytes: input.tokenCountRequestBytes,
    rawResponsePath: input.tokenCountRawResponsePath,
    rawResponseBytes: overContextRawBytes,
    priceSnapshotPath: input.priceSnapshotPath,
    priceSnapshotBytes: input.priceSnapshotBytes,
    expectedPriceSnapshotSha256: input.expectedPriceSnapshotSha256
  });
  const manifest = decodeDistantConnectionComparisonB5LocalManifestV001(
    input.b5LocalManifestBytes
  );
  const measurementBytes = serializeDistantConnectionComparisonTokenCountMeasurementV001(
    measurement,
    manifest
  );
  expectCode('B6_TOKEN_MEASUREMENT_INVALID', () => (
    assertDistantConnectionComparisonB6PreflightV001({
      ...input,
      tokenCountRawResponseBytes: overContextRawBytes,
      tokenCountMeasurementBytes: measurementBytes
    })
  ));
});

test('schemaが許す0件返答も正式な0件成果物として決定的に固定する', async () => {
  const {input, indexResponse} = await fixture();
  const empty = {...structuredClone(indexResponse), candidates: []};
  const artifacts = buildDistantConnectionComparisonB6ResultArtifactsV001({
    ...input,
    rawResponseBytes: rawWithIndexResponse(input.rawResponseBytes, empty)
  });
  assert.deepEqual(artifacts.candidateResponse.candidates, []);
  assert.equal(artifacts.manifest.validation.candidateCount, 0);
});

test('formal IDを再計算してもdirection・anchor所属不一致の候補成果物を拒否する', async () => {
  const {input, indexResponse} = await fixture();
  const artifacts = buildDistantConnectionComparisonB6ResultArtifactsV001(input);
  const sourcePackage = decodeDistantConnectionComparisonSourcePackageV001(
    input.sourcePackageBytes
  );
  const tampered = structuredClone(artifacts.candidateResponse);
  tampered.candidates[0]!.direction = 'past';
  const tamperedIndex = {
    ...structuredClone(indexResponse.candidates[0]!),
    direction: 'past' as const
  };
  tampered.candidates[0]!.candidateId = deriveDistantConnectionComparisonCandidateIdV001(
    sourcePackage.sourceVideoId,
    sha256(input.sourcePackageBytes),
    tamperedIndex
  );
  expectCode('B6_CANDIDATE_RESPONSE_INVALID', () => (
    assertDistantConnectionComparisonCandidateResponseV001(
      tampered,
      input.sourcePackagePath,
      input.sourcePackageBytes,
      input.indexedModelInputPath,
      input.indexedModelInputBytes,
      input.rawResponsePath,
      input.rawResponseBytes
    )
  ));
});

test('候補成果物の説明または順序をraw応答から独立改変できない', async () => {
  const {input} = await fixture();
  const artifacts = buildDistantConnectionComparisonB6ResultArtifactsV001(input);
  const changedReason = structuredClone(artifacts.candidateResponse);
  changedReason.candidates[0]!.addedUnderstanding = 'rawには存在しない説明';
  expectCode('B6_CANDIDATE_RESPONSE_INVALID', () => (
    assertDistantConnectionComparisonCandidateResponseV001(
      changedReason,
      input.sourcePackagePath,
      input.sourcePackageBytes,
      input.indexedModelInputPath,
      input.indexedModelInputBytes,
      input.rawResponsePath,
      input.rawResponseBytes
    )
  ));
  const changedRawBinding = structuredClone(artifacts.candidateResponse);
  changedRawBinding.rawResponseBinding.fileSha256 = '0'.repeat(64);
  expectCode('B6_CANDIDATE_RESPONSE_INVALID', () => (
    assertDistantConnectionComparisonCandidateResponseV001(
      changedRawBinding,
      input.sourcePackagePath,
      input.sourcePackageBytes,
      input.indexedModelInputPath,
      input.indexedModelInputBytes,
      input.rawResponsePath,
      input.rawResponseBytes
    )
  ));
});

test('同一保存入力から同一formal byteを作り全artifactを再構築検証できる', async () => {
  const {input} = await fixture();
  const first = buildDistantConnectionComparisonB6ResultArtifactsV001(input);
  const second = buildDistantConnectionComparisonB6ResultArtifactsV001(input);
  assert.deepEqual(first.candidateResponseBytes, second.candidateResponseBytes);
  assert.deepEqual(first.manifestBytes, second.manifestBytes);
  assert.deepEqual(
    decodeDistantConnectionComparisonCandidateResponseV001(
      first.candidateResponseBytes,
      input.sourcePackagePath,
      input.sourcePackageBytes,
      input.indexedModelInputPath,
      input.indexedModelInputBytes,
      input.rawResponsePath,
      input.rawResponseBytes
    ),
    first.candidateResponse
  );
  assert.deepEqual(
    decodeDistantConnectionComparisonB6RunManifestV001(first.manifestBytes),
    first.manifest
  );
  assert.doesNotThrow(() => assertDistantConnectionComparisonB6ArtifactSetV001({
    ...input,
    candidateResponseBytes: first.candidateResponseBytes,
    manifestBytes: first.manifestBytes
  }));
});

test('候補成果物またはmanifestの1byte差をartifact-set検査で拒否する', async () => {
  const {input} = await fixture();
  const artifacts = buildDistantConnectionComparisonB6ResultArtifactsV001(input);
  const changedCandidate = Buffer.from(artifacts.candidateResponseBytes);
  changedCandidate[changedCandidate.length - 2] ^= 1;
  expectCode('B6_CANDIDATE_RESPONSE_INVALID', () => (
    assertDistantConnectionComparisonB6ArtifactSetV001({
      ...input,
      candidateResponseBytes: changedCandidate,
      manifestBytes: artifacts.manifestBytes
    })
  ));
  const changedManifest = Buffer.from(artifacts.manifestBytes);
  changedManifest[changedManifest.length - 2] ^= 1;
  expectCode('B6_MANIFEST_INVALID', () => (
    assertDistantConnectionComparisonB6ArtifactSetV001({
      ...input,
      candidateResponseBytes: artifacts.candidateResponseBytes,
      manifestBytes: changedManifest
    })
  ));
});
