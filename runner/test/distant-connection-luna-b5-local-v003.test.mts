import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import test from 'node:test';

import {
  DISTANT_CONNECTION_LUNA_B5_MEASUREMENT_SCHEMA_V003,
  DISTANT_CONNECTION_LUNA_REQUEST_SCHEMA_V003,
  DISTANT_CONNECTION_LUNA_REQUEST_SETTINGS_V003,
  DistantConnectionLunaB5LocalErrorV003,
  assertDistantConnectionLunaB5LocalManifestV003,
  assertDistantConnectionLunaB6RequestBindingV003,
  assertDistantConnectionLunaExactRequestV003,
  buildDistantConnectionLunaB5LocalArtifactsFromBytesV003,
  decodeDistantConnectionLunaB5LocalManifestV003,
  serializeDistantConnectionLunaExactRequestV003,
  validateDistantConnectionLunaB5LocalArtifactsV003,
  type BuildDistantConnectionLunaB5LocalInputV003,
  type DistantConnectionLunaRequestSettingsV003
} from '../src/distant-connection-luna-b5-local-v003.js';
import {
  DISTANT_CONNECTION_LUNA_INDEXED_MODEL_INPUT_SCHEMA_V001,
  buildDistantConnectionLunaIndexedModelInputV001,
  decodeDistantConnectionLunaIndexedModelInputV001,
  serializeDistantConnectionLunaIndexedModelInputV001
} from '../src/distant-connection-luna-index-reference-v001.js';
import {
  DISTANT_CONNECTION_LUNA_SOURCE_PACKAGE_SCHEMA_V002
} from '../src/distant-connection-luna-source-package-v002.js';

const sourcePackagePath =
  'evals/clip_composition/outputs/'
  + 'work-distant-connection-luna-source-package-op-ed-rejection-feedback-ymUsGrT6EaA-v002/'
  + 'source-package-v002.json';
const indexedModelInputPath = 'outputs/indexed-model-input-v001.json';
const requestPath = 'outputs/exact-request-v003.json';
const formalIndexedModelInputPath =
  'evals/clip_composition/outputs/'
  + 'work-distant-connection-luna-index-reference-ymUsGrT6EaA-v001/'
  + 'indexed-model-input-v001.json';
const formalRequestPath =
  'evals/clip_composition/outputs/'
  + 'work-distant-connection-luna-b5-reference-integrity-ymUsGrT6EaA-v003/'
  + 'exact-request-v003.json';
const formalManifestPath =
  'evals/clip_composition/outputs/'
  + 'work-distant-connection-luna-b5-reference-integrity-ymUsGrT6EaA-v003/'
  + 'b5-local-manifest-v003.json';

function sha256(bytes: Uint8Array): string {
  return createHash('sha256').update(bytes).digest('hex');
}

const sourcePackageBytes = await readFile(new URL(`../../${sourcePackagePath}`, import.meta.url));
const indexedModelInput = buildDistantConnectionLunaIndexedModelInputV001({
  sourcePackagePath,
  sourcePackageBytes
});
const indexedModelInputBytes = serializeDistantConnectionLunaIndexedModelInputV001(
  indexedModelInput
);

function buildInput(
  overrides: Partial<BuildDistantConnectionLunaB5LocalInputV003> = {}
): BuildDistantConnectionLunaB5LocalInputV003 {
  return {
    sourcePackageBinding: {
      path: sourcePackagePath,
      schemaVersion: DISTANT_CONNECTION_LUNA_SOURCE_PACKAGE_SCHEMA_V002,
      fileSha256: sha256(sourcePackageBytes)
    },
    sourcePackageBytes,
    indexedModelInputBinding: {
      path: indexedModelInputPath,
      schemaVersion: DISTANT_CONNECTION_LUNA_INDEXED_MODEL_INPUT_SCHEMA_V001,
      fileSha256: sha256(indexedModelInputBytes)
    },
    indexedModelInputBytes,
    requestPath,
    requestSettings: DISTANT_CONNECTION_LUNA_REQUEST_SETTINGS_V003,
    ...overrides
  };
}

function expectCode(code: string, action: () => unknown): void {
  assert.throws(action, (error: unknown) => (
    error instanceof DistantConnectionLunaB5LocalErrorV003 && error.code === code
  ));
}

