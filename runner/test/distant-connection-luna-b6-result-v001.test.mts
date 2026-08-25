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
  'evals/clip_composition/outputs/'
  + 'work-distant-connection-luna-source-package-quality-increment-ymUsGrT6EaA-v001/'
  + 'source-package-v001.json';
const requestPath =
  'evals/clip_composition/outputs/'
  + 'work-distant-connection-luna-b5-quality-increment-ymUsGrT6EaA-v001/'
  + 'exact-request-v001.json';
const manifestPath =
  'evals/clip_composition/outputs/'
  + 'work-distant-connection-luna-b5-quality-increment-ymUsGrT6EaA-v001/'
  + 'b5-local-manifest-v001.json';
const tokenMeasurementPath =
  'outputs/test-token-measurement.json';
const rawResponsePath =
  'outputs/test-b6-raw-response.json';
const candidateResponsePath =
  'evals/clip_composition/outputs/work-distant-connection-luna-b6-first-candidates-v001/candidate-response-v001.json';
const runManifestPath =
  'evals/clip_composition/outputs/work-distant-connection-luna-b6-first-candidates-v001/b6-run-manifest-v001.json';
const priceSnapshotPath =
  'evals/clip_composition/reports/presentation/provider-research/openai-gpt-5-6-luna-official-snapshot-20260816-v001.json';
const realTokenMeasurementPath =
  'evals/clip_composition/outputs/'
  + 'work-distant-connection-luna-b5-token-count-direction-clarified-ymUsGrT6EaA-v001/'
  + 'input-token-count-measurement-v001.json';
const realRawResponsePath =
  'evals/clip_composition/outputs/'
  + 'work-distant-connection-luna-b6-candidates-ymUsGrT6EaA-v001/'
  + 'attempt-0002/raw-response-v001.json';
const realCandidateResponsePath =
  'evals/clip_composition/outputs/'
  + 'work-distant-connection-luna-b6-candidates-ymUsGrT6EaA-v001/'
  + 'candidate-response-v001.json';
const realRunManifestPath =
  'evals/clip_composition/outputs/'
  + 'work-distant-connection-luna-b6-candidates-ymUsGrT6EaA-v001/'
  + 'b6-run-manifest-v001.json';

function sha256(bytes: Uint8Array): string {
  return createHash('sha256').update(bytes).digest('hex');
}

