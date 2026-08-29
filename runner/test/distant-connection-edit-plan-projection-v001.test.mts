import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';

import {
  DistantConnectionEditPlanProjectionErrorV001,
  assertDistantConnectionEditPlanProjectionV001,
  buildDistantConnectionEditPlanProjectionsV001,
  serializeDistantConnectionEditPlanProjectionV001,
  validateDistantConnectionEditPlanProjectionsAgainstSourcesV001,
  type BuildDistantConnectionEditPlanProjectionsV001Input
} from '../src/distant-connection-edit-plan-projection-v001.js';

const root = path.resolve(import.meta.dirname, '..', '..');
const planPath =
  'evals/clip_composition/outputs/work-distant-connection-intervalization-plan-ymUsGrT6EaA-v002/intervalization-plan-v002.json';
const candidatePath =
  'evals/clip_composition/outputs/work-distant-connection-luna-b6-candidates-concrete-payoff-ymUsGrT6EaA-v001/candidate-response-v001.json';
const semanticPath =
  'evals/clip_composition/outputs/work-distant-connection-semantic-utterance-ymUsGrT6EaA-v001/semantic-utterance-artifact-v001.json';
const sourceVideoPath =
  'evals/clip_composition/outputs/work-distant-connection-real-input-preparation-ymUsGrT6EaA-v001/source/ymUsGrT6EaA.mp4';
const sourceVideoUri = path.join(root, sourceVideoPath);
const sourceVideoSha =
  '79e9cf231000c18448d52541449f65ceecd6068ae800e18736c2a0c358c90537';
const ids = [
  'candidate-horror-claim-to-speed-up',
  'candidate-doctor-disappearance-to-ogre-mother'
];
const savedProjectionRoot =
  'evals/clip_composition/outputs/work-distant-connection-edit-plan-projection-ymUsGrT6EaA-v001';
const savedProjectionShas = [
  '961b4f529fb5abff4ffa11129e6ee55967977794ba1bb15d394c2cd8ffee9db6',
  'ea5aac7a133da5575660dc4527f14625e5eddafad191bbae98532641146d8bc0'
];

const sha = (value: Uint8Array) => createHash('sha256').update(value).digest('hex');
const jsonBytes = (value: unknown) => Buffer.from(`${JSON.stringify(value, null, 2)}\n`);

async function sourceInput(): Promise<BuildDistantConnectionEditPlanProjectionsV001Input> {
  const [planBytes, candidateBytes, semanticBytes] = await Promise.all([
    readFile(path.join(root, planPath)),
    readFile(path.join(root, candidatePath)),
    readFile(path.join(root, semanticPath))
  ]);
  return {
    intervalizationPlanPath: planPath,
    intervalizationPlanBytes: planBytes,
    expectedIntervalizationPlanSha256: sha(planBytes),
    candidateResponsePath: candidatePath,
    candidateResponseBytes: candidateBytes,
    expectedCandidateResponseSha256: sha(candidateBytes),
    semanticUtterancePath: semanticPath,
    semanticUtteranceBytes: semanticBytes,
    expectedSemanticUtteranceSha256: sha(semanticBytes),
    sourceVideoPath,
    sourceVideoUri,
    sourceVideoSha256: sourceVideoSha,
    expectedSourceVideoSha256: sourceVideoSha
  };
}

test('一般区間化計画の全candidateを既存edit_plan_json形へ投影する', async () => {
  const projections = buildDistantConnectionEditPlanProjectionsV001(await sourceInput());
  assert.equal(projections.length, 2);
  assert.deepEqual(projections.map((row) => row.candidateId), ids);
  assert.ok(projections.every((row) => row.kind === 'edit_plan_json'));
  assert.deepEqual(projections.map((row) => row.segments.map((segment) => [
    segment.sourceStartMs, segment.sourceEndMs
  ])), [
    [[246000, 255324], [1980000, 1996000]],
    [[1724755, 1739800], [5693397, 5714097]]
  ]);
});

test('candidate ID・first→second・発話包含・区間理由を無変更保持する', async () => {
  const input = await sourceInput();
  const plan = JSON.parse(Buffer.from(input.intervalizationPlanBytes).toString('utf8'));
  const projections = buildDistantConnectionEditPlanProjectionsV001(input);
  assert.deepEqual(projections.map((row) => ({
    candidateId: row.candidateId,
    segments: row.segments
  })), plan.candidates.map((row: any) => ({
    candidateId: row.candidateId,
    segments: [
      {part: 'first', sourceStartMs: row.firstPart.sourceStartMs,
        sourceEndMs: row.firstPart.sourceEndMs,
        includedSemanticUtteranceIds: row.firstPart.includedSemanticUtteranceIds,
        expansionReasons: row.firstPart.expansionReasons, reason: row.firstPart.reason},
      {part: 'second', sourceStartMs: row.secondPart.sourceStartMs,
        sourceEndMs: row.secondPart.sourceEndMs,
        includedSemanticUtteranceIds: row.secondPart.includedSemanticUtteranceIds,
        expansionReasons: row.secondPart.expansionReasons, reason: row.secondPart.reason}
    ]
  })));
});