test('indexed model input全byteをLuna index response v001のexact requestへ固定する', () => {
  const input = buildInput();
  const artifacts = buildDistantConnectionLunaB5LocalArtifactsFromBytesV003(input);
  assert.deepEqual(DISTANT_CONNECTION_LUNA_REQUEST_SETTINGS_V003, {
    providerId: 'openai-api',
    modelId: 'gpt-5.6-luna',
    operationId: 'responses',
    reasoningEffort: 'medium',
    responseFormatName: 'distant_connection_index_response_v001',
    store: false
  });
  assert.equal(artifacts.request.model, 'gpt-5.6-luna');
  assert.equal(artifacts.request.input, indexedModelInputBytes.toString('utf8'));
  assert.deepEqual(JSON.parse(artifacts.request.input), indexedModelInput);
  assert.match(artifacts.request.instructions, /formal IDを返答へ記述しない/u);
  assert.match(artifacts.request.instructions, /いずれも0始まり/u);
  assert.match(artifacts.request.instructions, /anchorIndexはanchors配列の位置/u);
  assert.match(artifacts.request.instructions, /utteranceIndexはutterances配列の位置/u);
  assert.match(artifacts.request.instructions, new RegExp(sha256(sourcePackageBytes), 'u'));
  assert.match(artifacts.request.instructions, new RegExp(sha256(indexedModelInputBytes), 'u'));
  assert.deepEqual(artifacts.request.reasoning, {effort: 'medium'});
  assert.equal(artifacts.request.text.format.name, 'distant_connection_index_response_v001');
  assert.equal(artifacts.request.text.format.strict, true);
  assert.equal(artifacts.request.store, false);

  const schema = artifacts.request.text.format.schema as any;
  const candidate = schema.properties.candidates.items;
  assert.deepEqual(candidate.required, [
    'anchorIndex',
    'firstPartUtteranceIndexes',
    'secondPartUtteranceIndexes',
    'addedUnderstanding',
    'direction'
  ]);
  assert.deepEqual(candidate.properties.anchorIndex, {
    type: 'integer',
    minimum: 0,
    maximum: 4_441
  });
  assert.deepEqual(candidate.properties.firstPartUtteranceIndexes.items, {
    type: 'integer',
    minimum: 0,
    maximum: 10_722
  });
  assert.deepEqual(candidate.properties.secondPartUtteranceIndexes.items, {
    type: 'integer',
    minimum: 0,
    maximum: 10_722
  });
  assert.equal('uniqueItems' in candidate.properties.firstPartUtteranceIndexes, false);
  assert.equal('uniqueItems' in candidate.properties.secondPartUtteranceIndexes, false);
  assert.doesNotThrow(() => assertDistantConnectionLunaExactRequestV003(
    artifacts.request,
    indexedModelInput,
    input.indexedModelInputBinding
  ));
});

test('manifestはsource・indexed input・request SHAとB6継続条件を束縛する', () => {
  const input = buildInput();
  const artifacts = buildDistantConnectionLunaB5LocalArtifactsFromBytesV003(input);
  assert.deepEqual(artifacts.manifest.sourcePackageBinding, input.sourcePackageBinding);
  assert.deepEqual(
    artifacts.manifest.indexedModelInputBinding,
    input.indexedModelInputBinding
  );
  assert.deepEqual(artifacts.manifest.requestBinding, {
    path: requestPath,
    schemaVersion: DISTANT_CONNECTION_LUNA_REQUEST_SCHEMA_V003,
    fileSha256: sha256(artifacts.requestBytes)
  });
  assert.equal(
    artifacts.manifest.measurementContract.schemaVersion,
    DISTANT_CONNECTION_LUNA_B5_MEASUREMENT_SCHEMA_V003
  );
  const measurementRequired = (
    artifacts.manifest.measurementContract.jsonSchema as any
  ).required;
  assert.ok(measurementRequired.includes('sourcePackageBinding'));
  assert.ok(measurementRequired.includes('indexedModelInputBinding'));
  assert.ok(measurementRequired.includes('requestBinding'));
  assert.deepEqual(
    artifacts.manifest.b6ContinuationContract.requiredRequestBinding,
    artifacts.manifest.requestBinding
  );
  assert.deepEqual(
    decodeDistantConnectionLunaB5LocalManifestV003(artifacts.manifestBytes),
    artifacts.manifest
  );
  assert.doesNotThrow(() => validateDistantConnectionLunaB5LocalArtifactsV003(
    artifacts,
    input
  ));
});

