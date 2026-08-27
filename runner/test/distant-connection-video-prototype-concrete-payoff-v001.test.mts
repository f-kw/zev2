import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';

const workspaceRoot = path.resolve(import.meta.dirname, '..', '..');
const root = path.join(
  workspaceRoot,
  'evals/clip_composition/outputs/presentation/distant-connection-video-prototype-concrete-payoff-ymUsGrT6EaA-v001'
);
const resultPath = path.join(root, 'video-intervalization-improvement-result-v001.json');
const reviewPath = path.join(root, 'review.html');
const candidateResponsePath = path.join(
  workspaceRoot,
  'evals/clip_composition/outputs/work-distant-connection-luna-b6-candidates-concrete-payoff-ymUsGrT6EaA-v001/candidate-response-v001.json'
);
const semanticPath = path.join(
  workspaceRoot,
  'evals/clip_composition/outputs/work-distant-connection-semantic-utterance-ymUsGrT6EaA-v001/semantic-utterance-artifact-v001.json'
);

const hash = (bytes: Uint8Array) => createHash('sha256').update(bytes).digest('hex');

test('具体的回収条件反映後の正式2候補を原因映像込みで動画化しQCを閉じる', async () => {
  const [resultBytes, reviewBytes, formalBytes] = await Promise.all([
    readFile(resultPath), readFile(reviewPath), readFile(candidateResponsePath)
  ]);
  const result = JSON.parse(resultBytes.toString('utf8'));
  const formal = JSON.parse(formalBytes.toString('utf8'));

  assert.equal(result.candidateCount, 2);
  assert.equal(result.qc.status, 'passed');
  assert.equal(result.qc.candidateOrderMatchesFormalResponse, true);
  assert.equal(result.qc.sourceVideoShaMatches, true);
  assert.equal(result.qc.candidateResponseShaMatches, true);
  assert.equal(result.qc.semanticUtteranceShaMatches, true);
  assert.equal(result.qc.unrelatedMiddleIntervalsIncluded, false);
  assert.equal(result.qc.formalCandidatesChanged, false);
  assert.equal(result.qc.firstPartsChanged, true);
  assert.equal(result.qc.firstPartsContainFormalSelections, true);
  assert.equal(result.qc.secondPartsContainFormalSelections, true);
  assert.equal(result.qc.subtitlesUseApprovedExistingProfile,
    'normal-landscape-readable-pop-v001');
  assert.equal(result.qc.apiCalls, 0);
  assert.equal(result.qc.costUsd, 0);
  assert.equal(result.qc.remoteOperations, 0);
  assert.equal(result.sourceBindings.candidateResponse.fileSha256,
    '4239b6b51d3dd3dd548a9083ac0434860182d497321a89cf07c8f53eb66586b8');
  assert.equal(result.sourceBindings.semanticUtterance.fileSha256,
    'e4eb9657994df2814c398a47e751e91d973db28c9ce674dc16f6eaea71f7ffd2');
  assert.equal(result.sourceBindings.sourceVideo.fileSha256,
    '79e9cf231000c18448d52541449f65ceecd6068ae800e18736c2a0c358c90537');

  assert.deepEqual(result.candidates.map((row: any) => ({
    id: row.candidateId,
    formalFirst: [row.formalFirstPart.sourceStartMs, row.formalFirstPart.sourceEndMs],
    selectedFirst: [row.firstPart.sourceStartMs, row.firstPart.sourceEndMs],
    formalSecond: [row.formalSecondPart.sourceStartMs, row.formalSecondPart.sourceEndMs],
    selectedSecond: [row.secondPart.sourceStartMs, row.secondPart.sourceEndMs],
    classification: row.intervalizationDecision.classification,
    qc: row.qc.status
  })), [
    {
      id: 'candidate-horror-claim-to-speed-up',
      formalFirst: [249_378, 255_324],
      selectedFirst: [246_000, 255_324],
      formalSecond: [1_984_756, 1_994_974],
      selectedSecond: [1_980_000, 1_996_000],
      classification: 'VISUAL_CAUSE_AND_REACTION_INCLUDED',
      qc: 'passed'
    },
    {
      id: 'candidate-doctor-disappearance-to-ogre-mother',
      formalFirst: [1_731_997, 1_739_620],
      selectedFirst: [1_724_755, 1_739_800],
      formalSecond: [5_698_719, 5_710_496],
      selectedSecond: [5_693_397, 5_714_097],
      classification: 'SHORT_FORM_INTERVALIZATION_LIMIT_POSSIBLE',
      qc: 'passed'
    }
  ]);

  for (const [index, candidate] of result.candidates.entries()) {
    const formalCandidate = formal.candidates[index];
    assert.equal(candidate.candidateId, formalCandidate.candidateId);
    assert.equal(candidate.anchorId, formalCandidate.anchorId);
    assert.equal(candidate.direction, formalCandidate.direction);
    assert.equal(candidate.addedUnderstanding, formalCandidate.addedUnderstanding);
    assert.deepEqual(candidate.formalFirstPart.semanticUtteranceIds,
      formalCandidate.firstPartSemanticUtteranceIds);
    assert.deepEqual(candidate.formalSecondPart.semanticUtteranceIds,
      formalCandidate.secondPartSemanticUtteranceIds);
    assert.ok(candidate.formalFirstPart.semanticUtteranceIds.every((id: string) =>
      candidate.firstPart.semanticUtteranceIds.includes(id)));
    assert.ok(candidate.formalSecondPart.semanticUtteranceIds.every((id: string) =>
      candidate.secondPart.semanticUtteranceIds.includes(id)));
    assert.equal(candidate.intervalizationDecision.formalCandidateChanged, false);
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
  assert.ok(review.includes('具体的回収条件反映後の2候補'));
  assert.ok(review.includes('単なる同一話題ではなく具体的回収か'));
  assert.ok(review.includes('短尺成立についての所見'));
});

test('具体的回収の正式候補と正式意味発話はbyte不変である', async () => {
  const [candidateBytes, semanticBytes] = await Promise.all([
    readFile(candidateResponsePath), readFile(semanticPath)
  ]);
  assert.equal(hash(candidateBytes),
    '4239b6b51d3dd3dd548a9083ac0434860182d497321a89cf07c8f53eb66586b8');
  assert.equal(hash(semanticBytes),
    'e4eb9657994df2814c398a47e751e91d973db28c9ce674dc16f6eaea71f7ffd2');
});
