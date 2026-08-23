import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';

import {
  DistantConnectionLunaB6ResultErrorV001,
  buildDistantConnectionLunaB6ResultArtifactsV001
} from '../src/distant-connection-luna-b6-result-v001.js';

const workspaceRoot = path.resolve(import.meta.dirname, '..', '..');
const sourcePackagePath =
  'evals/clip_composition/outputs/work-distant-connection-luna-source-package-v001/source-package-v001.json';
const requestPath =
  'evals/clip_composition/outputs/work-distant-connection-luna-b5-binding-fix-v001/exact-request-v001.json';
const manifestPath =
  'evals/clip_composition/outputs/work-distant-connection-luna-b5-binding-fix-v001/b5-local-manifest-v001.json';
const tokenMeasurementPath =
  'evals/clip_composition/outputs/work-distant-connection-luna-b5-token-count-binding-fix-v001/input-token-count-measurement-v001.json';
const rawResponsePath =
  'evals/clip_composition/outputs/work-distant-connection-luna-b6-first-candidates-v001/attempt-0004/raw-response-v001.json';
const candidateResponsePath =
  'evals/clip_composition/outputs/work-distant-connection-luna-b6-first-candidates-v001/candidate-response-v001.json';
const runManifestPath =
  'evals/clip_composition/outputs/work-distant-connection-luna-b6-first-candidates-v001/b6-run-manifest-v001.json';
const priceSnapshotPath =
  'evals/clip_composition/reports/presentation/provider-research/openai-gpt-5-6-luna-official-snapshot-20260816-v001.json';

function sha256(bytes: Uint8Array): string {
  return createHash('sha256').update(bytes).digest('hex');
}

async function input() {
  const [
    sourcePackageBytes,
    requestBytes,
    b5ManifestBytes,
    tokenMeasurementBytes,
    rawResponseBytes,
    priceSnapshotBytes
  ] = await Promise.all([
    readFile(path.join(workspaceRoot, sourcePackagePath)),
    readFile(path.join(workspaceRoot, requestPath)),
    readFile(path.join(workspaceRoot, manifestPath)),
    readFile(path.join(workspaceRoot, tokenMeasurementPath)),
    readFile(path.join(workspaceRoot, rawResponsePath)),
    readFile(path.join(workspaceRoot, priceSnapshotPath))
  ]);
  return {
    sourcePackagePath,
    sourcePackageBytes,
    requestPath,
    requestBytes,
    b5ManifestBytes,
    tokenMeasurementPath,
    tokenMeasurementBytes,
    rawResponsePath,
    rawResponseBytes,
    candidateResponsePath,
    priceSnapshotPath,
    priceSnapshotBytes,
    maximumNanoUsd: 500_000_000
  };
}

function expectCode(code: string, action: () => unknown): void {
  assert.throws(action, (error: unknown) => (
    error instanceof DistantConnectionLunaB6ResultErrorV001 && error.code === code
  ));
}

test('保存済みHTTP 200応答をstrict検査し候補2件の正式成果物へ変換する', async () => {
  const artifacts = buildDistantConnectionLunaB6ResultArtifactsV001(await input());
  assert.equal(artifacts.response.candidates.length, 2);
  assert.deepEqual(artifacts.response.sourcePackageBinding, {
    path: sourcePackagePath,
    schemaVersion: 'distant-connection-luna-source-package-v001',
    fileSha256: 'b2754d69c6cda70dc1a680238a5edd15af1706a7de5b93b62f05675557cdcc76'
  });
  assert.deepEqual(artifacts.manifest.usage, {
    inputTokens: 1874,
    cachedInputTokens: 0,
    cacheWriteTokens: 1871,
    uncachedNonWriteInputTokens: 3,
    outputTokens: 449,
    reasoningTokens: 135,
    totalTokens: 2323
  });
  assert.equal(artifacts.manifest.cost.totalNanoUsd, 1_007_150);
  assert.equal(artifacts.manifest.cost.totalUsd, 0.00100715);
  assert.equal(artifacts.manifest.cost.withinMaximum, true);
  assert.equal(
    artifacts.manifest.candidateResponseBinding.fileSha256,
    sha256(artifacts.responseBytes)
  );
});

test('B5 request・source package・token計測のbinding差を拒否する', async () => {
  const valid = await input();
  expectCode('B6_BINDING_MISMATCH', () => buildDistantConnectionLunaB6ResultArtifactsV001({
    ...valid,
    sourcePackagePath: 'different/source-package.json'
  }));
  assert.throws(() => buildDistantConnectionLunaB6ResultArtifactsV001({
    ...valid,
    requestBytes: Buffer.concat([valid.requestBytes, Buffer.from('changed')])
  }));
  assert.throws(() => buildDistantConnectionLunaB6ResultArtifactsV001({
    ...valid,
    tokenMeasurementBytes: Buffer.concat([
      valid.tokenMeasurementBytes,
      Buffer.from('changed')
    ])
  }));
});

test('incomplete・refusal・structured output不正をformal成果物にしない', async () => {
  const valid = await input();
  const raw = JSON.parse(valid.rawResponseBytes.toString('utf8'));
  expectCode('B6_RESPONSE_INCOMPLETE', () => buildDistantConnectionLunaB6ResultArtifactsV001({
    ...valid,
    rawResponseBytes: Buffer.from(JSON.stringify({...raw, status: 'incomplete'}))
  }));
  const refusal = structuredClone(raw);
  const message = refusal.output.find((item: any) => item.type === 'message');
  message.content = [{type: 'refusal', refusal: 'declined'}];
  expectCode('B6_REFUSAL', () => buildDistantConnectionLunaB6ResultArtifactsV001({
    ...valid,
    rawResponseBytes: Buffer.from(JSON.stringify(refusal))
  }));
  const invalid = structuredClone(raw);
  invalid.output.find((item: any) => item.type === 'message').content[0].text = '{}';
  assert.throws(() => buildDistantConnectionLunaB6ResultArtifactsV001({
    ...valid,
    rawResponseBytes: Buffer.from(JSON.stringify(invalid))
  }));
});

test('同一保存入力から同一candidate byte・manifest byteを再構築する', async () => {
  const valid = await input();
  const first = buildDistantConnectionLunaB6ResultArtifactsV001(valid);
  const second = buildDistantConnectionLunaB6ResultArtifactsV001(valid);
  assert.deepEqual(first.responseBytes, second.responseBytes);
  assert.deepEqual(first.manifestBytes, second.manifestBytes);
});

test('公開前の正式candidateとrun manifestは保存済み入力からbyte同一に再構築できる', async () => {
  const artifacts = buildDistantConnectionLunaB6ResultArtifactsV001(await input());
  const [savedCandidateBytes, savedManifestBytes] = await Promise.all([
    readFile(path.join(workspaceRoot, candidateResponsePath)),
    readFile(path.join(workspaceRoot, runManifestPath))
  ]);
  assert.deepEqual(savedCandidateBytes, artifacts.responseBytes);
  assert.deepEqual(savedManifestBytes, artifacts.manifestBytes);
});
