import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';

const workspaceRoot = path.resolve(import.meta.dirname, '..', '..');
const root = path.join(
  workspaceRoot,
  'evals/clip_composition/outputs/presentation/distant-connection-video-prototype-quality-increment-ymUsGrT6EaA-v001'
);
const resultPath = path.join(root, 'video-prototype-result-v001.json');
const reviewPath = path.join(root, 'review.html');
const candidateResponsePath = path.join(
  workspaceRoot,
  'evals/clip_composition/outputs/work-distant-connection-luna-b6-candidates-quality-increment-ymUsGrT6EaA-v001/candidate-response-v001.json'
);
const semanticPath = path.join(
  workspaceRoot,
  'evals/clip_composition/outputs/work-distant-connection-semantic-utterance-ymUsGrT6EaA-v001/semantic-utterance-artifact-v001.json'
);
const oldPrototypeRoot = path.join(
  workspaceRoot,
  'evals/clip_composition/outputs/presentation/distant-connection-video-prototype-ymUsGrT6EaA-v001'
);

const hash = (bytes: Uint8Array) => createHash('sha256').update(bytes).digest('hex');

test('探索品質改訂後の正式候補2件を既存字幕経路で動画化しQCを閉じる', async () => {
  const [resultBytes, reviewBytes, candidateBytes] = await Promise.all([
    readFile(resultPath),
    readFile(reviewPath),
    readFile(candidateResponsePath)
  ]);
  const result = JSON.parse(resultBytes.toString('utf8'));
  const formal = JSON.parse(candidateBytes.toString('utf8'));

  assert.equal(result.candidateCount, 2);
  assert.equal(result.qc.status, 'passed');
  assert.equal(result.qc.candidateOrderMatchesFormalResponse, true);
  assert.equal(result.qc.sourceVideoShaMatches, true);
  assert.equal(result.qc.candidateResponseShaMatches, true);
  assert.equal(result.qc.semanticUtteranceShaMatches, true);
  assert.equal(result.qc.unrelatedMiddleIntervalsIncluded, false);
  assert.equal(result.qc.subtitlesUseApprovedExistingProfile,
    'normal-landscape-readable-pop-v001');
  assert.equal(result.qc.apiCalls, 0);
  assert.equal(result.qc.costUsd, 0);
  assert.equal(result.qc.remoteOperations, 0);
  assert.equal(result.sourceBindings.candidateResponse.fileSha256,
    '8c8f1aa5bf69eb38076ce9ccdffab2f94cb2e8c2348695da2f3b45b9ad3b114d');
  assert.equal(result.sourceBindings.semanticUtterance.fileSha256,
    'e4eb9657994df2814c398a47e751e91d973db28c9ce674dc16f6eaea71f7ffd2');
  assert.equal(result.sourceBindings.sourceVideo.fileSha256,
    '79e9cf231000c18448d52541449f65ceecd6068ae800e18736c2a0c358c90537');

  assert.deepEqual(result.candidates.map((row: any) => ({
    id: row.candidateId,
    first: [row.firstPart.sourceStartMs, row.firstPart.sourceEndMs],
    second: [row.secondPart.sourceStartMs, row.secondPart.sourceEndMs],
    gapMs: row.gapMs,
    durationMs: row.media.durationMs,
    frames: row.media.video.frameCount,
    audio: row.media.audio !== null,
    qc: row.qc.status
  })), [
    {
      id: 'camera-fear-escalation',
      first: [664_354, 671_316],
      second: [1_412_798, 1_426_409],
      gapMs: 741_482,
      durationMs: 20_566,
      frames: 617,
      audio: true,
      qc: 'passed'
    },
    {
      id: 'medicine-effect-payoff',
      first: [1_680_130, 1_686_233],
      second: [4_398_688, 4_400_430],
      gapMs: 2_712_455,
      durationMs: 7_833,
      frames: 235,
      audio: true,
      qc: 'passed'
    }
  ]);

  assert.deepEqual(result.candidates.map((row: any) => ({
    candidateId: row.candidateId,
    anchorId: row.anchorId,
    direction: row.direction,
    firstPartSemanticUtteranceIds: row.firstPart.semanticUtteranceIds,
    secondPartSemanticUtteranceIds: row.secondPart.semanticUtteranceIds,
    addedUnderstanding: row.addedUnderstanding
  })), formal.candidates);

  for (const candidate of result.candidates) {
    const [videoBytes, qcBytes] = await Promise.all([
      readFile(path.join(workspaceRoot, candidate.video.path)),
      readFile(path.join(workspaceRoot, candidate.qc.path))
    ]);
    assert.equal(hash(videoBytes), candidate.video.fileSha256);
    assert.equal(hash(qcBytes), candidate.qc.fileSha256);
    assert.equal(candidate.media.video.codecName, 'h264');
    assert.equal(candidate.media.video.width, 1920);
    assert.equal(candidate.media.video.height, 1080);
    assert.equal(candidate.media.video.fps, 30);
    assert.equal(candidate.media.audio.codecName, 'aac');
  }

  assert.equal(hash(reviewBytes), result.reviewPage.fileSha256);
  const review = reviewBytes.toString('utf8');
  assert.equal((review.match(/<video controls/gu) ?? []).length, 2);
  for (const candidate of result.candidates) {
    assert.ok(review.includes(candidate.candidateId));
    assert.ok(review.includes(candidate.firstPart.text));
    assert.ok(review.includes(candidate.secondPart.text));
    assert.ok(review.includes(candidate.addedUnderstanding));
  }
});

test('正式候補・正式意味発話・初回動画試作をbyte不変に保つ', async () => {
  const [candidateBytes, semanticBytes, oldPlanBytes, oldResultBytes] = await Promise.all([
    readFile(candidateResponsePath),
    readFile(semanticPath),
    readFile(path.join(oldPrototypeRoot, 'video-prototype-plan-v001.json')),
    readFile(path.join(oldPrototypeRoot, 'video-prototype-result-v001.json'))
  ]);
  assert.equal(hash(candidateBytes),
    '8c8f1aa5bf69eb38076ce9ccdffab2f94cb2e8c2348695da2f3b45b9ad3b114d');
  assert.equal(hash(semanticBytes),
    'e4eb9657994df2814c398a47e751e91d973db28c9ce674dc16f6eaea71f7ffd2');
  assert.equal(hash(oldPlanBytes),
    '5f72049c6e0b804d1362f3c361e3d8b771291f3c8281dd563c81986e5c45fead');
  assert.equal(hash(oldResultBytes),
    'e112f11674394848731a5b8927203d676024e28f5831b2317521e7f734f3fe51');
});