test('4正本bindingとsourceVideoIdを保持する', async () => {
  const input = await sourceInput();
  const projections = buildDistantConnectionEditPlanProjectionsV001(input);
  for (const projection of projections) {
    assert.equal(projection.sourceVideoId, 'ymUsGrT6EaA');
    assert.equal(projection.sourceBindings.intervalizationPlan.fileSha256,
      input.expectedIntervalizationPlanSha256);
    assert.equal(projection.sourceBindings.candidateResponse.fileSha256,
      input.expectedCandidateResponseSha256);
    assert.equal(projection.sourceBindings.semanticUtterance.fileSha256,
      input.expectedSemanticUtteranceSha256);
    assert.equal(projection.sourceBindings.sourceVideo.fileSha256, sourceVideoSha);
  }
});

test('同一入力から同一formal byteを生成する', async () => {
  const first = buildDistantConnectionEditPlanProjectionsV001(await sourceInput());
  const second = buildDistantConnectionEditPlanProjectionsV001(await sourceInput());
  assert.deepEqual(first.map(serializeDistantConnectionEditPlanProjectionV001),
    second.map(serializeDistantConnectionEditPlanProjectionV001));
});

test('正式候補の欠落・重複・順序差を拒否する', async () => {
  const input = await sourceInput();
  const candidate = JSON.parse(Buffer.from(input.candidateResponseBytes).toString('utf8'));
  for (const rows of [
    [candidate.candidates[0]],
    [candidate.candidates[0], candidate.candidates[0]],
    [candidate.candidates[1], candidate.candidates[0]]
  ]) {
    const changed = {...candidate, candidates: rows};
    const changedBytes = jsonBytes(changed);
    assert.throws(() => buildDistantConnectionEditPlanProjectionsV001({
      ...input,
      candidateResponseBytes: changedBytes,
      expectedCandidateResponseSha256: sha(changedBytes)
    }), DistantConnectionEditPlanProjectionErrorV001);
  }
});

test('一般計画・候補・意味発話・元動画のSHA差を拒否する', async () => {
  const input = await sourceInput();
  for (const key of [
    'expectedIntervalizationPlanSha256',
    'expectedCandidateResponseSha256',
    'expectedSemanticUtteranceSha256',
    'expectedSourceVideoSha256'
  ] as const) assert.throws(() => buildDistantConnectionEditPlanProjectionsV001({
    ...input, [key]: '0'.repeat(64)
  }), DistantConnectionEditPlanProjectionErrorV001);
});

test('投影後の時刻差異・順序差異・candidate欠落を正本再照合で拒否する', async () => {
  const input = await sourceInput();
  const projections = buildDistantConnectionEditPlanProjectionsV001(input);
  const changedTime = structuredClone(projections);
  changedTime[0].segments[0].sourceStartMs -= 1;
  assert.throws(() => validateDistantConnectionEditPlanProjectionsAgainstSourcesV001(
    changedTime, input
  ), DistantConnectionEditPlanProjectionErrorV001);
  assert.throws(() => validateDistantConnectionEditPlanProjectionsAgainstSourcesV001(
    [projections[1], projections[0]], input
  ), DistantConnectionEditPlanProjectionErrorV001);
  assert.throws(() => validateDistantConnectionEditPlanProjectionsAgainstSourcesV001(
    [projections[0]], input
  ), DistantConnectionEditPlanProjectionErrorV001);
});

test('余分field・schema外値・first/second逆転を拒否する', async () => {
  const projection = buildDistantConnectionEditPlanProjectionsV001(await sourceInput())[0];
  assert.throws(() => assertDistantConnectionEditPlanProjectionV001({
    ...projection, extra: true
  }), DistantConnectionEditPlanProjectionErrorV001);
  assert.throws(() => assertDistantConnectionEditPlanProjectionV001({
    ...projection, kind: 'different'
  }), DistantConnectionEditPlanProjectionErrorV001);
  assert.throws(() => assertDistantConnectionEditPlanProjectionV001({
    ...projection, segments: [projection.segments[1], projection.segments[0]]
  }), DistantConnectionEditPlanProjectionErrorV001);
});

test('保存済み正式projectionは正本入力からの再生成byteと一致する', async () => {
  const input = await sourceInput();
  const rebuilt = buildDistantConnectionEditPlanProjectionsV001(input);
  const saved = await Promise.all(ids.map(async (candidateId, index) => {
    const bytes = await readFile(path.join(root, savedProjectionRoot, candidateId, 'edit-plan.json'));
    assert.equal(sha(bytes), savedProjectionShas[index]);
    const value = JSON.parse(bytes.toString('utf8'));
    assertDistantConnectionEditPlanProjectionV001(value);
    assert.deepEqual(bytes, serializeDistantConnectionEditPlanProjectionV001(rebuilt[index]));
    return value;
  }));
  validateDistantConnectionEditPlanProjectionsAgainstSourcesV001(saved, input);
});
