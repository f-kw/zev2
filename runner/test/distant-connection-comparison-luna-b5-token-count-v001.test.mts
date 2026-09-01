import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import test from 'node:test';
import {fileURLToPath} from 'node:url';

import {
  assertDistantConnectionComparisonB6UsesMeasuredRequestV001,
  assertDistantConnectionComparisonTokenCountArtifactSetV001,
  buildDistantConnectionComparisonTokenCountMeasurementV001,
  buildDistantConnectionComparisonTokenCountRequestV001,
  decodeDistantConnectionComparisonTokenCountMeasurementV001,
  serializeDistantConnectionComparisonTokenCountMeasurementV001,
  serializeDistantConnectionComparisonTokenCountRequestV001,
  type BuildDistantConnectionComparisonTokenCountMeasurementInputV001,
  type DistantConnectionComparisonTokenCountErrorV001
} from '../src/distant-connection-comparison-luna-b5-token-count-v001.js';
import {
  decodeDistantConnectionComparisonB5LocalManifestV001
} from '../src/distant-connection-comparison-luna-b5-local-v001.js';

const workspaceRoot = fileURLToPath(new URL('../../', import.meta.url));
const inputRoot =
  'evals/clip_composition/outputs/work-distant-connection-comparison-input-o8rZAhARXAc-v001';
const manifestPath = `${inputRoot}/b5-local-manifest-v001.json`;
const sourcePackagePath = `${inputRoot}/source-package-v001.json`;
const indexedModelInputPath = `${inputRoot}/indexed-model-input-v001.json`;
const exactRequestPath = `${inputRoot}/exact-request-v001.json`;
const tokenCountRoot =
  'evals/clip_composition/outputs/work-distant-connection-comparison-luna-b5-token-count-o8rZAhARXAc-v001';
const tokenCountRequestPath = `${tokenCountRoot}/attempt-0001/input-token-count-request-v001.json`;
const rawResponsePath = `${tokenCountRoot}/attempt-0001/input-token-count-raw-response-v001.json`;
const priceSnapshotPath =
  'evals/clip_composition/reports/presentation/provider-research/'
  + 'openai-gpt-5-6-luna-official-snapshot-20260816-v001.json';
const expectedPriceSnapshotSha256 =
  '9d53b52a6e1726bcbf715137a32d6819d668c4023e89ddf2d81edaec7f5166d7';

type Fixture = Omit<
  BuildDistantConnectionComparisonTokenCountMeasurementInputV001,
  'rawResponseBytes'
>;

async function loadFixture(): Promise<Fixture> {
  const [manifestBytes, sourcePackageBytes, indexedModelInputBytes, exactRequestBytes,
    priceSnapshotBytes] = await Promise.all([
    readFile(`${workspaceRoot}/${manifestPath}`),
    readFile(`${workspaceRoot}/${sourcePackagePath}`),
    readFile(`${workspaceRoot}/${indexedModelInputPath}`),
    readFile(`${workspaceRoot}/${exactRequestPath}`),
    readFile(`${workspaceRoot}/${priceSnapshotPath}`)
  ]);
  const tokenCountRequest = buildDistantConnectionComparisonTokenCountRequestV001(
    {manifestBytes, sourcePackageBytes, indexedModelInputBytes, exactRequestBytes}
  );
  const exactRequest = JSON.parse(exactRequestBytes.toString('utf8'));
  const tokenCountRequestBytes = serializeDistantConnectionComparisonTokenCountRequestV001(
    tokenCountRequest,
    exactRequest
  );
  return {
    manifestPath,
    manifestBytes,
    sourcePackageBytes,
    indexedModelInputBytes,
    exactRequestBytes,
    tokenCountRequestPath,
    tokenCountRequestBytes,
    rawResponsePath,
    priceSnapshotPath,
    priceSnapshotBytes,
    expectedPriceSnapshotSha256
  };
}

function rawResponse(inputTokens: number): Buffer {
  return Buffer.from(JSON.stringify({
    object: 'response.input_tokens',
    input_tokens: inputTokens
  }, null, 2), 'utf8');
}

function expectCode(error: unknown, code: string): boolean {
  return (error as DistantConnectionComparisonTokenCountErrorV001).code === code;
}

test('固定exact requestからstoreだけを除いたtoken計測requestを決定的に作る', async () => {
  const fixture = await loadFixture();
  const exact = JSON.parse(fixture.exactRequestBytes.toString('utf8'));
  const projected = JSON.parse(fixture.tokenCountRequestBytes.toString('utf8'));
  assert.deepEqual(Object.keys(projected), ['model', 'instructions', 'input', 'reasoning', 'text']);
  assert.deepEqual(projected, {
    model: exact.model,
    instructions: exact.instructions,
    input: exact.input,
    reasoning: exact.reasoning,
    text: exact.text
  });
  assert.equal(
    createHash('sha256').update(fixture.tokenCountRequestBytes).digest('hex'),
    'edbc97f766c9ee3777c23bd421ae9a1d5461c4eb484d0ce8eecb0ffca631d081'
  );
});

