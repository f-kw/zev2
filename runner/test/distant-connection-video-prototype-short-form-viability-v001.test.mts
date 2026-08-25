import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';

const workspaceRoot = path.resolve(import.meta.dirname, '..', '..');
const root = path.join(
  workspaceRoot,
  'evals/clip_composition/outputs/presentation/distant-connection-video-prototype-short-form-viability-ymUsGrT6EaA-v001'
);
const resultPath = path.join(root, 'video-intervalization-improvement-result-v001.json');
const reviewPath = path.join(root, 'review.html');
const candidateResponsePath = path.join(
  workspaceRoot,
  'evals/clip_composition/outputs/work-distant-connection-luna-b6-candidates-short-form-viability-ymUsGrT6EaA-v001/candidate-response-v001.json'
);
const semanticPath = path.join(
  workspaceRoot,
  'evals/clip_composition/outputs/work-distant-connection-semantic-utterance-ymUsGrT6EaA-v001/semantic-utterance-artifact-v001.json'
);

const hash = (bytes: Uint8Array) => createHash('sha256').update(bytes).digest('hex');

test('短尺成立条件反映後の正式3候補を既存字幕経路で動画化しQCを閉じる', async () => {
  const [resultBytes, reviewBytes, formalBytes] = await Promise.all([
    readFile(resultPath), readFile(reviewPath), readFile(candidateResponsePath)
  ]);
  const result = JSON.parse(resultBytes.toString('utf8'));
  const formal = JSON.parse(formalBytes.toString('utf8'));

  assert.equal(result.candidateCount, 3);
  assert.equal(result.qc.status, 'passed');
  assert.equal(result.qc.candidateOrderMatchesFormalResponse, true);
  assert.equal(result.qc.sourceVideoShaMatches, true);
  assert.equal(result.qc.candidateResponseShaMatches, true);
  assert.equal(result.qc.semanticUtteranceShaMatches, true);
  assert.equal(result.qc.unrelatedMiddleIntervalsIncluded, false);
  assert.equal(result.qc.formalCandidatesChanged, false);
  assert.equal(result.qc.firstPartsChanged, false);
  assert.equal(result.qc.secondPartsContainFormalSelections, true);
  assert.equal(result.qc.subtitlesUseApprovedExistingProfile,
    'normal-landscape-readable-pop-v001');
  assert.equal(result.qc.apiCalls, 0);
  assert.equal(result.qc.costUsd, 0);
  assert.equal(result.qc.remoteOperations, 0);
  assert.equal(result.sourceBindings.candidateResponse.fileSha256,
    'a73fef9ac2c1d12b46b49b0d0dab9eb6f0293aa34b89425296717fc1334b8d49');
  assert.equal(result.sourceBindings.semanticUtterance.fileSha256,
    'e4eb9657994df2814c398a47e751e91d973db28c9ce674dc16f6eaea71f7ffd2');
  assert.equal(result.sourceBindings.sourceVideo.fileSha256,
    '79e9cf231000c18448d52541449f65ceecd6068ae800e18736c2a0c358c90537');

  assert.deepEqual(result.candidates.map((row: any) => ({
    id: row.candidateId,
    first: [row.firstPart.sourceStartMs, row.firstPart.sourceEndMs],
    formalSecond: [row.formalSecondPart.sourceStartMs, row.formalSecondPart.sourceEndMs],
    selectedSecond: [row.secondPart.sourceStartMs, row.secondPart.sourceEndMs],
    durationMs: row.media.durationMs,
    classification: row.intervalizationDecision.classification,
    qc: row.qc.status
  })), [
    {
      id: 'distant-connection-001',
      first: [249_378, 265_115],
      formalSecond: [963_664, 964_925],
      selectedSecond: [958_000, 967_666],
      durationMs: 25_400,
      classification: 'SHORT_FORM_INTERVALIZATION_LIMIT_POSSIBLE',
      qc: 'passed'
    },
    {
      id: 'distant-connection-002',
      first: [3_371_723, 3_372_470],
      formalSecond: [5_681_391, 5_694_838],
      selectedSecond: [5_681_391, 5_698_719],
      durationMs: 18_066,
      classification: 'NATURAL_SENTENCE_END_EXTENSION',
      qc: 'passed'
    },
    {
      id: 'distant-connection-003',
      first: [249_378, 255_324],
      formalSecond: [1_029_974, 1_032_976],
      selectedSecond: [1_028_000, 1_033_336],
      durationMs: 11_266,
      classification: 'MINIMAL_VISUAL_LEAD_AND_REACTION_EXTENSION',
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
  assert.equal((review.match(/<video controls/gu) ?? []).length, 3);
  assert.ok(review.includes('短尺成立条件反映後の3候補'));
  assert.ok(review.includes('前→後だけで接続を理解できるか'));
  assert.ok(review.includes('短尺としてテンポを壊していないか'));
});

test('正式候補と正式意味発話はbyte不変である', async () => {
  const [candidateBytes, semanticBytes] = await Promise.all([
    readFile(candidateResponsePath), readFile(semanticPath)
  ]);
  assert.equal(hash(candidateBytes),
    'a73fef9ac2c1d12b46b49b0d0dab9eb6f0293aa34b89425296717fc1334b8d49');
  assert.equal(hash(semanticBytes),
    'e4eb9657994df2814c398a47e751e91d973db28c9ce674dc16f6eaea71f7ffd2');
});
