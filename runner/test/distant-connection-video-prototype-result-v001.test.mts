import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';

const workspaceRoot = path.resolve(import.meta.dirname, '..', '..');
const root = path.join(
  workspaceRoot,
  'evals/clip_composition/outputs/presentation/distant-connection-video-prototype-ymUsGrT6EaA-v001'
);
const resultPath = path.join(root, 'video-prototype-result-v001.json');
const reviewPath = path.join(root, 'review.html');
const candidateResponsePath = path.join(
  workspaceRoot,
  'evals/clip_composition/outputs/work-distant-connection-luna-b6-candidates-ymUsGrT6EaA-v001/candidate-response-v001.json'
);
const semanticPath = path.join(
  workspaceRoot,
  'evals/clip_composition/outputs/work-distant-connection-semantic-utterance-ymUsGrT6EaA-v001/semantic-utterance-artifact-v001.json'
);

const hash = (bytes: Uint8Array) => createHash('sha256').update(bytes).digest('hex');

test('正式候補2件の動画・時刻・字幕QC・確認ページを一件表で閉じる', async () => {
  const [resultBytes, reviewBytes] = await Promise.all([
    readFile(resultPath),
    readFile(reviewPath)
  ]);
  const result = JSON.parse(resultBytes.toString('utf8'));
  assert.equal(result.candidateCount, 2);
  assert.equal(result.qc.status, 'passed');
  assert.equal(result.qc.candidateOrderMatchesFormalResponse, true);
  assert.equal(result.qc.sourceVideoShaMatches, true);
  assert.equal(result.qc.candidateResponseShaMatches, true);
  assert.equal(result.qc.semanticUtteranceShaMatches, true);
  assert.equal(result.qc.unrelatedMiddleIntervalsIncluded, false);
  assert.equal(result.qc.subtitlesUseApprovedExistingProfile,
    'normal-landscape-readable-pop-v001');
  assert.deepEqual(result.candidates.map((row: any) => ({
    id: row.candidateId,
    first: [row.firstPart.sourceStartMs, row.firstPart.sourceEndMs],
    second: [row.secondPart.sourceStartMs, row.secondPart.sourceEndMs],
    gapMs: row.gapMs,
    frames: row.media.video.frameCount,
    audio: row.media.audio !== null,
    qc: row.qc.status
  })), [
    {
      id: 'candidate-000001',
      first: [249_378, 255_324],
      second: [5_681_391, 5_698_719],
      gapMs: 5_426_067,
      frames: 698,
      audio: true,
      qc: 'passed'
    },
    {
      id: 'candidate-000002',
      first: [249_378, 255_324],
      second: [664_354, 671_316],
      gapMs: 409_030,
      frames: 387,
      audio: true,
      qc: 'passed'
    }
  ]);
  for (const candidate of result.candidates) {
    const videoBytes = await readFile(path.join(workspaceRoot, candidate.video.path));
    const qcBytes = await readFile(path.join(workspaceRoot, candidate.qc.path));
    assert.equal(hash(videoBytes), candidate.video.fileSha256);
    assert.equal(hash(qcBytes), candidate.qc.fileSha256);
    assert.equal(candidate.media.video.width, 1920);
    assert.equal(candidate.media.video.height, 1080);
    assert.equal(candidate.media.video.fps, 30);
  }
  assert.equal(hash(reviewBytes), result.reviewPage.fileSha256);
  const review = reviewBytes.toString('utf8');
  assert.equal((review.match(/<video controls/gu) ?? []).length, 2);
  assert.ok(review.includes('candidate-000001'));
  assert.ok(review.includes('candidate-000002'));
});

test('既存の正式候補と正式意味発話のbyteを変更していない', async () => {
  const [candidateBytes, semanticBytes] = await Promise.all([
    readFile(candidateResponsePath),
    readFile(semanticPath)
  ]);
  assert.equal(hash(candidateBytes),
    '3fa51bcf8c7fd604b316c94cd7a522adf81793a095c0bd3ebbc74b375fdb9c1e');
  assert.equal(hash(semanticBytes),
    'e4eb9657994df2814c398a47e751e91d973db28c9ce674dc16f6eaea71f7ffd2');
});
