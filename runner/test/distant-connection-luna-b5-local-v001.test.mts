import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';

import {
  DISTANT_CONNECTION_LUNA_B5_MEASUREMENT_SCHEMA_V001,
  DISTANT_CONNECTION_LUNA_REQUEST_SCHEMA_V001,
  DISTANT_CONNECTION_LUNA_REQUEST_SETTINGS_V001,
  DistantConnectionLunaB5LocalErrorV001,
  assertDistantConnectionLunaB5LocalManifestV001,
  assertDistantConnectionLunaB5MeasurementV001,
  assertDistantConnectionLunaB6RequestBindingV001,
  assertDistantConnectionLunaExactRequestV001,
  buildDistantConnectionLunaB5LocalArtifactsFromBytesV001,
  buildDistantConnectionLunaB5LocalArtifactsFromFileV001,
  serializeDistantConnectionLunaExactRequestV001,
  validateDistantConnectionLunaB5LocalArtifactsV001,
  type BuildDistantConnectionLunaB5LocalInputV001,
  type DistantConnectionLunaB5MeasurementV001,
  type DistantConnectionLunaRequestSettingsV001
} from '../src/distant-connection-luna-b5-local-v001.js';
import {
  DISTANT_CONNECTION_LUNA_SOURCE_PACKAGE_SCHEMA_V001,
  decodeDistantConnectionLunaSourcePackageV001
} from '../src/distant-connection-luna-source-package-v001.js';

const workspaceRoot = path.resolve(import.meta.dirname, '..', '..');
const sourcePackagePath =
  'evals/clip_composition/outputs/work-distant-connection-luna-source-package-v001/'
  + 'source-package-v001.json';
const requestPath =
  'evals/clip_composition/outputs/work-distant-connection-luna-b5-local-v001/'
  + 'exact-request-v001.json';
const manifestPath =
  'evals/clip_composition/outputs/work-distant-connection-luna-b5-local-v001/'
  + 'b5-local-manifest-v001.json';

function sha256(bytes: Uint8Array): string {
  return createHash('sha256').update(bytes).digest('hex');
}

function sourceBinding(bytes: Uint8Array) {
  return {
    path: sourcePackagePath,
    schemaVersion: DISTANT_CONNECTION_LUNA_SOURCE_PACKAGE_SCHEMA_V001,
    fileSha256: sha256(bytes)
  };
}

function input(
  sourcePackageBytes: Uint8Array,
  overrides: Partial<BuildDistantConnectionLunaB5LocalInputV001> = {}
): BuildDistantConnectionLunaB5LocalInputV001 {
  return {
    sourcePackageBinding: sourceBinding(sourcePackageBytes),
    sourcePackageBytes,
    requestPath,
    requestSettings: DISTANT_CONNECTION_LUNA_REQUEST_SETTINGS_V001,
    ...overrides
  };
}

function expectCode(code: string, action: () => unknown): void {
  assert.throws(action, (error: unknown) => (
    error instanceof DistantConnectionLunaB5LocalErrorV001 && error.code === code
  ));
}

test('正式source packageからLuna Responses APIのexact requestを決定的に作る', async () => {
  const sourcePackageBytes = await readFile(path.join(workspaceRoot, sourcePackagePath));
  const artifacts = buildDistantConnectionLunaB5LocalArtifactsFromBytesV001(
    input(sourcePackageBytes)
  );
  assert.deepEqual(artifacts.request, {
    model: 'gpt-5.6-luna',
    instructions:
      '正式source packageのexplorationTaskに従って遠方接続候補を探索し、responseContract.jsonSchemaに適合するJSONだけを返してください。正式意味発話IDを変更、補完、推測しないでください。',
    input: sourcePackageBytes.toString('utf8'),
    reasoning: {effort: 'medium'},
    text: {
      format: {
        type: 'json_schema',
        name: 'distant_connection_candidates_v001',
        strict: true,
        schema: decodeDistantConnectionLunaSourcePackageV001(sourcePackageBytes)
          .responseContract.jsonSchema
      }
    },
    store: false
  });
});