async function input() {
  const [
    sourcePackageBytes,
    requestBytes,
    b5ManifestBytes,
    priceSnapshotBytes
  ] = await Promise.all([
    readFile(path.join(workspaceRoot, sourcePackagePath)),
    readFile(path.join(workspaceRoot, requestPath)),
    readFile(path.join(workspaceRoot, manifestPath)),
    readFile(path.join(workspaceRoot, priceSnapshotPath))
  ]);
  const sourcePackage = JSON.parse(sourcePackageBytes.toString('utf8'));
  const manifest = JSON.parse(b5ManifestBytes.toString('utf8'));
  const priceSnapshot = JSON.parse(priceSnapshotBytes.toString('utf8'));
  const anchor = sourcePackage.anchors.find((item: any) => {
    const ordinal = Number(item.semanticUtteranceId.slice(-6));
    return ordinal < sourcePackage.utteranceCount;
  });
  const anchorOrdinal = Number(anchor.semanticUtteranceId.slice(-6));
  const secondId = `semantic-utterance-${String(anchorOrdinal + 1).padStart(6, '0')}`;
  const response = {
    schemaVersion: 'distant-connection-luna-response-v001',
    sourceVideoId: sourcePackage.sourceVideoId,
    sourcePackageBinding: {
      path: sourcePackagePath,
      schemaVersion: sourcePackage.schemaVersion,
      fileSha256: sha256(sourcePackageBytes)
    },
    candidates: [{
      candidateId: 'distant-connection-candidate-test-000001',
      anchorId: anchor.anchorId,
      firstPartSemanticUtteranceIds: [anchor.semanticUtteranceId],
      secondPartSemanticUtteranceIds: [secondId],
      addedUnderstanding: '前の発言を付けることで後の発言の意味が新しく分かります。',
      direction: 'future'
    }]
  };
  const rawResponseBytes = Buffer.from(`${JSON.stringify({
    id: 'resp_test_current_a2',
    model: 'gpt-5.6-luna',
    status: 'completed',
    error: null,
    incomplete_details: null,
    output: [{
      type: 'message',
      status: 'completed',
      role: 'assistant',
      content: [{type: 'output_text', text: JSON.stringify(response)}]
    }],
    usage: {
      input_tokens: 100,
      input_tokens_details: {cached_tokens: 0, cache_write_tokens: 0},
      output_tokens: 50,
      output_tokens_details: {reasoning_tokens: 10},
      total_tokens: 150
    }
  }, null, 2)}\n`);
  const tokenMeasurementBytes = Buffer.from(`${JSON.stringify({
    schemaVersion: 'distant-connection-luna-b5-measurement-v001',
    sourcePackageBinding: manifest.sourcePackageBinding,
    requestBinding: manifest.requestBinding,
    providerId: 'openai-api',
    modelId: 'gpt-5.6-luna',
    tokenMeasurement: {
      rawResponseBinding: {
        path: 'outputs/test-token-count-raw.json',
        schemaVersion: 'openai-responses-input-token-count-response-v001',
        fileSha256: '1'.repeat(64)
      },
      inputTokens: 100
    },
    costEvaluation: {
      priceSnapshotBinding: {
        path: priceSnapshotPath,
        schemaVersion: priceSnapshot.recordVersion,
        fileSha256: sha256(priceSnapshotBytes)
      },
      maximumNanoUsd: 500_000_000,
      projectedNanoUsd: 80_000,
      decision: 'passed'
    }
  }, null, 2)}\n`);
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

test('A2正式入力に対するHTTP 200応答をstrict検査し正式候補へ変換する', async () => {
  const artifacts = buildDistantConnectionLunaB6ResultArtifactsV001(await input());
  assert.equal(artifacts.response.candidates.length, 1);
  assert.deepEqual(artifacts.response.sourcePackageBinding, {
    path: sourcePackagePath,
    schemaVersion: 'distant-connection-luna-source-package-v001',
    fileSha256: sha256((await input()).sourcePackageBytes)
  });
  assert.deepEqual(artifacts.manifest.usage, {
    inputTokens: 100,
    cachedInputTokens: 0,
    cacheWriteTokens: 0,
    uncachedNonWriteInputTokens: 100,
    outputTokens: 50,
    reasoningTokens: 10,
    totalTokens: 150
  });
  assert.equal(artifacts.manifest.cost.totalNanoUsd, 80_000);
  assert.equal(artifacts.manifest.cost.totalUsd, 0.00008);
  assert.equal(artifacts.manifest.cost.withinMaximum, true);
  assert.equal(
    artifacts.manifest.candidateResponseBinding.fileSha256,
    sha256(artifacts.responseBytes)
  );
});

test('272,000入力token超では長文料金を全入力と出力へ適用する', async () => {
  const valid = await input();
  const raw = JSON.parse(valid.rawResponseBytes.toString('utf8'));
  raw.usage = {
    input_tokens: 300_000,
    input_tokens_details: {cached_tokens: 1_000, cache_write_tokens: 2_000},
    output_tokens: 100,
    output_tokens_details: {reasoning_tokens: 20},
    total_tokens: 300_100
  };
  const artifacts = buildDistantConnectionLunaB6ResultArtifactsV001({
    ...valid,
    rawResponseBytes: Buffer.from(`${JSON.stringify(raw, null, 2)}\n`)
  });
  assert.equal(artifacts.manifest.cost.inputNanoUsd, 118_800_000);
  assert.equal(artifacts.manifest.cost.cachedInputNanoUsd, 40_000);
  assert.equal(artifacts.manifest.cost.cacheWriteNanoUsd, 1_000_000);
  assert.equal(artifacts.manifest.cost.outputNanoUsd, 180_000);
  assert.equal(artifacts.manifest.cost.totalNanoUsd, 120_020_000);
  assert.equal(artifacts.manifest.cost.totalUsd, 0.12002);
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

test('旧B6正式candidateとrun manifestは履歴としてbyte不変に保つ', async () => {
  const [savedCandidateBytes, savedManifestBytes] = await Promise.all([
    readFile(path.join(workspaceRoot, candidateResponsePath)),
    readFile(path.join(workspaceRoot, runManifestPath))
  ]);
  assert.equal(
    sha256(savedCandidateBytes),
    'bab6f3a37d74ae99829b09258a41cf45c12b5dc5a18a651ae4ed49d8ba7196fe'
  );
  assert.equal(
    sha256(savedManifestBytes),
    '94ccf404edb86e286955778375684782612feea65e1ddd0a5ba4eaab2dfaec40'
  );
});

test('方向規則を明記した旧実配信B6成果物は履歴としてbyte不変に保つ', async () => {
  const [savedCandidateBytes, savedManifestBytes, rawResponseBytes, tokenMeasurementBytes] =
    await Promise.all([
      readFile(path.join(workspaceRoot, realCandidateResponsePath)),
      readFile(path.join(workspaceRoot, realRunManifestPath)),
      readFile(path.join(workspaceRoot, realRawResponsePath)),
      readFile(path.join(workspaceRoot, realTokenMeasurementPath))
    ]);
  assert.equal(sha256(savedCandidateBytes), '3fa51bcf8c7fd604b316c94cd7a522adf81793a095c0bd3ebbc74b375fdb9c1e');
  assert.equal(sha256(savedManifestBytes), '37917a92a565f9b7aa568cb5a9ba2c118d62c6d97e2659b2a370c3e2d6828ec0');
  assert.equal(sha256(rawResponseBytes), 'a1eada903fba4bb0fee45eeaad4e04ca5ccffe3b3c94edf59a41baea19fedaf4');
  assert.equal(sha256(tokenMeasurementBytes), '1aeba1144d3723f107d6ba6baba9fefd46feb7e3ef0a44681eb017e9e50ad06c');
});
