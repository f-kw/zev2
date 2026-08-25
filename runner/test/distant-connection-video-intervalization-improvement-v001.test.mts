import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';

const workspaceRoot = path.resolve(import.meta.dirname, '..', '..');
const root = path.join(
  workspaceRoot,
  'evals/clip_composition/outputs/presentation/distant-connection-video-intervalization-improvement-ymUsGrT6EaA-v001'
);
const resultPath = path.join(root, 'video-intervalization-improvement-result-v001.json');
const reviewPath = path.join(root, 'review.html');
const candidateResponsePath = path.join(
  workspaceRoot,
  'evals/clip_composition/outputs/work-distant-connection-luna-b6-candidates-quality-increment-ymUsGrT6EaA-v001/candidate-response-v001.json'
);
const semanticPath = path.join(
  workspaceRoot,
  'evals/clip_composition/outputs/work-distant-connection-semantic-utterance-ymUsGrT6EaA-v001/semantic-utterance-artifact-v001.json'
);
const priorPrototypeRoot = path.join(
  workspaceRoot,
  'evals/clip_composition/outputs/presentation/distant-connection-video-prototype-quality-increment-ymUsGrT6EaA-v001'
);

const hash = (bytes: Uint8Array) => createHash('sha256').update(bytes).digest('hex');

test('正式候補を変えず後半区間だけを現物根拠で改善し既存描画QCを閉じる', async () => {
  const [resultBytes, reviewBytes, formalBytes] = await Promise.all([
    readFile(resultPath), readFile(reviewPath), readFile(candidateResponsePath)
  ]);
  const result = JSON.parse(resultBytes.toString('utf8'));
  const formal = JSON.parse(formalBytes.toString('utf8'));

  assert.equal(result.schemaVersion,
    'distant-connection-video-intervalization-improvement-result-v001');
  assert.equal(result.candidateCount, 2);
  assert.equal(result.qc.status, 'passed');
  assert.equal(result.qc.candidateOrderMatchesFormalResponse, true);
  assert.equal(result.qc.sourceVideoShaMatches, true);
  assert.equal(result.qc.candidateResponseShaMatches, true);
  assert.equal(result.qc.semanticUtteranceShaMatches, true);
  assert.equal(result.qc.formalCandidatesChanged, false);
  assert.equal(result.qc.firstPartsChanged, false);
  assert.equal(result.qc.secondPartsContainFormalSelections, true);
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
    formalSecond: [row.formalSecondPart.sourceStartMs, row.formalSecondPart.sourceEndMs],
    improvedSecond: [row.secondPart.sourceStartMs, row.secondPart.sourceEndMs],
    classification: row.intervalizationDecision.classification,
    qc: row.qc.status
  })), [
    {
      id: 'camera-fear-escalation',
      first: [664_354, 671_316],
      formalSecond: [1_412_798, 1_426_409],
      improvedSecond: [1_377_918, 1_426_649],
      classification: 'B_INTERVALIZATION_DEFECT_CONFIRMED',
      qc: 'passed'
    },
    {
      id: 'medicine-effect-payoff',
      first: [1_680_130, 1_686_233],
      formalSecond: [4_398_688, 4_400_430],
      improvedSecond: [4_389_098, 4_412_003],
      classification: 'B_INTERVALIZATION_DEFECT_CONFIRMED_SEMANTIC_STRENGTH_REMAINS_HUMAN_DECISION',
      qc: 'passed'
    }
  ]);

  for (const [index, candidate] of result.candidates.entries()) {
    const formalCandidate = formal.candidates[index];
    assert.equal(candidate.candidateId, formalCandidate.candidateId);
    assert.equal(candidate.anchorId, formalCandidate.anchorId);
    assert.equal(candidate.direction, formalCandidate.direction);
    assert.equal(candidate.addedUnderstanding, formalCandidate.addedUnderstanding);
    assert.deepEqual(candidate.firstPart.semanticUtteranceIds,
      formalCandidate.firstPartSemanticUtteranceIds);
    assert.deepEqual(candidate.formalSecondPart.semanticUtteranceIds,
      formalCandidate.secondPartSemanticUtteranceIds);
    assert.ok(candidate.formalSecondPart.semanticUtteranceIds.every((id: string) =>
      candidate.secondPart.semanticUtteranceIds.includes(id)));
    assert.equal(candidate.intervalizationDecision.formalCandidateChanged, false);
    assert.equal(candidate.intervalizationDecision.firstPartChanged, false);
    assert.equal(candidate.intervalizationDecision.secondPartOnlyExpanded, true);
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
  assert.ok(review.includes('Lunaが選んだ意味上の発話は変えず'));
  assert.ok(review.includes('旧後半'));
  assert.ok(review.includes('改善後半'));
});

test('正式候補・正式意味発話・既存動画試作をbyte不変に保つ', async () => {
  const [candidateBytes, semanticBytes, oldPlanBytes, oldResultBytes, oldReviewBytes] =
    await Promise.all([
      readFile(candidateResponsePath),
      readFile(semanticPath),
      readFile(path.join(priorPrototypeRoot, 'video-prototype-plan-v001.json')),
      readFile(path.join(priorPrototypeRoot, 'video-prototype-result-v001.json')),
      readFile(path.join(priorPrototypeRoot, 'review.html'))
    ]);
  assert.equal(hash(candidateBytes),
    '8c8f1aa5bf69eb38076ce9ccdffab2f94cb2e8c2348695da2f3b45b9ad3b114d');
  assert.equal(hash(semanticBytes),
    'e4eb9657994df2814c398a47e751e91d973db28c9ce674dc16f6eaea71f7ffd2');
  assert.equal(hash(oldPlanBytes),
    'c85fb7b94fdebf61746b109156adb8cca90aa2cdb618ab2b3e13f90f710c54ef');
  assert.equal(hash(oldResultBytes),
    '194e8749adbd28c78118caead50c278ea5d2d0949d9c2bfdc431c6646f1b740f');
  assert.equal(hash(oldReviewBytes),
    '7c3b45bd4e31102e1a3d32310a229097f9f06b0e67e9e1b3496b9165e55197ea');
});
