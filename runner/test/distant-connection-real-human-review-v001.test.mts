import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';

import {
  DistantConnectionRealHumanReviewErrorV001,
  buildDistantConnectionRealHumanReviewArtifactsV001
} from '../src/distant-connection-real-human-review-v001.js';

const workspaceRoot = path.resolve(import.meta.dirname, '..', '..');
const candidateResponsePath =
  'evals/clip_composition/outputs/work-distant-connection-luna-b6-candidates-ymUsGrT6EaA-v001/candidate-response-v001.json';
const semanticUtterancePath =
  'evals/clip_composition/outputs/work-distant-connection-semantic-utterance-ymUsGrT6EaA-v001/semantic-utterance-artifact-v001.json';
const sourcePackagePath =
  'evals/clip_composition/outputs/work-distant-connection-luna-source-package-direction-clarified-ymUsGrT6EaA-v001/source-package-v001.json';
const b6RunManifestPath =
  'evals/clip_composition/outputs/work-distant-connection-luna-b6-candidates-ymUsGrT6EaA-v001/b6-run-manifest-v001.json';
const reviewRoot =
  'evals/clip_composition/outputs/work-distant-connection-human-review-ymUsGrT6EaA-v001';
const reviewPagePath = `${reviewRoot}/review.html`;
const reviewManifestPath = `${reviewRoot}/review-manifest-v001.json`;
const candidateSha = '3fa51bcf8c7fd604b316c94cd7a522adf81793a095c0bd3ebbc74b375fdb9c1e';
const semanticSha = 'e4eb9657994df2814c398a47e751e91d973db28c9ce674dc16f6eaea71f7ffd2';

function sha256(bytes: Uint8Array): string {
  return createHash('sha256').update(bytes).digest('hex');
}

async function input() {
  const [
    candidateResponseBytes,
    semanticUtteranceBytes,
    sourcePackageBytes,
    b6RunManifestBytes
  ] = await Promise.all([
    readFile(path.join(workspaceRoot, candidateResponsePath)),
    readFile(path.join(workspaceRoot, semanticUtterancePath)),
    readFile(path.join(workspaceRoot, sourcePackagePath)),
    readFile(path.join(workspaceRoot, b6RunManifestPath))
  ]);
  return {
    candidateResponsePath,
    candidateResponseBytes,
    expectedCandidateResponseSha256: candidateSha,
    semanticUtterancePath,
    semanticUtteranceBytes,
    expectedSemanticUtteranceSha256: semanticSha,
    sourcePackagePath,
    sourcePackageBytes,
    b6RunManifestPath,
    b6RunManifestBytes,
    reviewPagePath
  };
}

test('実配信候補2件を本文・時刻・時間差・コメント起点付きで表示する', async () => {
  const artifacts = buildDistantConnectionRealHumanReviewArtifactsV001(await input());
  const html = artifacts.reviewHtmlBytes.toString('utf8');
  for (const text of [
    'これは実配信 ymUsGrT6EaA からLunaが見つけた遠方接続候補です。',
    'candidate-000001',
    'candidate-000002',
    '00:04:09.378–00:04:15.324',
    '01:34:41.391–01:34:58.719',
    '00:11:04.354–00:11:11.316',
    '90分26.067秒',
    '6分49.030秒',
    '今年一怖いと言われるホラーゲーム',
    '昔ある女がいた彼女の子供は祭りに向かう途中で事故に遭った',
    'え、このカメラもさね、ビビらせる感じやめてほしい',
    '前半がコメント起点: comment-anchor-000067 → semantic-utterance-000067',
    '後半がコメント起点: comment-anchor-001182 → semantic-utterance-001182',
    '冒頭で紹介された「今年一番怖いと言われるホラーゲーム」',
    '作品の恐怖演出への反応として理解できる。',
    'future（未来側を探索）',
    'past（過去側を探索）',
    'strict検査 合格',
    candidateSha,
    semanticSha
  ]) assert.ok(html.includes(text), `確認ページに「${text}」がありません`);
  assert.equal((html.match(/<article class="candidate"/gu) ?? []).length, 2);
  assert.deepEqual(artifacts.manifest.candidates.map((candidate) => candidate.gapMs), [
    5_426_067,
    409_030
  ]);
  assert.ok(artifacts.manifest.candidates.every(
    (candidate) => candidate.surroundingContext.decision === 'not-shown'
  ));
});

test('正式候補・正式意味発話・source package・B6実行記録のbinding差を拒否する', async () => {
  const valid = await input();
  assert.throws(() => buildDistantConnectionRealHumanReviewArtifactsV001({
    ...valid,
    expectedCandidateResponseSha256: '0'.repeat(64)
  }), DistantConnectionRealHumanReviewErrorV001);
  assert.throws(() => buildDistantConnectionRealHumanReviewArtifactsV001({
    ...valid,
    expectedSemanticUtteranceSha256: '0'.repeat(64)
  }), DistantConnectionRealHumanReviewErrorV001);
  const changedSource = JSON.parse(valid.sourcePackageBytes.toString('utf8'));
  changedSource.semanticUtteranceBinding.fileSha256 = '0'.repeat(64);
  assert.throws(() => buildDistantConnectionRealHumanReviewArtifactsV001({
    ...valid,
    sourcePackageBytes: Buffer.from(JSON.stringify(changedSource))
  }), DistantConnectionRealHumanReviewErrorV001);
  const changedManifest = JSON.parse(valid.b6RunManifestBytes.toString('utf8'));
  changedManifest.validation.decision = 'failed';
  assert.throws(() => buildDistantConnectionRealHumanReviewArtifactsV001({
    ...valid,
    b6RunManifestBytes: Buffer.from(JSON.stringify(changedManifest))
  }), DistantConnectionRealHumanReviewErrorV001);
});

test('同一正式入力から同一の確認ページとmanifest byteを作る', async () => {
  const valid = await input();
  const first = buildDistantConnectionRealHumanReviewArtifactsV001(valid);
  const second = buildDistantConnectionRealHumanReviewArtifactsV001(valid);
  assert.deepEqual(first.reviewHtmlBytes, second.reviewHtmlBytes);
  assert.deepEqual(first.manifestBytes, second.manifestBytes);
});

test('保存済み確認ページとmanifestを正式入力からbyte同一に再構築できる', async () => {
  const [valid, savedPageBytes, savedManifestBytes] = await Promise.all([
    input(),
    readFile(path.join(workspaceRoot, reviewPagePath)),
    readFile(path.join(workspaceRoot, reviewManifestPath))
  ]);
  const built = buildDistantConnectionRealHumanReviewArtifactsV001(valid);
  assert.deepEqual(savedPageBytes, built.reviewHtmlBytes);
  assert.deepEqual(savedManifestBytes, built.manifestBytes);
  assert.equal(built.manifest.reviewPageBinding.fileSha256, sha256(savedPageBytes));
});

test('既存の正式候補・正式意味発話・B6実行記録を変更していない', async () => {
  const [candidateBytes, semanticBytes, manifestBytes] = await Promise.all([
    readFile(path.join(workspaceRoot, candidateResponsePath)),
    readFile(path.join(workspaceRoot, semanticUtterancePath)),
    readFile(path.join(workspaceRoot, b6RunManifestPath))
  ]);
  assert.equal(sha256(candidateBytes), candidateSha);
  assert.equal(sha256(semanticBytes), semanticSha);
  assert.equal(sha256(manifestBytes), '37917a92a565f9b7aa568cb5a9ba2c118d62c6d97e2659b2a370c3e2d6828ec0');
});