test('正常rawからcontext・長文料金・最大費用を独立保存する', async () => {
  const fixture = await loadFixture();
  const measurement = buildDistantConnectionComparisonTokenCountMeasurementV001({
    ...fixture,
    rawResponseBytes: rawResponse(300_000)
  });
  assert.equal(measurement.tokenMeasurement.inputTokens, 300_000);
  assert.equal(measurement.tokenMeasurement.contextUsage.percent, 28.57142857142857);
  assert.equal(measurement.tokenMeasurement.remainingTokens, 750_000);
  assert.equal(measurement.tokenMeasurement.withinContextWindow, true);
  assert.equal(measurement.tokenMeasurement.longContextPricing.applies, true);
  assert.equal(measurement.maximumB6CostProjection.projectedInputNanoUsd, 150_000_000);
  assert.equal(
    measurement.maximumB6CostProjection.projectedMaximumOutputNanoUsd,
    230_400_000
  );
  assert.equal(measurement.maximumB6CostProjection.projectedTotalNanoUsd, 380_400_000);
  assert.equal(measurement.executionScope.candidateGenerationApiCalls, 0);
});

test('o8r実測成果物を全上流byte・raw応答・価格snapshotへ再束縛する', async () => {
  const fixture = await loadFixture();
  const [rawResponseBytes, tokenCountRequestBytes, measurementBytes, processBytes] =
    await Promise.all([
      readFile(`${workspaceRoot}/${rawResponsePath}`),
      readFile(`${workspaceRoot}/${tokenCountRequestPath}`),
      readFile(`${workspaceRoot}/${tokenCountRoot}/input-token-count-measurement-v001.json`),
      readFile(`${workspaceRoot}/${tokenCountRoot}/attempt-0001/process-observation-v001.json`)
    ]);
  const measurement = decodeDistantConnectionComparisonTokenCountMeasurementV001(
    measurementBytes,
    fixture.manifestBytes
  );
  assert.equal(measurement.tokenMeasurement.inputTokens, 97_818);
  assert.equal(measurement.tokenMeasurement.contextUsage.percent, 9.316);
  assert.equal(measurement.tokenMeasurement.remainingTokens, 952_182);
  assert.equal(measurement.tokenMeasurement.longContextPricing.applies, false);
  assert.equal(measurement.maximumB6CostProjection.projectedTotalNanoUsd, 178_054_500);
  assert.doesNotThrow(() => assertDistantConnectionComparisonTokenCountArtifactSetV001({
    ...fixture,
    tokenCountRequestBytes,
    rawResponseBytes,
    measurement
  }));
  assert.doesNotThrow(() => assertDistantConnectionComparisonB6UsesMeasuredRequestV001(
    measurement,
    exactRequestPath,
    fixture.exactRequestBytes
  ));
  assert.equal(
    JSON.parse(processBytes.toString('utf8')).rawResponseSavedBeforeParsing,
    true
  );
});

test('272,000 tokenでは通常料金、直後から長文料金を適用する', async () => {
  const fixture = await loadFixture();
  const atBoundary = buildDistantConnectionComparisonTokenCountMeasurementV001({
    ...fixture,
    rawResponseBytes: rawResponse(272_000)
  });
  const aboveBoundary = buildDistantConnectionComparisonTokenCountMeasurementV001({
    ...fixture,
    rawResponseBytes: rawResponse(272_001)
  });
  assert.equal(atBoundary.tokenMeasurement.longContextPricing.applies, false);
  assert.equal(atBoundary.maximumB6CostProjection.inputPriceNanoUsdPerToken, 250);
  assert.equal(atBoundary.maximumB6CostProjection.outputPriceNanoUsdPerToken, 1_200);
  assert.equal(aboveBoundary.tokenMeasurement.longContextPricing.applies, true);
  assert.equal(aboveBoundary.maximumB6CostProjection.inputPriceNanoUsdPerToken, 500);
  assert.equal(aboveBoundary.maximumB6CostProjection.outputPriceNanoUsdPerToken, 1_800);
});

test('1,050,000 tokenまでは上限内、直後は上限外として保存する', async () => {
  const fixture = await loadFixture();
  const atBoundary = buildDistantConnectionComparisonTokenCountMeasurementV001({
    ...fixture,
    rawResponseBytes: rawResponse(1_050_000)
  });
  const aboveBoundary = buildDistantConnectionComparisonTokenCountMeasurementV001({
    ...fixture,
    rawResponseBytes: rawResponse(1_050_001)
  });
  assert.equal(atBoundary.tokenMeasurement.withinContextWindow, true);
  assert.equal(atBoundary.tokenMeasurement.remainingTokens, 0);
  assert.equal(aboveBoundary.tokenMeasurement.withinContextWindow, false);
  assert.equal(aboveBoundary.tokenMeasurement.remainingTokens, -1);
});

