import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';

import {
  DistantConnectionB6HumanReviewErrorV001,
  buildDistantConnectionB6HumanReviewHtmlV001
} from '../src/distant-connection-b6-human-review-v001.js';

const workspaceRoot = path.resolve(import.meta.dirname, '..', '..');
const candidateResponsePath =
  'evals/clip_composition/outputs/work-distant-connection-luna-b6-first-candidates-v001/candidate-response-v001.json';
const sourcePackagePath =
  'evals/clip_composition/outputs/work-distant-connection-luna-source-package-v001/source-package-v001.json';
const b6RunManifestPath =
  'evals/clip_composition/outputs/work-distant-connection-luna-b6-first-candidates-v001/b6-run-manifest-v001.json';
const rawResponsePath =
  'evals/clip_composition/outputs/work-distant-connection-luna-b6-first-candidates-v001/attempt-0004/raw-response-v001.json';
const reviewPagePath =
  'evals/clip_composition/outputs/work-distant-connection-b6-human-review-v001/review.html';
const candidateSha = 'bab6f3a37d74ae99829b09258a41cf45c12b5dc5a18a651ae4ed49d8ba7196fe';

function sha256(bytes: Uint8Array): string {
  return createHash('sha256').update(bytes).digest('hex');
}

async function input() {
  const [candidateResponseBytes, sourcePackageBytes, b6RunManifestBytes] = await Promise.all([
    readFile(path.join(workspaceRoot, candidateResponsePath)),
    readFile(path.join(workspaceRoot, sourcePackagePath)),
    readFile(path.join(workspaceRoot, b6RunManifestPath))
  ]);
  return {
    candidateResponsePath,
    candidateResponseBytes,
    expectedCandidateResponseSha256: candidateSha,
    sourcePackagePath,
    sourcePackageBytes,
    b6RunManifestPath,
    b6RunManifestBytes
  };
}

test('正式候補2件を発話本文・方向・追加理解・strict合格付きで表示する', async () => {
  const bytes = buildDistantConnectionB6HumanReviewHtmlV001(await input());
  const html = bytes.toString('utf8');
  for (const text of [
    'これは実配信の候補品質確認ではない。発話2件の小型入力を使った、遠方接続経路の成立確認である。',
    'candidate-000001',
    'candidate-000002',
    'comment-anchor-000001',
    'comment-anchor-000002',
    'ここが今日一番大事な話です。実は裏でこういう流れがありました。',
    'だから最後にこの判断になりました。',
    '裏で起きていた流れを先に知ることで、最後にこの判断へ至った理由が新しく分かります。',
    '最後の判断に至る前に、裏で進んでいた流れと今回の話の重要性を知ることで、この判断の背景が新しく分かります。',
    '未来方向',
    '過去方向',
    'strict検査 合格',
    candidateSha
  ]) assert.ok(html.includes(text), `確認ページに「${text}」がありません`);
  assert.equal((html.match(/<article class="candidate"/gu) ?? []).length, 2);
  assert.ok(html.includes('同じ「前→後」の発話組'));
});

test('候補・source package・B6実行記録のSHA binding差を拒否する', async () => {
  const valid = await input();
  assert.throws(
    () => buildDistantConnectionB6HumanReviewHtmlV001({
      ...valid,
      expectedCandidateResponseSha256: '0'.repeat(64)
    }),
    DistantConnectionB6HumanReviewErrorV001
  );
  const changedManifest = JSON.parse(valid.b6RunManifestBytes.toString('utf8'));
  changedManifest.candidateResponseBinding.fileSha256 = '0'.repeat(64);
  assert.throws(
    () => buildDistantConnectionB6HumanReviewHtmlV001({
      ...valid,
      b6RunManifestBytes: Buffer.from(JSON.stringify(changedManifest))
    }),
    DistantConnectionB6HumanReviewErrorV001
  );
});

test('同一正式入力から同一の確認ページbyteを作る', async () => {
  const valid = await input();
  const first = buildDistantConnectionB6HumanReviewHtmlV001(valid);
  const second = buildDistantConnectionB6HumanReviewHtmlV001(valid);
  assert.deepEqual(first, second);
});

test('保存済み確認ページは正式入力からbyte同一に再構築できる', async () => {
  const [valid, savedPageBytes] = await Promise.all([
    input(),
    readFile(path.join(workspaceRoot, reviewPagePath))
  ]);
  assert.deepEqual(savedPageBytes, buildDistantConnectionB6HumanReviewHtmlV001(valid));
});

test('既存B6正本3件は固定済みSHAから変わっていない', async () => {
  const [candidateBytes, manifestBytes, rawBytes] = await Promise.all([
    readFile(path.join(workspaceRoot, candidateResponsePath)),
    readFile(path.join(workspaceRoot, b6RunManifestPath)),
    readFile(path.join(workspaceRoot, rawResponsePath))
  ]);
  assert.equal(sha256(candidateBytes), candidateSha);
  assert.equal(sha256(manifestBytes), '94ccf404edb86e286955778375684782612feea65e1ddd0a5ba4eaab2dfaec40');
  assert.equal(sha256(rawBytes), '0979280a80a996d2ec83fb417a7ab1cc5d6c3b917b1c53991013e5415d10b5cd');
});
