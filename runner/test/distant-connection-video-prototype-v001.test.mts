import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';

import {
  DistantConnectionVideoPrototypeErrorV001,
  buildDistantConnectionVideoPrototypePlanV001,
  serializeDistantConnectionVideoPrototypePlanV001
} from '../src/distant-connection-video-prototype-v001.js';

const workspaceRoot = path.resolve(import.meta.dirname, '..', '..');
const candidateResponsePath =
  'evals/clip_composition/outputs/work-distant-connection-luna-b6-candidates-ymUsGrT6EaA-v001/candidate-response-v001.json';
const semanticUtterancePath =
  'evals/clip_composition/outputs/work-distant-connection-semantic-utterance-ymUsGrT6EaA-v001/semantic-utterance-artifact-v001.json';
const sourcePackagePath =
  'evals/clip_composition/outputs/work-distant-connection-luna-source-package-direction-clarified-ymUsGrT6EaA-v001/source-package-v001.json';
const sourceVideoPath =
  '/Users/kawafmm/workspace/zev2/evals/clip_composition/outputs/work-distant-connection-real-input-preparation-ymUsGrT6EaA-v001/source/ymUsGrT6EaA.mp4';
const candidateSha = '3fa51bcf8c7fd604b316c94cd7a522adf81793a095c0bd3ebbc74b375fdb9c1e';
const semanticSha = 'e4eb9657994df2814c398a47e751e91d973db28c9ce674dc16f6eaea71f7ffd2';
const sourceVideoSha = '79e9cf231000c18448d52541449f65ceecd6068ae800e18736c2a0c358c90537';
const widthRule = 'U+0000..U+00FF=1; other Unicode code point=2';

async function input() {
  const [candidateResponseBytes, semanticUtteranceBytes, sourcePackageBytes] = await Promise.all([
    readFile(path.join(workspaceRoot, candidateResponsePath)),
    readFile(path.join(workspaceRoot, semanticUtterancePath)),
    readFile(path.join(workspaceRoot, sourcePackagePath))
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
    sourceVideoPath,
    sourceVideoSha256: sourceVideoSha,
    expectedSourceVideoSha256: sourceVideoSha,
    maxLogicalWidthPerLine: 36,
    maxLines: 2,
    characterWidthRule: widthRule
  };
}

test('正式候補2件を、候補発話を包含する前半・後半の連結計画へ変換する', async () => {
  const plan = buildDistantConnectionVideoPrototypePlanV001(await input());
  assert.equal(plan.candidates.length, 2);
  assert.deepEqual(plan.candidates.map((row) => [
    row.candidateId,
    row.firstPart.sourceStartMs,
    row.firstPart.sourceEndMs,
    row.secondPart.sourceStartMs,
    row.secondPart.sourceEndMs,
    row.gapMs
  ]), [
    ['candidate-000001', 249_378, 255_324, 5_681_391, 5_698_719, 5_426_067],
    ['candidate-000002', 249_378, 255_324, 664_354, 671_316, 409_030]
  ]);
  assert.ok(plan.candidates.every((row) =>
    row.firstPart.boundaryDecision === 'candidate-selected-formal-utterance-closure'
    && row.secondPart.boundaryDecision === 'candidate-selected-formal-utterance-closure'));
  assert.deepEqual(plan.candidates.map((row) => row.outputDurationMs), [23_274, 12_908]);
});

test('字幕は正式発話を一度ずつ保持し、既存の2行論理幅を超えない', async () => {
  const plan = buildDistantConnectionVideoPrototypePlanV001(await input());
  for (const candidate of plan.candidates) {
    const ids = candidate.captions.flatMap((cue) => cue.semanticUtteranceIds);
    assert.deepEqual(ids, [
      ...candidate.firstPart.semanticUtteranceIds,
      ...candidate.secondPart.semanticUtteranceIds
    ]);
    assert.equal(new Set(ids).size, ids.length);
    for (const cue of candidate.captions) {
      const width = Array.from(cue.text).reduce(
        (sum, character) => sum + (/^[\u0000-\u00ff]$/u.test(character) ? 1 : 2),
        0
      );
      assert.ok(width <= 72, `${cue.cueId}の論理幅 ${width} が2行容量を超えています`);
    }
  }
});

test('正式成果物と元動画のbinding差をfail-closedで拒否する', async () => {
  const valid = await input();
  assert.throws(() => buildDistantConnectionVideoPrototypePlanV001({
    ...valid,
    expectedCandidateResponseSha256: '0'.repeat(64)
  }), DistantConnectionVideoPrototypeErrorV001);
  assert.throws(() => buildDistantConnectionVideoPrototypePlanV001({
    ...valid,
    expectedSemanticUtteranceSha256: '0'.repeat(64)
  }), DistantConnectionVideoPrototypeErrorV001);
  assert.throws(() => buildDistantConnectionVideoPrototypePlanV001({
    ...valid,
    sourceVideoSha256: '0'.repeat(64)
  }), DistantConnectionVideoPrototypeErrorV001);
});

test('同一正式入力から同一byteの連結計画を作る', async () => {
  const valid = await input();
  const first = serializeDistantConnectionVideoPrototypePlanV001(
    buildDistantConnectionVideoPrototypePlanV001(valid)
  );
  const second = serializeDistantConnectionVideoPrototypePlanV001(
    buildDistantConnectionVideoPrototypePlanV001(valid)
  );
  assert.deepEqual(first, second);
  assert.equal(createHash('sha256').update(first).digest('hex'),
    createHash('sha256').update(second).digest('hex'));
});