test('source packageとexact requestのSHAをmanifestへ束縛する', async () => {
  const sourcePackageBytes = await readFile(path.join(workspaceRoot, sourcePackagePath));
  const buildInput = input(sourcePackageBytes);
  const artifacts = buildDistantConnectionLunaB5LocalArtifactsFromBytesV001(buildInput);
  assert.deepEqual(artifacts.manifest.sourcePackageBinding, buildInput.sourcePackageBinding);
  assert.deepEqual(artifacts.manifest.requestBinding, {
    path: requestPath,
    schemaVersion: DISTANT_CONNECTION_LUNA_REQUEST_SCHEMA_V001,
    fileSha256: sha256(artifacts.requestBytes)
  });
  assert.deepEqual(
    artifacts.manifest.b6ContinuationContract.requiredRequestBinding,
    artifacts.manifest.requestBinding
  );
  validateDistantConnectionLunaB5LocalArtifactsV001(artifacts, buildInput);
});

test('source packageのSHA不一致と内容改変を送信前に拒否する', async () => {
  const sourcePackageBytes = await readFile(path.join(workspaceRoot, sourcePackagePath));
  const fixedBinding = sourceBinding(sourcePackageBytes);
  expectCode('SOURCE_PACKAGE_SHA_MISMATCH', () => (
    buildDistantConnectionLunaB5LocalArtifactsFromBytesV001(input(sourcePackageBytes, {
      sourcePackageBinding: {...fixedBinding, fileSha256: '0'.repeat(64)}
    }))
  ));
  const mutated = JSON.parse(sourcePackageBytes.toString('utf8'));
  mutated.utterances[0].text = `${mutated.utterances[0].text}改変`;
  const mutatedBytes = Buffer.from(`${JSON.stringify(mutated, null, 2)}\n`, 'utf8');
  expectCode('SOURCE_PACKAGE_SHA_MISMATCH', () => (
    buildDistantConnectionLunaB5LocalArtifactsFromBytesV001(input(mutatedBytes, {
      sourcePackageBinding: fixedBinding
    }))
  ));
});

test('model・provider・operation・reasoning予定値の不整合を拒否する', async () => {
  const sourcePackageBytes = await readFile(path.join(workspaceRoot, sourcePackagePath));
  for (const changed of [
    {providerId: 'different-provider'},
    {modelId: 'different-model'},
    {operationId: 'different-operation'},
    {reasoningEffort: 'high'}
  ]) {
    const requestSettings = {
      ...DISTANT_CONNECTION_LUNA_REQUEST_SETTINGS_V001,
      ...changed
    } as unknown as DistantConnectionLunaRequestSettingsV001;
    expectCode('REQUEST_SETTINGS_MISMATCH', () => (
      buildDistantConnectionLunaB5LocalArtifactsFromBytesV001(input(sourcePackageBytes, {
        requestSettings
      }))
    ));
  }
});

test('structured-output schemaの差し替えとrequestの余分なfieldを拒否する', async () => {
  const sourcePackageBytes = await readFile(path.join(workspaceRoot, sourcePackagePath));
  const sourcePackage = decodeDistantConnectionLunaSourcePackageV001(sourcePackageBytes);
  const artifacts = buildDistantConnectionLunaB5LocalArtifactsFromBytesV001(
    input(sourcePackageBytes)
  );
  const schemaChanged = structuredClone(artifacts.request);
  schemaChanged.text.format.schema = {type: 'object'};
  expectCode('RESPONSE_SCHEMA_BINDING_MISMATCH', () => (
    serializeDistantConnectionLunaExactRequestV001(schemaChanged, sourcePackage)
  ));
  expectCode('REQUEST_INVALID', () => (
    assertDistantConnectionLunaExactRequestV001(
      {...artifacts.request, unexpected: true},
      sourcePackage
    )
  ));
  expectCode('MANIFEST_INVALID', () => (
    assertDistantConnectionLunaB5LocalManifestV001({
      ...artifacts.manifest,
      unexpected: true
    })
  ));
});

test('同一入力は同一request byte・SHA・manifest byteになる', async () => {
  const sourcePackageBytes = await readFile(path.join(workspaceRoot, sourcePackagePath));
  const buildInput = input(sourcePackageBytes);
  const first = buildDistantConnectionLunaB5LocalArtifactsFromBytesV001(buildInput);
  const second = buildDistantConnectionLunaB5LocalArtifactsFromBytesV001(buildInput);
  assert.deepEqual(first.requestBytes, second.requestBytes);
  assert.deepEqual(first.manifestBytes, second.manifestBytes);
  assert.equal(first.manifest.requestBinding.fileSha256, sha256(first.requestBytes));
});

