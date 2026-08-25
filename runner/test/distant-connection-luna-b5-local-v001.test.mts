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
  assertDistantConnectionLunaResponseBindingDisclosureV001,
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
  'evals/clip_composition/outputs/'
  + 'work-distant-connection-luna-source-package-short-form-viability-ymUsGrT6EaA-v001/'
  + 'source-package-v001.json';
const requestPath =
  'evals/clip_composition/outputs/'
  + 'work-distant-connection-luna-b5-short-form-viability-ymUsGrT6EaA-v001/'
  + 'exact-request-v001.json';
const manifestPath =
  'evals/clip_composition/outputs/'
  + 'work-distant-connection-luna-b5-short-form-viability-ymUsGrT6EaA-v001/'
  + 'b5-local-manifest-v001.json';
const qualityRequestPath =
  'evals/clip_composition/outputs/'
  + 'work-distant-connection-luna-b5-quality-increment-ymUsGrT6EaA-v001/'
  + 'exact-request-v001.json';
const qualityManifestPath =
  'evals/clip_composition/outputs/'
  + 'work-distant-connection-luna-b5-quality-increment-ymUsGrT6EaA-v001/'
  + 'b5-local-manifest-v001.json';
const preThinningRequestPath =
  'evals/clip_composition/outputs/work-distant-connection-luna-b5-binding-fix-v001/'
  + 'exact-request-v001.json';
const preThinningManifestPath =
  'evals/clip_composition/outputs/work-distant-connection-luna-b5-binding-fix-v001/'
  + 'b5-local-manifest-v001.json';
const historicalRequestPath =
  'evals/clip_composition/outputs/work-distant-connection-luna-b5-local-v001/'
  + 'exact-request-v001.json';
const historicalManifestPath =
  'evals/clip_composition/outputs/work-distant-connection-luna-b5-local-v001/'
  + 'b5-local-manifest-v001.json';
const tokenCountRoot =
  'evals/clip_composition/outputs/work-distant-connection-luna-b5-token-count-v001';
const successfulTokenCountRequestPath =
  `${tokenCountRoot}/attempt-0002/input-token-count-request-v001.json`;
const successfulTokenCountRawPath =
  `${tokenCountRoot}/attempt-0002/input-token-count-raw-response-v001.json`;
const tokenCountMeasurementPath = `${tokenCountRoot}/input-token-count-measurement-v001.json`;
const tokenCountEvaluationPath = `${tokenCountRoot}/input-token-count-evaluation-v001.json`;
const bindingFixTokenCountRoot =
  'evals/clip_composition/outputs/work-distant-connection-luna-b5-token-count-binding-fix-v001';
const bindingFixTokenCountRequestPath =
  `${bindingFixTokenCountRoot}/attempt-0001/input-token-count-request-v001.json`;
const bindingFixTokenCountRawPath =
  `${bindingFixTokenCountRoot}/attempt-0001/input-token-count-raw-response-v001.json`;
const bindingFixTokenCountMeasurementPath =
  `${bindingFixTokenCountRoot}/input-token-count-measurement-v001.json`;
const bindingFixTokenCountEvaluationPath =
  `${bindingFixTokenCountRoot}/input-token-count-evaluation-v001.json`;
const priceSnapshotPath =
  'evals/clip_composition/reports/presentation/provider-research/'
  + 'openai-gpt-5-6-luna-official-snapshot-20260816-v001.json';
const qualityTokenCountRoot =
  'evals/clip_composition/outputs/'
  + 'work-distant-connection-luna-b5-token-count-quality-increment-ymUsGrT6EaA-v001';
