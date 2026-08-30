import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';

import {
  DISTANT_CONNECTION_LUNA_B6_RUN_MANIFEST_SCHEMA_V003,
  DistantConnectionLunaB6ResultErrorV003,
  buildDistantConnectionLunaB6ResultArtifactsV003,
  type BuildDistantConnectionLunaB6ResultInputV003
} from '../src/distant-connection-luna-b6-result-v003.js';
import {
  DISTANT_CONNECTION_LUNA_REQUEST_SETTINGS_V003,
  buildDistantConnectionLunaB5LocalArtifactsFromBytesV003
} from '../src/distant-connection-luna-b5-local-v003.js';
import {
  DISTANT_CONNECTION_LUNA_INDEXED_MODEL_INPUT_SCHEMA_V001,
  DISTANT_CONNECTION_LUNA_INDEX_RESPONSE_SCHEMA_V001,
  buildDistantConnectionLunaIndexedModelInputV001,
  serializeDistantConnectionLunaIndexedModelInputV001,
  type DistantConnectionLunaIndexResponseV001,
  type DistantConnectionLunaIndexedModelInputV001
} from '../src/distant-connection-luna-index-reference-v001.js';

const workspaceRoot = path.resolve(import.meta.dirname, '..', '..');
const sourcePackagePath =
  'evals/clip_composition/outputs/'
  + 'work-distant-connection-luna-source-package-op-ed-rejection-feedback-ymUsGrT6EaA-v002/'
  + 'source-package-v002.json';
const indexedModelInputPath = 'outputs/test-luna-indexed-model-input-v001.json';
const requestPath = 'outputs/test-luna-exact-request-v003.json';
const b5LocalManifestPath = 'outputs/test-luna-b5-local-manifest-v003.json';
const rawResponsePath = 'outputs/test-luna-b6-raw-response-v003.json';
const candidateResponsePath = 'outputs/test-luna-candidate-response-v001.json';
const priceSnapshotPath =
  'evals/clip_composition/reports/presentation/provider-research/'
  + 'openai-gpt-5-6-luna-official-snapshot-20260816-v001.json';

type Fixture = {
  input: BuildDistantConnectionLunaB6ResultInputV003;
  indexedModelInput: DistantConnectionLunaIndexedModelInputV001;
  indexResponse: DistantConnectionLunaIndexResponseV001;
};

function sha256(bytes: Uint8Array): string {
  return createHash('sha256').update(bytes).digest('hex');
}

function formalBinding(pathValue: string, schemaVersion: string, bytes: Uint8Array) {
  return {path: pathValue, schemaVersion, fileSha256: sha256(bytes)};
}