test('同一入力から同一formal byteを生成し再読できる', async () => {
  const fixture = await loadFixture();
  const manifest = decodeDistantConnectionComparisonB5LocalManifestV001(fixture.manifestBytes);
  const input = {...fixture, rawResponseBytes: rawResponse(123_456)};
  const first = buildDistantConnectionComparisonTokenCountMeasurementV001(input);
  const second = buildDistantConnectionComparisonTokenCountMeasurementV001(input);
  const firstBytes = serializeDistantConnectionComparisonTokenCountMeasurementV001(
    first,
    manifest
  );
  const secondBytes = serializeDistantConnectionComparisonTokenCountMeasurementV001(
    second,
    manifest
  );
  assert.deepEqual(firstBytes, secondBytes);
  assert.deepEqual(
    decodeDistantConnectionComparisonTokenCountMeasurementV001(
      firstBytes,
      fixture.manifestBytes
    ),
    first
  );
  assert.doesNotThrow(() => assertDistantConnectionComparisonTokenCountArtifactSetV001({
    ...input,
    measurement: first
  }));
});

test('raw responseの実byteと成果物bindingの差を拒否する', async () => {
  const fixture = await loadFixture();
  const measurement = buildDistantConnectionComparisonTokenCountMeasurementV001({
    ...fixture,
    rawResponseBytes: rawResponse(100)
  });
  assert.throws(
    () => assertDistantConnectionComparisonTokenCountArtifactSetV001({
      ...fixture,
      rawResponseBytes: rawResponse(101),
      measurement
    }),
    (error) => expectCode(error, 'MEASUREMENT_INVALID')
  );
});

test('B6は計測済みexact request以外へ差し替えられない', async () => {
  const fixture = await loadFixture();
  const measurement = buildDistantConnectionComparisonTokenCountMeasurementV001({
    ...fixture,
    rawResponseBytes: rawResponse(100)
  });
  assert.doesNotThrow(() => assertDistantConnectionComparisonB6UsesMeasuredRequestV001(
    measurement,
    exactRequestPath,
    fixture.exactRequestBytes
  ));
  const changed = Buffer.from(fixture.exactRequestBytes);
  changed[changed.length - 2] ^= 1;
  assert.throws(
    () => assertDistantConnectionComparisonB6UsesMeasuredRequestV001(
      measurement,
      exactRequestPath,
      changed
    ),
    (error) => expectCode(error, 'B5_BINDING_MISMATCH')
  );
  const overContext = buildDistantConnectionComparisonTokenCountMeasurementV001({
    ...fixture,
    rawResponseBytes: rawResponse(1_050_001)
  });
  assert.throws(
    () => assertDistantConnectionComparisonB6UsesMeasuredRequestV001(
      overContext,
      exactRequestPath,
      fixture.exactRequestBytes
    ),
    (error) => expectCode(error, 'MEASUREMENT_INVALID')
  );
});

test('source package SHA差を通信後成果物へ混入させない', async () => {
  const fixture = await loadFixture();
  const changed = Buffer.from(fixture.sourcePackageBytes);
  changed[changed.length - 2] ^= 1;
  assert.throws(
    () => buildDistantConnectionComparisonTokenCountMeasurementV001({
      ...fixture,
      sourcePackageBytes: changed,
      rawResponseBytes: rawResponse(1)
    }),
    (error) => expectCode(error, 'B5_BINDING_MISMATCH')
  );
});

test('exact request SHA差を拒否する', async () => {
  const fixture = await loadFixture();
  const changed = Buffer.from(fixture.exactRequestBytes);
  changed[changed.length - 2] ^= 1;
  assert.throws(
    () => buildDistantConnectionComparisonTokenCountMeasurementV001({
      ...fixture,
      exactRequestBytes: changed,
      rawResponseBytes: rawResponse(1)
    }),
    (error) => expectCode(error, 'B5_BINDING_MISMATCH')
  );
});

test('token計測requestの余分なfieldを拒否する', async () => {
  const fixture = await loadFixture();
  const changed = JSON.parse(fixture.tokenCountRequestBytes.toString('utf8'));
  changed.store = false;
  assert.throws(
    () => buildDistantConnectionComparisonTokenCountMeasurementV001({
      ...fixture,
      tokenCountRequestBytes: Buffer.from(`${JSON.stringify(changed, null, 2)}\n`),
      rawResponseBytes: rawResponse(1)
    }),
    (error) => expectCode(error, 'TOKEN_COUNT_REQUEST_INVALID')
  );
});

test('raw responseの余分なfieldを拒否する', async () => {
  const fixture = await loadFixture();
  const changed = Buffer.from(JSON.stringify({
    object: 'response.input_tokens',
    input_tokens: 1,
    unexpected: true
  }));
  assert.throws(
    () => buildDistantConnectionComparisonTokenCountMeasurementV001({
      ...fixture,
      rawResponseBytes: changed
    }),
    (error) => expectCode(error, 'TOKEN_COUNT_RESPONSE_INVALID')
  );
});

test('価格snapshot SHA差を拒否する', async () => {
  const fixture = await loadFixture();
  assert.throws(
    () => buildDistantConnectionComparisonTokenCountMeasurementV001({
      ...fixture,
      expectedPriceSnapshotSha256: '0'.repeat(64),
      rawResponseBytes: rawResponse(1)
    }),
    (error) => expectCode(error, 'PRICE_SNAPSHOT_INVALID')
  );
});