test('同一source・indexed inputはrequest・manifestをbyte単位で決定的に再生成する', () => {
  const input = buildInput();
  const first = buildDistantConnectionLunaB5LocalArtifactsFromBytesV003(input);
  const second = buildDistantConnectionLunaB5LocalArtifactsFromBytesV003(input);
  assert.deepEqual(first.requestBytes, second.requestBytes);
  assert.deepEqual(first.manifestBytes, second.manifestBytes);
  assert.equal(first.manifest.requestBinding.fileSha256, sha256(first.requestBytes));
});

test('source・indexed inputのSHA、版、正式byte、相互導出差を送信前に拒否する', () => {
  const input = buildInput();
  expectCode('SOURCE_PACKAGE_SHA_MISMATCH', () => (
    buildDistantConnectionLunaB5LocalArtifactsFromBytesV003({
      ...input,
      sourcePackageBinding: {...input.sourcePackageBinding, fileSha256: '0'.repeat(64)}
    })
  ));
  expectCode('INDEXED_MODEL_INPUT_SHA_MISMATCH', () => (
    buildDistantConnectionLunaB5LocalArtifactsFromBytesV003({
      ...input,
      indexedModelInputBinding: {
        ...input.indexedModelInputBinding,
        fileSha256: '0'.repeat(64)
      }
    })
  ));
  expectCode('INDEXED_MODEL_INPUT_INVALID', () => (
    buildDistantConnectionLunaB5LocalArtifactsFromBytesV003({
      ...input,
      indexedModelInputBinding: {
        ...input.indexedModelInputBinding,
        schemaVersion: DISTANT_CONNECTION_LUNA_SOURCE_PACKAGE_SCHEMA_V002
      }
    })
  ));
  const nonCanonical = Buffer.from(
    JSON.stringify(decodeDistantConnectionLunaIndexedModelInputV001(indexedModelInputBytes)),
    'utf8'
  );
  expectCode('INDEXED_MODEL_INPUT_INVALID', () => (
    buildDistantConnectionLunaB5LocalArtifactsFromBytesV003(buildInput({
      indexedModelInputBytes: nonCanonical,
      indexedModelInputBinding: {
        path: indexedModelInputPath,
        schemaVersion: DISTANT_CONNECTION_LUNA_INDEXED_MODEL_INPUT_SCHEMA_V001,
        fileSha256: sha256(nonCanonical)
      }
    }))
  ));
  const altered = structuredClone(indexedModelInput);
  altered.utterances[0]!.text = 'source packageから導出されない本文';
  const alteredBytes = serializeDistantConnectionLunaIndexedModelInputV001(altered);
  expectCode('INDEXED_MODEL_INPUT_BINDING_MISMATCH', () => (
    buildDistantConnectionLunaB5LocalArtifactsFromBytesV003(buildInput({
      indexedModelInputBytes: alteredBytes,
      indexedModelInputBinding: {
        path: indexedModelInputPath,
        schemaVersion: DISTANT_CONNECTION_LUNA_INDEXED_MODEL_INPUT_SCHEMA_V001,
        fileSha256: sha256(alteredBytes)
      }
    }))
  ));
});

test('承認済み設定・index schema・余分なfieldの差し替えを拒否する', () => {
  const input = buildInput();
  const artifacts = buildDistantConnectionLunaB5LocalArtifactsFromBytesV003(input);
  const changedSettings = {
    ...DISTANT_CONNECTION_LUNA_REQUEST_SETTINGS_V003,
    reasoningEffort: 'high'
  } as unknown as DistantConnectionLunaRequestSettingsV003;
  expectCode('REQUEST_SETTINGS_MISMATCH', () => (
    buildDistantConnectionLunaB5LocalArtifactsFromBytesV003(buildInput({
      requestSettings: changedSettings
    }))
  ));
  const schemaChanged = structuredClone(artifacts.request);
  schemaChanged.text.format.schema = {type: 'object'};
  expectCode('RESPONSE_SCHEMA_BINDING_MISMATCH', () => (
    serializeDistantConnectionLunaExactRequestV003(
      schemaChanged,
      indexedModelInput,
      input.indexedModelInputBinding
    )
  ));
  expectCode('REQUEST_INVALID', () => (
    assertDistantConnectionLunaExactRequestV003(
      {...artifacts.request, unexpected: true},
      indexedModelInput,
      input.indexedModelInputBinding
    )
  ));
  expectCode('MANIFEST_INVALID', () => (
    assertDistantConnectionLunaB5LocalManifestV003({...artifacts.manifest, unexpected: true})
  ));
});