test('B6はB5で固定したrequestと異なるbinding・byteへ差し替えられない', async () => {
  const sourcePackageBytes = await readFile(path.join(workspaceRoot, sourcePackagePath));
  const artifacts = buildDistantConnectionLunaB5LocalArtifactsFromBytesV001(
    input(sourcePackageBytes)
  );
  assert.doesNotThrow(() => assertDistantConnectionLunaB6RequestBindingV001(
    artifacts.manifest.requestBinding,
    artifacts.manifestBytes,
    artifacts.requestBytes
  ));
  expectCode('B6_REQUEST_BINDING_MISMATCH', () => (
    assertDistantConnectionLunaB6RequestBindingV001(
      {...artifacts.manifest.requestBinding, fileSha256: '0'.repeat(64)},
      artifacts.manifestBytes,
      artifacts.requestBytes
    )
  ));
  expectCode('B6_REQUEST_BINDING_MISMATCH', () => (
    assertDistantConnectionLunaB6RequestBindingV001(
      artifacts.manifest.requestBinding,
      artifacts.manifestBytes,
      Buffer.concat([artifacts.requestBytes, Buffer.from('changed')])
    )
  ));
});

test('外部token計測結果と費用上限判定を後から厳格に記録できる', async () => {
  const sourcePackageBytes = await readFile(path.join(workspaceRoot, sourcePackagePath));
  const artifacts = buildDistantConnectionLunaB5LocalArtifactsFromBytesV001(
    input(sourcePackageBytes)
  );
  const measurement: DistantConnectionLunaB5MeasurementV001 = {
    schemaVersion: DISTANT_CONNECTION_LUNA_B5_MEASUREMENT_SCHEMA_V001,
    sourcePackageBinding: artifacts.manifest.sourcePackageBinding,
    requestBinding: artifacts.manifest.requestBinding,
    providerId: 'openai-api',
    modelId: 'gpt-5.6-luna',
    tokenMeasurement: {
      rawResponseBinding: {
        path: 'outputs/token-count-raw.json',
        schemaVersion: 'openai-responses-input-token-count-v001',
        fileSha256: '1'.repeat(64)
      },
      inputTokens: 1
    },
    costEvaluation: {
      priceSnapshotBinding: {
        path: 'reports/price-snapshot.json',
        schemaVersion: 'openai-price-snapshot-v001',
        fileSha256: '2'.repeat(64)
      },
      maximumNanoUsd: 2,
      projectedNanoUsd: 1,
      decision: 'passed'
    }
  };
  assert.doesNotThrow(() => (
    assertDistantConnectionLunaB5MeasurementV001(measurement, artifacts.manifest)
  ));
  expectCode('MEASUREMENT_RESULT_INVALID', () => (
    assertDistantConnectionLunaB5MeasurementV001({
      ...measurement,
      costEvaluation: {...measurement.costEvaluation, decision: 'stopped'}
    }, artifacts.manifest)
  ));
});

test('保存済み工程6 source packageを無変更で読み、B5 local成果物を構築できる', async () => {
  const before = await readFile(path.join(workspaceRoot, sourcePackagePath));
  const artifacts = await buildDistantConnectionLunaB5LocalArtifactsFromFileV001({
    workspaceRoot,
    sourcePackageBinding: sourceBinding(before),
    requestPath,
    requestSettings: DISTANT_CONNECTION_LUNA_REQUEST_SETTINGS_V001
  });
  const after = await readFile(path.join(workspaceRoot, sourcePackagePath));
  assert.deepEqual(after, before);
  assert.equal(artifacts.request.input, before.toString('utf8'));
  assert.equal(
    artifacts.manifest.measurementContract.schemaVersion,
    DISTANT_CONNECTION_LUNA_B5_MEASUREMENT_SCHEMA_V001
  );
  assert.equal(artifacts.manifest.requestBinding.path, requestPath);
  assert.notEqual(manifestPath, requestPath);
});

test('保存済みB5 exact requestとmanifestをsource packageから決定的に再検証できる', async () => {
  const sourcePackageBytes = await readFile(path.join(workspaceRoot, sourcePackagePath));
  const requestBytes = await readFile(path.join(workspaceRoot, requestPath));
  const manifestBytes = await readFile(path.join(workspaceRoot, manifestPath));
  const request = JSON.parse(requestBytes.toString('utf8'));
  const manifest = JSON.parse(manifestBytes.toString('utf8'));
  assert.doesNotThrow(() => validateDistantConnectionLunaB5LocalArtifactsV001(
    {request, requestBytes, manifest, manifestBytes},
    input(sourcePackageBytes)
  ));
  assert.doesNotThrow(() => assertDistantConnectionLunaB6RequestBindingV001(
    manifest.requestBinding,
    manifestBytes,
    requestBytes
  ));
});