const shortFormTokenCountRoot =
  'evals/clip_composition/outputs/'
  + 'work-distant-connection-luna-b5-token-count-short-form-viability-ymUsGrT6EaA-v001';

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
  const sourcePackage = decodeDistantConnectionLunaSourcePackageV001(sourcePackageBytes);
  const artifacts = buildDistantConnectionLunaB5LocalArtifactsFromBytesV001(
    input(sourcePackageBytes)
  );
  assert.equal(artifacts.request.model, 'gpt-5.6-luna');
  assert.match(artifacts.request.instructions, new RegExp(sha256(sourcePackageBytes), 'u'));
  assert.equal(artifacts.request.input, sourcePackageBytes.toString('utf8'));
  assert.deepEqual(artifacts.request.reasoning, {effort: 'medium'});
  assert.equal(artifacts.request.text.format.type, 'json_schema');
  assert.equal(artifacts.request.text.format.name, 'distant_connection_candidates_v001');
  assert.equal(artifacts.request.text.format.strict, true);
  const formalCandidateProperties = (sourcePackage.responseContract.jsonSchema as any)
    .properties.candidates.items.properties;
  const providerCandidateProperties = (artifacts.request.text.format.schema as any)
    .properties.candidates.items.properties;
  assert.equal(formalCandidateProperties.anchorId.enum, undefined);
  assert.equal(
    formalCandidateProperties.anchorId.pattern,
    '^[A-Za-z0-9][A-Za-z0-9._-]*$'
  );
  assert.equal(formalCandidateProperties.firstPartSemanticUtteranceIds.items.enum, undefined);
  assert.equal(
    formalCandidateProperties.firstPartSemanticUtteranceIds.items.pattern,
    '^semantic-utterance-[0-9]{6}$'
  );
  assert.deepEqual(providerCandidateProperties.anchorId, {
    type: 'string', pattern: '^[A-Za-z0-9][A-Za-z0-9._-]*$'
  });
  assert.deepEqual(providerCandidateProperties.firstPartSemanticUtteranceIds, {
    type: 'array', minItems: 1,
    items: {type: 'string', pattern: '^semantic-utterance-[0-9]{6}$'}
  });
  assert.deepEqual(providerCandidateProperties.secondPartSemanticUtteranceIds,
    providerCandidateProperties.firstPartSemanticUtteranceIds);
  assert.equal(artifacts.request.store, false);
  assert.doesNotThrow(() => assertDistantConnectionLunaResponseBindingDisclosureV001(
    artifacts.request,
    decodeDistantConnectionLunaSourcePackageV001(sourcePackageBytes),
    sourcePackageBytes
  ));
});