test('B6はmanifest・request・indexed inputの別bindingとbyte差し替えを拒否する', () => {
  const input = buildInput();
  const artifacts = buildDistantConnectionLunaB5LocalArtifactsFromBytesV003(input);
  assert.doesNotThrow(() => assertDistantConnectionLunaB6RequestBindingV003(
    artifacts.manifest.requestBinding,
    artifacts.manifest.indexedModelInputBinding,
    artifacts.manifestBytes,
    artifacts.requestBytes,
    indexedModelInputBytes
  ));
  expectCode('B6_REQUEST_BINDING_MISMATCH', () => (
    assertDistantConnectionLunaB6RequestBindingV003(
      {...artifacts.manifest.requestBinding, fileSha256: '0'.repeat(64)},
      artifacts.manifest.indexedModelInputBinding,
      artifacts.manifestBytes,
      artifacts.requestBytes,
      indexedModelInputBytes
    )
  ));
  expectCode('B6_REQUEST_BINDING_MISMATCH', () => (
    assertDistantConnectionLunaB6RequestBindingV003(
      artifacts.manifest.requestBinding,
      {...artifacts.manifest.indexedModelInputBinding, fileSha256: '0'.repeat(64)},
      artifacts.manifestBytes,
      artifacts.requestBytes,
      indexedModelInputBytes
    )
  ));
  expectCode('B6_REQUEST_BINDING_MISMATCH', () => (
    assertDistantConnectionLunaB6RequestBindingV003(
      artifacts.manifest.requestBinding,
      artifacts.manifest.indexedModelInputBinding,
      artifacts.manifestBytes,
      Buffer.concat([artifacts.requestBytes, Buffer.from('changed')]),
      indexedModelInputBytes
    )
  ));
  expectCode('B6_REQUEST_BINDING_MISMATCH', () => (
    assertDistantConnectionLunaB6RequestBindingV003(
      artifacts.manifest.requestBinding,
      artifacts.manifest.indexedModelInputBinding,
      artifacts.manifestBytes,
      artifacts.requestBytes,
      Buffer.concat([indexedModelInputBytes, Buffer.from('changed')])
    )
  ));
});

test('実配信の全10,723発話・4,442アンカーを保持した正式v003成果物をbyte再現する', async () => {
  const [formalIndexedBytes, formalRequestBytes, formalManifestBytes] = await Promise.all([
    readFile(new URL(`../../${formalIndexedModelInputPath}`, import.meta.url)),
    readFile(new URL(`../../${formalRequestPath}`, import.meta.url)),
    readFile(new URL(`../../${formalManifestPath}`, import.meta.url))
  ]);
  const formalIndexed = decodeDistantConnectionLunaIndexedModelInputV001(formalIndexedBytes);
  assert.equal(formalIndexed.utteranceCount, 10_723);
  assert.equal(formalIndexed.anchorCount, 4_442);
  assert.equal(sha256(formalIndexedBytes), 'ce7bd510cec2e9ea0aed570405335e7115baf65698c6dc15b49acc2f8bee8425');
  assert.equal(sha256(formalRequestBytes), 'cb96df0e74dce404d115607824fc55d359e67737909ecfd5ad1f4deb4ee61426');
  assert.equal(sha256(formalManifestBytes), '9eff5986431f6197fe044f7bc2ba1715d81ea1ab2b8852385482b04e08759c60');

  const rebuilt = buildDistantConnectionLunaB5LocalArtifactsFromBytesV003({
    sourcePackageBinding: {
      path: sourcePackagePath,
      schemaVersion: DISTANT_CONNECTION_LUNA_SOURCE_PACKAGE_SCHEMA_V002,
      fileSha256: sha256(sourcePackageBytes)
    },
    sourcePackageBytes,
    indexedModelInputBinding: {
      path: formalIndexedModelInputPath,
      schemaVersion: DISTANT_CONNECTION_LUNA_INDEXED_MODEL_INPUT_SCHEMA_V001,
      fileSha256: sha256(formalIndexedBytes)
    },
    indexedModelInputBytes: formalIndexedBytes,
    requestPath: formalRequestPath,
    requestSettings: DISTANT_CONNECTION_LUNA_REQUEST_SETTINGS_V003
  });
  assert.deepEqual(formalRequestBytes, rebuilt.requestBytes);
  assert.deepEqual(formalManifestBytes, rebuilt.manifestBytes);
  assert.equal(
    decodeDistantConnectionLunaB5LocalManifestV003(formalManifestBytes)
      .b6ContinuationContract.requiredRequestBinding.fileSha256,
    sha256(formalRequestBytes)
  );
});
