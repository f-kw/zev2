import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';

import {
  DistantConnectionLunaB6ResultErrorV002,
  buildDistantConnectionLunaB6ResultArtifactsV002
} from '../src/distant-connection-luna-b6-result-v002.js';

const workspaceRoot = path.resolve(import.meta.dirname, '..', '..');
const sourcePackagePath =
  'evals/clip_composition/outputs/'
  + 'work-distant-connection-luna-source-package-op-ed-rejection-feedback-ymUsGrT6EaA-v002/'
  + 'source-package-v002.json';
const requestPath =
  'evals/clip_composition/outputs/'
  + 'work-distant-connection-luna-b5-op-ed-rejection-feedback-ymUsGrT6EaA-v002/'
  + 'exact-request-v002.json';
const b5LocalManifestPath =
  'evals/clip_composition/outputs/'
  + 'work-distant-connection-luna-b5-op-ed-rejection-feedback-ymUsGrT6EaA-v002/'
  + 'b5-local-manifest-v002.json';
const rawResponsePath = 'outputs/test-b6-v002-raw-response.json';
const candidateResponsePath = 'outputs/test-b6-v002-candidate-response.json';
const priceSnapshotPath =
  'evals/clip_composition/reports/presentation/provider-research/'
  + 'openai-gpt-5-6-luna-official-snapshot-20260816-v001.json';

function sha256(bytes: Uint8Array): string {
  return createHash('sha256').update(bytes).digest('hex');
}

async function validInput() {
  const [sourcePackageBytes, requestBytes, b5LocalManifestBytes, priceSnapshotBytes] =
    await Promise.all([
      readFile(path.join(workspaceRoot, sourcePackagePath)),
      readFile(path.join(workspaceRoot, requestPath)),
      readFile(path.join(workspaceRoot, b5LocalManifestPath)),
      readFile(path.join(workspaceRoot, priceSnapshotPath))
    ]);
  const sourcePackage = JSON.parse(sourcePackageBytes.toString('utf8'));
  const anchor = sourcePackage.anchors.find((item: any) => {
    const ordinal = Number(item.semanticUtteranceId.slice(-6));
    return ordinal < sourcePackage.utteranceCount;
  });
  const anchorOrdinal = Number(anchor.semanticUtteranceId.slice(-6));
  const response = {
    schemaVersion: 'distant-connection-luna-response-v001',
    sourceVideoId: sourcePackage.sourceVideoId,
    sourcePackageBinding: {
      path: sourcePackagePath,
      schemaVersion: sourcePackage.schemaVersion,
      fileSha256: sha256(sourcePackageBytes)
    },
    candidates: [{
      candidateId: 'distant-connection-v002-test-000001',
      anchorId: anchor.anchorId,
      firstPartSemanticUtteranceIds: [anchor.semanticUtteranceId],
      secondPartSemanticUtteranceIds: [
        `semantic-utterance-${String(anchorOrdinal + 1).padStart(6, '0')}`
      ],
      addedUnderstanding: '前半によって後半の意味が増える。',
      direction: 'future'
    }]
  };
  const raw = {
    id: 'resp_test_v002',
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
      input_tokens: 900_000,
      input_tokens_details: {cached_tokens: 800_000, cache_write_tokens: 0},
      output_tokens: 1_000,
      output_tokens_details: {reasoning_tokens: 600},
      total_tokens: 901_000
    }
  };
  return {
    sourcePackagePath,
    sourcePackageBytes,
    requestPath,
    requestBytes,
    b5LocalManifestPath,
    b5LocalManifestBytes,
    rawResponsePath,
    rawResponseBytes: Buffer.from(`${JSON.stringify(raw, null, 2)}\n`),
    candidateResponsePath,
    priceSnapshotPath,
    priceSnapshotBytes,
    maximumNanoUsd: 1_000_000_000
  };
}

function expectCode(code: string, action: () => unknown): void {
  assert.throws(action, (error: unknown) => (
    error instanceof DistantConnectionLunaB6ResultErrorV002 && error.code === code
  ));
}

test('v002 exact requestのHTTP 200応答をstrict検査して正式候補へ変換する', async () => {
  const input = await validInput();
  const artifacts = buildDistantConnectionLunaB6ResultArtifactsV002(input);
  assert.equal(artifacts.response.candidates.length, 1);
  assert.equal(artifacts.manifest.sourcePackageBinding.schemaVersion,
    'distant-connection-luna-source-package-v002');
  assert.equal(artifacts.manifest.requestBinding.schemaVersion,
    'openai-responses-distant-connection-request-v002');
  assert.equal(artifacts.manifest.usage.inputTokens, 900_000);
  assert.equal(artifacts.manifest.cost.totalUsd, 0.0738);
  assert.equal(artifacts.manifest.cost.withinMaximum, true);
  assert.equal(
    artifacts.manifest.candidateResponseBinding.fileSha256,
    sha256(artifacts.responseBytes)
  );
});

test('source・request・B5 v002 bindingの差を拒否する', async () => {
  const input = await validInput();
  expectCode('B6_BINDING_MISMATCH', () => buildDistantConnectionLunaB6ResultArtifactsV002({
    ...input,
    sourcePackagePath: 'different/source-package-v002.json'
  }));
  expectCode('B6_BINDING_MISMATCH', () => buildDistantConnectionLunaB6ResultArtifactsV002({
    ...input,
    requestBytes: Buffer.concat([input.requestBytes, Buffer.from('changed')])
  }));
});

test('incomplete・refusal・schema不適合を正式候補にしない', async () => {
  const input = await validInput();
  const raw = JSON.parse(input.rawResponseBytes.toString('utf8'));
  expectCode('B6_RESPONSE_INCOMPLETE', () => buildDistantConnectionLunaB6ResultArtifactsV002({
    ...input,
    rawResponseBytes: Buffer.from(JSON.stringify({...raw, status: 'incomplete'}))
  }));
  const refusal = structuredClone(raw);
  refusal.output[0].content = [{type: 'refusal', refusal: 'declined'}];
  expectCode('B6_REFUSAL', () => buildDistantConnectionLunaB6ResultArtifactsV002({
    ...input,
    rawResponseBytes: Buffer.from(JSON.stringify(refusal))
  }));
  const invalid = structuredClone(raw);
  invalid.output[0].content[0].text = '{}';
  assert.throws(() => buildDistantConnectionLunaB6ResultArtifactsV002({
    ...input,
    rawResponseBytes: Buffer.from(JSON.stringify(invalid))
  }));
});

test('実費が承認上限を超える場合は正式候補を作らない', async () => {
  const input = await validInput();
  expectCode('B6_COST_LIMIT_EXCEEDED', () => buildDistantConnectionLunaB6ResultArtifactsV002({
    ...input,
    maximumNanoUsd: 1
  }));
});

test('同一保存入力から同一candidate byte・manifest byteを再構築する', async () => {
  const input = await validInput();
  const first = buildDistantConnectionLunaB6ResultArtifactsV002(input);
  const second = buildDistantConnectionLunaB6ResultArtifactsV002(input);
  assert.deepEqual(first.responseBytes, second.responseBytes);
  assert.deepEqual(first.manifestBytes, second.manifestBytes);
});