test('返答で要求するbinding値は全てrequest内から参照でき、SHA転記値の改変を拒否する', async () => {
  const sourcePackageBytes = await readFile(path.join(workspaceRoot, sourcePackagePath));
  const sourcePackage = decodeDistantConnectionLunaSourcePackageV001(sourcePackageBytes);
  const artifacts = buildDistantConnectionLunaB5LocalArtifactsFromBytesV001(
    input(sourcePackageBytes)
  );
  assert.match(artifacts.request.instructions, new RegExp(sha256(sourcePackageBytes), 'u'));
  const changed = structuredClone(artifacts.request);
  changed.instructions = changed.instructions.replace(sha256(sourcePackageBytes), '0'.repeat(64));
  expectCode('REQUEST_BINDING_MISMATCH', () => (
    assertDistantConnectionLunaResponseBindingDisclosureV001(
      changed,
      sourcePackage,
      sourcePackageBytes
    )
  ));
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

test('保存済み旧B5成果物を履歴として不変保持し、現行生成ではprovider schemaを薄化する', async () => {
  const sourcePackageBytes = await readFile(path.join(workspaceRoot, sourcePackagePath));
  const historicalRequestBytes = await readFile(path.join(workspaceRoot, preThinningRequestPath));
  const historicalManifestBytes = await readFile(path.join(workspaceRoot, preThinningManifestPath));
  const historicalRequest = JSON.parse(historicalRequestBytes.toString('utf8'));
  const historicalManifest = JSON.parse(historicalManifestBytes.toString('utf8'));
  const current = buildDistantConnectionLunaB5LocalArtifactsFromBytesV001(
    input(sourcePackageBytes)
  );
  const historicalCandidateProperties = historicalRequest.text.format.schema
    .properties.candidates.items.properties;
  const currentCandidateProperties = (current.request.text.format.schema as any)
    .properties.candidates.items.properties;
  assert.ok(Array.isArray(historicalCandidateProperties.anchorId.enum));
  assert.equal(currentCandidateProperties.anchorId.enum, undefined);
  assert.equal(
    currentCandidateProperties.firstPartSemanticUtteranceIds.items.pattern,
    '^semantic-utterance-[0-9]{6}$'
  );
  assert.notDeepEqual(current.requestBytes, historicalRequestBytes);
  assert.doesNotThrow(() => assertDistantConnectionLunaB6RequestBindingV001(
    historicalManifest.requestBinding,
    historicalManifestBytes,
    historicalRequestBytes
  ));
  assert.deepEqual(
    await readFile(path.join(workspaceRoot, preThinningRequestPath)),
    historicalRequestBytes
  );
  assert.deepEqual(
    await readFile(path.join(workspaceRoot, preThinningManifestPath)),
    historicalManifestBytes
  );
});

test('保存済み成功rawをexact requestへ束縛し、context・長文境界・最大費用を再計算できる', async () => {
  const [
    exactRequestBytes,
    manifestBytes,
    tokenCountRequestBytes,
    rawBytes,
    measurementBytes,
    evaluationBytes,
    priceSnapshotBytes
  ] = await Promise.all([
    readFile(path.join(workspaceRoot, historicalRequestPath)),
    readFile(path.join(workspaceRoot, historicalManifestPath)),
    readFile(path.join(workspaceRoot, successfulTokenCountRequestPath)),
    readFile(path.join(workspaceRoot, successfulTokenCountRawPath)),
    readFile(path.join(workspaceRoot, tokenCountMeasurementPath)),
    readFile(path.join(workspaceRoot, tokenCountEvaluationPath)),
    readFile(path.join(workspaceRoot, priceSnapshotPath))
  ]);
  const exactRequest = JSON.parse(exactRequestBytes.toString('utf8'));
  const tokenCountRequest = JSON.parse(tokenCountRequestBytes.toString('utf8'));
  const expectedTokenCountRequest = structuredClone(exactRequest);
  delete expectedTokenCountRequest.store;
  assert.deepEqual(tokenCountRequest, expectedTokenCountRequest);

  const raw = JSON.parse(rawBytes.toString('utf8'));
  assert.deepEqual(raw, {object: 'response.input_tokens', input_tokens: 1766});
  const manifest = JSON.parse(manifestBytes.toString('utf8'));
  assertDistantConnectionLunaB5LocalManifestV001(manifest);
  const measurement = JSON.parse(measurementBytes.toString('utf8'));
  assertDistantConnectionLunaB5MeasurementV001(measurement, manifest);
  assert.deepEqual(measurement.tokenMeasurement, {
    rawResponseBinding: {
      path: successfulTokenCountRawPath,
      schemaVersion: 'openai-responses-input-token-count-response-v001',
      fileSha256: sha256(rawBytes)
    },
    inputTokens: 1766
  });

  const priceSnapshot = JSON.parse(priceSnapshotBytes.toString('utf8'));
  assert.equal(priceSnapshot.model.contextWindowTokens, 1_050_000);
  assert.equal(priceSnapshot.model.maxOutputTokens, 128_000);
  assert.equal(priceSnapshot.standardPricingUsdPerMillionTokens.input, 0.2);
  assert.equal(priceSnapshot.standardPricingUsdPerMillionTokens.outputIncludingReasoning, 1.2);
  const evaluation = JSON.parse(evaluationBytes.toString('utf8'));
  assert.deepEqual(evaluation, {
    schemaVersion: 'distant-connection-luna-b5-token-count-evaluation-v001',
    measurementBinding: {
      path: tokenCountMeasurementPath,
      schemaVersion: DISTANT_CONNECTION_LUNA_B5_MEASUREMENT_SCHEMA_V001,
      fileSha256: sha256(measurementBytes)
    },
    priceSnapshotBinding: measurement.costEvaluation.priceSnapshotBinding,
    contextEvaluation: {
      inputTokens: 1766,
      contextWindowTokens: 1_050_000,
      usageFraction: {numeratorTokens: 1766, denominatorTokens: 1_050_000},
      withinContextWindow: true
    },
    longContextPricing: {
      thresholdTokens: 272_000,
      comparison: 'inputTokens > thresholdTokens',
      applies: false
    },
    b6MaximumCostProjection: {
      currency: 'USD',
      maximumOutputTokens: 128_000,
      inputPriceNanoUsdPerToken: 200,
      outputPriceNanoUsdPerToken: 1200,
      projectedInputNanoUsd: 353_200,
      projectedMaximumOutputNanoUsd: 153_600_000,
      projectedNanoUsd: 153_953_200,
      maximumNanoUsd: 500_000_000,
      decision: 'passed'
    }
  });
});

test('binding修正後の保存済みtoken計測を新exact requestへ束縛して再検証できる', async () => {
  const [
    exactRequestBytes,
    manifestBytes,
    tokenCountRequestBytes,
    rawBytes,
    measurementBytes,
    evaluationBytes
  ] = await Promise.all([
    readFile(path.join(workspaceRoot, preThinningRequestPath)),
    readFile(path.join(workspaceRoot, preThinningManifestPath)),
    readFile(path.join(workspaceRoot, bindingFixTokenCountRequestPath)),
    readFile(path.join(workspaceRoot, bindingFixTokenCountRawPath)),
    readFile(path.join(workspaceRoot, bindingFixTokenCountMeasurementPath)),
    readFile(path.join(workspaceRoot, bindingFixTokenCountEvaluationPath))
  ]);
  const exactRequest = JSON.parse(exactRequestBytes.toString('utf8'));
  const expectedTokenCountRequest = structuredClone(exactRequest);
  delete expectedTokenCountRequest.store;
  assert.deepEqual(
    JSON.parse(tokenCountRequestBytes.toString('utf8')),
    expectedTokenCountRequest
  );
  assert.deepEqual(
    JSON.parse(rawBytes.toString('utf8')),
    {object: 'response.input_tokens', input_tokens: 1874}
  );
  const manifest = JSON.parse(manifestBytes.toString('utf8'));
  assertDistantConnectionLunaB5LocalManifestV001(manifest);
  const measurement = JSON.parse(measurementBytes.toString('utf8'));
  assertDistantConnectionLunaB5MeasurementV001(measurement, manifest);
  assert.equal(measurement.requestBinding.fileSha256, sha256(exactRequestBytes));
  assert.equal(measurement.tokenMeasurement.inputTokens, 1874);
  const evaluation = JSON.parse(evaluationBytes.toString('utf8'));
  assert.deepEqual(evaluation.contextEvaluation, {
    inputTokens: 1874,
    contextWindowTokens: 1_050_000,
    usageFraction: {numeratorTokens: 1874, denominatorTokens: 1_050_000},
    withinContextWindow: true
  });
  assert.deepEqual(evaluation.longContextPricing, {
    thresholdTokens: 272_000,
    comparison: 'inputTokens > thresholdTokens',
    applies: false
  });
  assert.deepEqual(evaluation.b6MaximumCostProjection, {
    currency: 'USD',
    maximumOutputTokens: 128_000,
    inputPriceNanoUsdPerToken: 200,
    outputPriceNanoUsdPerToken: 1200,
    projectedInputNanoUsd: 374_800,
    projectedMaximumOutputNanoUsd: 153_600_000,
    projectedNanoUsd: 153_974_800,
    maximumNanoUsd: 500_000_000,
    decision: 'passed'
  });
});

test('探索品質改訂後のtoken計測をexact requestへ束縛しcontextと最大費用を判定する', async () => {
  const [
    exactRequestBytes,
    manifestBytes,
    projectionBytes,
    rawBytes,
    transportBytes,
    measurementBytes,
    evaluationBytes
  ] = await Promise.all([
    readFile(path.join(workspaceRoot, qualityRequestPath)),
    readFile(path.join(workspaceRoot, qualityManifestPath)),
    readFile(path.join(workspaceRoot, qualityTokenCountRoot,
      'attempt-0001/input-token-count-request-v001.json')),
    readFile(path.join(workspaceRoot, qualityTokenCountRoot,
      'attempt-0001/input-token-count-raw-response-v001.json')),
    readFile(path.join(workspaceRoot, qualityTokenCountRoot,
      'attempt-0001/input-token-count-transport-v001.json')),
    readFile(path.join(workspaceRoot, qualityTokenCountRoot,
      'input-token-count-measurement-v001.json')),
    readFile(path.join(workspaceRoot, qualityTokenCountRoot,
      'input-token-count-evaluation-v001.json'))
  ]);
  const exactRequest = JSON.parse(exactRequestBytes.toString('utf8'));
  const expectedProjection = structuredClone(exactRequest);
  delete expectedProjection.store;
  assert.deepEqual(JSON.parse(projectionBytes.toString('utf8')), expectedProjection);
  assert.deepEqual(JSON.parse(rawBytes.toString('utf8')), {
    object: 'response.input_tokens', input_tokens: 892_898
  });
  const transport = JSON.parse(transportBytes.toString('utf8'));
  assert.equal(transport.http.status, 200);
  assert.equal(transport.http.ok, true);
  assert.equal(transport.apiCallNumberInQualityRevision, 1);
  assert.equal(transport.rawResponseBinding.fileSha256, sha256(rawBytes));
  const manifest = JSON.parse(manifestBytes.toString('utf8'));
  const measurement = JSON.parse(measurementBytes.toString('utf8'));
  assertDistantConnectionLunaB5MeasurementV001(measurement, manifest);
  assert.equal(measurement.tokenMeasurement.inputTokens, 892_898);
  assert.equal(measurement.costEvaluation.projectedNanoUsd, 587_559_200);
  const evaluation = JSON.parse(evaluationBytes.toString('utf8'));
  assert.equal(evaluation.contextEvaluation.withinContextWindow, true);
  assert.equal(evaluation.contextEvaluation.remainingTokens, 157_102);
  assert.equal(evaluation.longContextPricing.applies, true);
  assert.equal(evaluation.b6MaximumCostProjection.projectedNanoUsd, 587_559_200);
  assert.equal(evaluation.b6Admission.decision, 'passed');
});

test('短尺成立条件追加後のtoken計測を新exact requestへ束縛し有料B6を承認待ちにする', async () => {
  const [
    exactRequestBytes,
    manifestBytes,
    projectionBytes,
    rawBytes,
    transportBytes,
    processBytes,
    measurementBytes,
    evaluationBytes
  ] = await Promise.all([
    readFile(path.join(workspaceRoot, requestPath)),
    readFile(path.join(workspaceRoot, manifestPath)),
    readFile(path.join(workspaceRoot, shortFormTokenCountRoot,
      'attempt-0001/input-token-count-request-v001.json')),
    readFile(path.join(workspaceRoot, shortFormTokenCountRoot,
      'attempt-0001/input-token-count-raw-response-v001.json')),
    readFile(path.join(workspaceRoot, shortFormTokenCountRoot,
      'attempt-0001/input-token-count-transport-v001.json')),
    readFile(path.join(workspaceRoot, shortFormTokenCountRoot,
      'attempt-0001/process-observation-v001.json')),
    readFile(path.join(workspaceRoot, shortFormTokenCountRoot,
      'input-token-count-measurement-v001.json')),
    readFile(path.join(workspaceRoot, shortFormTokenCountRoot,
      'input-token-count-evaluation-v001.json'))
  ]);
  const exactRequest = JSON.parse(exactRequestBytes.toString('utf8'));
  const expectedProjection = structuredClone(exactRequest);
  delete expectedProjection.store;
  assert.deepEqual(JSON.parse(projectionBytes.toString('utf8')), expectedProjection);
  assert.deepEqual(JSON.parse(rawBytes.toString('utf8')), {
    object: 'response.input_tokens', input_tokens: 893_050
  });
  const transport = JSON.parse(transportBytes.toString('utf8'));
  assert.equal(transport.http.status, 200);
  assert.equal(transport.http.ok, true);
  assert.equal(transport.apiCallNumberInShortFormRevision, 1);
  assert.equal(transport.rawResponseBinding.fileSha256, sha256(rawBytes));
  assert.deepEqual(JSON.parse(processBytes.toString('utf8')), {
    schemaVersion: 'process-observation-v001',
    process: 'node:https OpenAI Responses input token count',
    exitCode: 0,
    signal: null,
    stderr: '',
    responseBodySavedBeforeRead: true
  });
  const manifest = JSON.parse(manifestBytes.toString('utf8'));
  const measurement = JSON.parse(measurementBytes.toString('utf8'));
  assertDistantConnectionLunaB5MeasurementV001(measurement, manifest);
  assert.equal(measurement.tokenMeasurement.inputTokens, 893_050);
  assert.equal(measurement.costEvaluation.projectedNanoUsd, 587_620_000);
  const evaluation = JSON.parse(evaluationBytes.toString('utf8'));
  assert.deepEqual(evaluation.contextEvaluation, {
    inputTokens: 893_050,
    contextWindowTokens: 1_050_000,
    usageFraction: {numeratorTokens: 893_050, denominatorTokens: 1_050_000},
    withinContextWindow: true,
    excessTokens: 0,
    remainingTokens: 156_950
  });
  assert.equal(evaluation.longContextPricing.applies, true);
  assert.equal(evaluation.b6MaximumCostProjection.projectedNanoUsd, 587_620_000);
  assert.equal(evaluation.b6Admission.decision, 'pending-kawafmm-approval');
});