function providerRaw(indexResponse: DistantConnectionLunaIndexResponseV001): Buffer {
  const value = {
    id: 'resp_test_v003',
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
      input_tokens: 900_000,
      input_tokens_details: {cached_tokens: 800_000, cache_write_tokens: 0},
      output_tokens: 1_000,
      output_tokens_details: {reasoning_tokens: 600},
      total_tokens: 901_000
    }
  };
  return Buffer.from(`${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

let fixturePromise: Promise<Fixture> | undefined;

async function fixture(): Promise<Fixture> {
  fixturePromise ??= (async () => {
    const [sourcePackageBytes, priceSnapshotBytes] = await Promise.all([
      readFile(path.join(workspaceRoot, sourcePackagePath)),
      readFile(path.join(workspaceRoot, priceSnapshotPath))
    ]);
    const indexedModelInput = buildDistantConnectionLunaIndexedModelInputV001({
      sourcePackagePath,
      sourcePackageBytes
    });
    const indexedModelInputBytes = serializeDistantConnectionLunaIndexedModelInputV001(
      indexedModelInput
    );
    const sourcePackageBinding = formalBinding(
      sourcePackagePath,
      'distant-connection-luna-source-package-v002',
      sourcePackageBytes
    );
    const indexedModelInputBinding = formalBinding(
      indexedModelInputPath,
      DISTANT_CONNECTION_LUNA_INDEXED_MODEL_INPUT_SCHEMA_V001,
      indexedModelInputBytes
    );
    const b5 = buildDistantConnectionLunaB5LocalArtifactsFromBytesV003({
      sourcePackageBinding,
      sourcePackageBytes,
      indexedModelInputBinding,
      indexedModelInputBytes,
      requestPath,
      requestSettings: DISTANT_CONNECTION_LUNA_REQUEST_SETTINGS_V003
    });
    const anchor = indexedModelInput.anchors.find(
      (item) => item.utteranceIndex < indexedModelInput.utteranceCount - 1
    );
    assert.ok(anchor);
    const indexResponse: DistantConnectionLunaIndexResponseV001 = {
      schemaVersion: DISTANT_CONNECTION_LUNA_INDEX_RESPONSE_SCHEMA_V001,
      candidates: [{
        anchorIndex: anchor.anchorIndex,
        firstPartUtteranceIndexes: [anchor.utteranceIndex],
        secondPartUtteranceIndexes: [anchor.utteranceIndex + 1],
        addedUnderstanding: '前半によって後半の意味が増える。',
        direction: 'future'
      }]
    };
    const rawResponseBytes = providerRaw(indexResponse);
    return {
      indexedModelInput,
      indexResponse,
      input: {
        sourcePackagePath,
        sourcePackageBytes,
        indexedModelInputPath,
        indexedModelInputBytes,
        requestPath,
        requestBytes: b5.requestBytes,
        b5LocalManifestPath,
        b5LocalManifestBytes: b5.manifestBytes,
        rawResponsePath,
        rawResponseBytes,
        candidateResponsePath,
        priceSnapshotPath,
        priceSnapshotBytes,
        maximumNanoUsd: 1_000_000_000
      }
    };
  })();
  return fixturePromise;
}

function rawWithResponse(
  rawResponseBytes: Uint8Array,
  response: DistantConnectionLunaIndexResponseV001
): Buffer {
  const raw = JSON.parse(Buffer.from(rawResponseBytes).toString('utf8'));
  raw.output[0].content[0].text = JSON.stringify(response);
  return Buffer.from(`${JSON.stringify(raw, null, 2)}\n`, 'utf8');
}

function expectCode(
  code: string,
  action: () => unknown,
  causeCode?: string
): void {
  assert.throws(action, (error: unknown) => {
    if (!(error instanceof DistantConnectionLunaB6ResultErrorV003)
      || error.code !== code) return false;
    return causeCode === undefined || (error.cause as {code?: string} | undefined)?.code === causeCode;
  });
}

test('0-based返答をsource v2へ決定解決し、全入力SHAと実費をmanifestへ固定する', async () => {
  const {input, indexedModelInput, indexResponse} = await fixture();
  const artifacts = buildDistantConnectionLunaB6ResultArtifactsV003(input);
  const numeric = indexResponse.candidates[0]!;
  const formal = artifacts.response.candidates[0]!;
  assert.equal(artifacts.manifest.schemaVersion,
    DISTANT_CONNECTION_LUNA_B6_RUN_MANIFEST_SCHEMA_V003);
  assert.equal(artifacts.response.schemaVersion, 'distant-connection-luna-response-v001');
  assert.equal(formal.anchorId, `comment-anchor-${String(
    indexedModelInput.anchors[numeric.anchorIndex]!.utteranceIndex + 1
  ).padStart(6, '0')}`);
  assert.deepEqual(formal.firstPartSemanticUtteranceIds, ['semantic-utterance-000001']);
  assert.deepEqual(formal.secondPartSemanticUtteranceIds, ['semantic-utterance-000002']);
  assert.match(formal.candidateId, /^candidate-[0-9a-f]{64}$/u);
  assert.deepEqual(artifacts.manifest.sourcePackageBinding, formalBinding(
    input.sourcePackagePath,
    'distant-connection-luna-source-package-v002',
    input.sourcePackageBytes
  ));
  assert.deepEqual(artifacts.manifest.indexedModelInputBinding, formalBinding(
    input.indexedModelInputPath,
    DISTANT_CONNECTION_LUNA_INDEXED_MODEL_INPUT_SCHEMA_V001,
    input.indexedModelInputBytes
  ));
  assert.equal(artifacts.manifest.requestBinding.fileSha256, sha256(input.requestBytes));
  assert.equal(artifacts.manifest.b5LocalManifestBinding.fileSha256,
    sha256(input.b5LocalManifestBytes));
  assert.equal(artifacts.manifest.rawResponseBinding.fileSha256,
    sha256(input.rawResponseBytes));
  assert.equal(artifacts.manifest.candidateResponseBinding.fileSha256,
    sha256(artifacts.responseBytes));
  assert.equal(artifacts.manifest.cost.priceSnapshotBinding.fileSha256,
    sha256(input.priceSnapshotBytes));
  assert.equal(artifacts.manifest.cost.totalUsd, 0.0738);
  assert.deepEqual(artifacts.manifest.validation, {
    decision: 'passed',
    indexResolution: 'passed',
    candidateCount: 1
  });
});

test('source・indexed input・requestのbyteまたはpath差を候補化前に拒否する', async () => {
  const {input} = await fixture();
  expectCode('B6_BINDING_MISMATCH', () => buildDistantConnectionLunaB6ResultArtifactsV003({
    ...input,
    sourcePackagePath: 'different/source-package-v002.json'
  }));
  expectCode('B6_BINDING_MISMATCH', () => buildDistantConnectionLunaB6ResultArtifactsV003({
    ...input,
    indexedModelInputBytes: Buffer.concat([
      Buffer.from(input.indexedModelInputBytes),
      Buffer.from('changed')
    ])
  }));
  expectCode('B6_BINDING_MISMATCH', () => buildDistantConnectionLunaB6ResultArtifactsV003({
    ...input,
    requestBytes: Buffer.concat([Buffer.from(input.requestBytes), Buffer.from('changed')])
  }));
  expectCode('B6_BINDING_MISMATCH', () => buildDistantConnectionLunaB6ResultArtifactsV003({
    ...input,
    rawResponsePath: '../outside/raw-response-v003.json'
  }));
});

test('範囲外・非整数・重複・方向不一致のindex返答をfail-closedで拒否する', async () => {
  const {input, indexedModelInput, indexResponse} = await fixture();
  const outOfRangeAnchor = structuredClone(indexResponse);
  outOfRangeAnchor.candidates[0]!.anchorIndex = indexedModelInput.anchorCount;
  expectCode('B6_INDEX_RESPONSE_INVALID', () => (
    buildDistantConnectionLunaB6ResultArtifactsV003({
      ...input,
      rawResponseBytes: rawWithResponse(input.rawResponseBytes, outOfRangeAnchor)
    })
  ), 'INDEX_OUT_OF_RANGE');

  const fractional = structuredClone(indexResponse);
  fractional.candidates[0]!.firstPartUtteranceIndexes = [0.5];
  expectCode('B6_INDEX_RESPONSE_INVALID', () => (
    buildDistantConnectionLunaB6ResultArtifactsV003({
      ...input,
      rawResponseBytes: rawWithResponse(input.rawResponseBytes, fractional)
    })
  ), 'INDEX_NOT_INTEGER');

  const duplicate = structuredClone(indexResponse);
  duplicate.candidates[0]!.firstPartUtteranceIndexes = [0, 0];
  expectCode('B6_INDEX_RESPONSE_INVALID', () => (
    buildDistantConnectionLunaB6ResultArtifactsV003({
      ...input,
      rawResponseBytes: rawWithResponse(input.rawResponseBytes, duplicate)
    })
  ), 'INDEX_DUPLICATE');

  const wrongDirection = structuredClone(indexResponse);
  wrongDirection.candidates[0]!.direction = 'past';
  expectCode('B6_INDEX_RESPONSE_INVALID', () => (
    buildDistantConnectionLunaB6ResultArtifactsV003({
      ...input,
      rawResponseBytes: rawWithResponse(input.rawResponseBytes, wrongDirection)
    })
  ), 'ANCHOR_DIRECTION_MISMATCH');
});

test('同一参照を説明文だけ変えた重複候補も正式候補にしない', async () => {
  const {input, indexResponse} = await fixture();
  const repeated = structuredClone(indexResponse);
  repeated.candidates.push({
    ...structuredClone(repeated.candidates[0]!),
    addedUnderstanding: '説明文だけを変えた同一参照。'
  });
  expectCode('B6_INDEX_RESPONSE_INVALID', () => (
    buildDistantConnectionLunaB6ResultArtifactsV003({
      ...input,
      rawResponseBytes: rawWithResponse(input.rawResponseBytes, repeated)
    })
  ), 'CANDIDATE_REFERENCE_DUPLICATE');
});

test('incomplete・refusal・費用上限超過は正式候補byteを返さない', async () => {
  const {input} = await fixture();
  const raw = JSON.parse(Buffer.from(input.rawResponseBytes).toString('utf8'));
  expectCode('B6_RESPONSE_INCOMPLETE', () => buildDistantConnectionLunaB6ResultArtifactsV003({
    ...input,
    rawResponseBytes: Buffer.from(JSON.stringify({...raw, status: 'incomplete'}))
  }));
  const refusal = structuredClone(raw);
  refusal.output[0].content = [{type: 'refusal', refusal: 'declined'}];
  expectCode('B6_REFUSAL', () => buildDistantConnectionLunaB6ResultArtifactsV003({
    ...input,
    rawResponseBytes: Buffer.from(JSON.stringify(refusal))
  }));
  expectCode('B6_COST_LIMIT_EXCEEDED', () => (
    buildDistantConnectionLunaB6ResultArtifactsV003({...input, maximumNanoUsd: 1})
  ));
});

test('同一保存入力から同一formal candidate byte・manifest byteを再構築する', async () => {
  const {input} = await fixture();
  const first = buildDistantConnectionLunaB6ResultArtifactsV003(input);
  const second = buildDistantConnectionLunaB6ResultArtifactsV003(input);
  assert.deepEqual(first.responseBytes, second.responseBytes);
  assert.deepEqual(first.manifestBytes, second.manifestBytes);
});
