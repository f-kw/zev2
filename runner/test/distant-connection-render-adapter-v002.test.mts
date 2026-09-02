import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';

import {
  DistantConnectionRenderAdapterErrorV002,
  assertDistantConnectionRenderAdapterJobV002,
  buildPresentationBaseMediaExecutionJobProjectionV002,
  buildDistantConnectionRenderAdapterJobV002,
  serializePresentationBaseMediaBuildJobProjectionV002,
  serializeDistantConnectionRenderAdapterJobV002,
  validateDistantConnectionRenderAdapterJobAgainstSourcesV002,
  type BuildDistantConnectionRenderAdapterJobV002Input
} from '../src/distant-connection-render-adapter-v002.js';

const root = path.resolve(import.meta.dirname, '..', '..');
const planPath = 'evals/clip_composition/outputs/work-distant-connection-intervalization-plan-ymUsGrT6EaA-v002/intervalization-plan-v002.json';
const candidatePath = 'evals/clip_composition/outputs/work-distant-connection-luna-b6-candidates-concrete-payoff-ymUsGrT6EaA-v001/candidate-response-v001.json';
const semanticPath = 'evals/clip_composition/outputs/work-distant-connection-semantic-utterance-ymUsGrT6EaA-v001/semantic-utterance-artifact-v001.json';
const sourcePackagePath = 'evals/clip_composition/outputs/work-distant-connection-luna-source-package-concrete-payoff-ymUsGrT6EaA-v001/source-package-v001.json';
const sourceVideoPath = 'evals/clip_composition/outputs/work-distant-connection-real-input-preparation-ymUsGrT6EaA-v001/source/ymUsGrT6EaA.mp4';
const executionSourceVideoPath =
  'evals/clip_composition/research/downloads/ymUsGrT6EaA/ymUsGrT6EaA.mp4';
const sourceVideoUri = path.join(root, sourceVideoPath);
const sourceVideoSha = '79e9cf231000c18448d52541449f65ceecd6068ae800e18736c2a0c358c90537';
const candidateIds = [
  'candidate-horror-claim-to-speed-up',
  'candidate-doctor-disappearance-to-ogre-mother'
] as const;

const sha = (bytes: Uint8Array) => createHash('sha256').update(bytes).digest('hex');
const jsonBytes = (value: unknown) => Buffer.from(`${JSON.stringify(value, null, 2)}\n`);
const read = (relativePath: string) => readFile(path.join(root, relativePath));

async function jobInput(): Promise<BuildDistantConnectionRenderAdapterJobV002Input> {
  const [planBytes, candidateBytes, semanticBytes, sourcePackageBytes,
    ...candidateFiles] = await Promise.all([
    read(planPath), read(candidatePath), read(semanticPath), read(sourcePackagePath),
    ...candidateIds.flatMap((candidateId) => [
      read(`evals/clip_composition/outputs/work-distant-connection-edit-plan-projection-ymUsGrT6EaA-v001/${candidateId}/edit-plan.json`),
      read(`evals/clip_composition/outputs/presentation/source-assembly-formalizations/ymUsGrT6EaA-${candidateId}-edit-plan-projection-v001/assembly-decision.json`)
    ])
  ]);
  const projections = candidateIds.map((candidateId, index) => {
    const bytes = candidateFiles[index * 2];
    return {
      candidateId,
      path: `evals/clip_composition/outputs/work-distant-connection-edit-plan-projection-ymUsGrT6EaA-v001/${candidateId}/edit-plan.json`,
      bytes,
      expectedFileSha256: sha(bytes)
    };
  });
  const decisions = candidateIds.map((candidateId, index) => {
    const bytes = candidateFiles[index * 2 + 1];
    return {
      candidateId,
      path: `evals/clip_composition/outputs/presentation/source-assembly-formalizations/ymUsGrT6EaA-${candidateId}-edit-plan-projection-v001/assembly-decision.json`,
      bytes,
      expectedFileSha256: sha(bytes),
      outputDirectory: `evals/clip_composition/outputs/presentation/base-media/distant-connection-${candidateId}-v002`
    };
  });
  return {
    jobId: 'distant-connection-ymUsGrT6EaA-render-adapter-job-v002',
    intervalizationPlanPath: planPath,
    intervalizationPlanBytes: planBytes,
    expectedIntervalizationPlanSha256: sha(planBytes),
    candidateResponsePath: candidatePath,
    candidateResponseBytes: candidateBytes,
    expectedCandidateResponseSha256: sha(candidateBytes),
    semanticUtterancePath: semanticPath,
    semanticUtteranceBytes: semanticBytes,
    expectedSemanticUtteranceSha256: sha(semanticBytes),
    sourcePackagePath,
    sourcePackageBytes,
    expectedSourcePackageSha256: sha(sourcePackageBytes),
    sourceVideoPath,
    sourceVideoUri,
    sourceVideoSha256: sourceVideoSha,
    expectedSourceVideoSha256: sourceVideoSha,
    editPlanProjections: projections,
    assemblyDecisions: decisions
  };
}

test('projectionと再承認を介して2候補の既存base-media build jobを生成する', async () => {
  const input = await jobInput();
  const job = buildDistantConnectionRenderAdapterJobV002(input);
  assert.deepEqual(job.candidates.map((row) => row.candidateId), [...candidateIds]);
  assert.deepEqual(job.candidates.map((row) => row.editPlanProjection.path),
    input.editPlanProjections.map((row) => row.path));
  assert.deepEqual(job.candidates.map((row) => row.assemblyDecision.path),
    input.assemblyDecisions.map((row) => row.path));
  assert.deepEqual(job.candidates.map((row) => row.baseMediaBuildJob.assemblyDecision.path),
    input.assemblyDecisions.map((row) => row.path));
  assert.ok(job.candidates.every((row) =>
    row.baseMediaBuildJob.sourceArtifact.fileSha256 === sourceVideoSha));
});

test('plan・候補・意味発話・source package・元動画をSHAで閉じる', async () => {
  const input = await jobInput();
  const job = buildDistantConnectionRenderAdapterJobV002(input);
  assert.equal(job.sourceBindings.intervalizationPlan.fileSha256,
    input.expectedIntervalizationPlanSha256);
  assert.equal(job.sourceBindings.candidateResponse.fileSha256,
    input.expectedCandidateResponseSha256);
  assert.equal(job.sourceBindings.semanticUtterance.fileSha256,
    input.expectedSemanticUtteranceSha256);
  assert.equal(job.sourceBindings.sourcePackage.fileSha256,
    input.expectedSourcePackageSha256);
  assert.equal(job.sourceBindings.sourceVideo.fileSha256, sourceVideoSha);
});

test('projection区間と再承認segmentsが同値でなければ拒否する', async () => {
  const input = await jobInput();
  const changed = JSON.parse(Buffer.from(input.assemblyDecisions[0].bytes).toString('utf8'));
  changed.payload.segments[0].sourceStartMs -= 1;
  const bytes = jsonBytes(changed);
  assert.throws(() => buildDistantConnectionRenderAdapterJobV002({
    ...input,
    assemblyDecisions: [
      {...input.assemblyDecisions[0], bytes, expectedFileSha256: sha(bytes)},
      input.assemblyDecisions[1]
    ]
  }), DistantConnectionRenderAdapterErrorV002);
});

test('projectionと組立決定の欠落・重複・順序差を拒否する', async () => {
  const input = await jobInput();
  for (const key of ['editPlanProjections', 'assemblyDecisions'] as const) {
    const values = input[key];
    for (const changed of [
      [values[0]], [values[0], values[0]], [values[1], values[0]]
    ]) assert.throws(() => buildDistantConnectionRenderAdapterJobV002({
      ...input, [key]: changed
    }), DistantConnectionRenderAdapterErrorV002);
  }
});

test('7正本のSHA差を個別に拒否する', async () => {
  const input = await jobInput();
  for (const key of [
    'expectedIntervalizationPlanSha256', 'expectedCandidateResponseSha256',
    'expectedSemanticUtteranceSha256', 'expectedSourcePackageSha256',
    'expectedSourceVideoSha256'
  ] as const) assert.throws(() => buildDistantConnectionRenderAdapterJobV002({
    ...input, [key]: '0'.repeat(64)
  }), DistantConnectionRenderAdapterErrorV002);
  assert.throws(() => buildDistantConnectionRenderAdapterJobV002({
    ...input,
    editPlanProjections: [
      {...input.editPlanProjections[0], expectedFileSha256: '0'.repeat(64)},
      input.editPlanProjections[1]
    ]
  }), DistantConnectionRenderAdapterErrorV002);
  assert.throws(() => buildDistantConnectionRenderAdapterJobV002({
    ...input,
    assemblyDecisions: [
      {...input.assemblyDecisions[0], expectedFileSha256: '0'.repeat(64)},
      input.assemblyDecisions[1]
    ]
  }), DistantConnectionRenderAdapterErrorV002);
});

test('projectionの時刻改変と別projection basisを拒否する', async () => {
  const input = await jobInput();
  const changedProjection = JSON.parse(
    Buffer.from(input.editPlanProjections[0].bytes).toString('utf8')
  );
  changedProjection.segments[0].sourceStartMs -= 1;
  const projectionBytes = jsonBytes(changedProjection);
  assert.throws(() => buildDistantConnectionRenderAdapterJobV002({
    ...input,
    editPlanProjections: [{
      ...input.editPlanProjections[0],
      bytes: projectionBytes,
      expectedFileSha256: sha(projectionBytes)
    }, input.editPlanProjections[1]]
  }), DistantConnectionRenderAdapterErrorV002);

  const changedDecision = JSON.parse(
    Buffer.from(input.assemblyDecisions[0].bytes).toString('utf8')
  );
  changedDecision.payload.basisEditPlan.path = input.editPlanProjections[1].path;
  const decisionBytes = jsonBytes(changedDecision);
  assert.throws(() => buildDistantConnectionRenderAdapterJobV002({
    ...input,
    assemblyDecisions: [{
      ...input.assemblyDecisions[0], bytes: decisionBytes,
      expectedFileSha256: sha(decisionBytes)
    }, input.assemblyDecisions[1]]
  }), DistantConnectionRenderAdapterErrorV002);
});

test('同一入力から同一formal byteを生成する', async () => {
  const first = buildDistantConnectionRenderAdapterJobV002(await jobInput());
  const second = buildDistantConnectionRenderAdapterJobV002(await jobInput());
  assert.deepEqual(
    serializeDistantConnectionRenderAdapterJobV002(first),
    serializeDistantConnectionRenderAdapterJobV002(second)
  );
});

test('embedded base-media jobを候補別の同一byteへ投影できる', async () => {
  const job = buildDistantConnectionRenderAdapterJobV002(await jobInput());
  for (const candidate of job.candidates) {
    const bytes = serializePresentationBaseMediaBuildJobProjectionV002(candidate.baseMediaBuildJob);
    assert.deepEqual(JSON.parse(bytes.toString('utf8')), candidate.baseMediaBuildJob);
    assert.deepEqual(bytes, serializePresentationBaseMediaBuildJobProjectionV002(
      candidate.baseMediaBuildJob
    ));
  }
});

test('同一inode・同一SHAの正式hard linkだけを実行pathへ投影する', async () => {
  const adapterJob = buildDistantConnectionRenderAdapterJobV002(await jobInput());
  const verificationPath =
    'evals/clip_composition/outputs/work-distant-connection-source-video-hardlink-ymUsGrT6EaA-v001/hardlink-verification-v001.json';
  const verificationBytes = await read(verificationPath);
  const formalJob = {
    ...adapterJob.candidates[0].baseMediaBuildJob,
    sourceArtifact: {
      ...adapterJob.candidates[0].baseMediaBuildJob.sourceArtifact,
      path: 'evals/clip_composition/outputs/work-distant-connection-real-input-preparation-ymUsGrT6EaA-v001/source/ymUsGrT6EaA.mp4'
    }
  };
  const projected = buildPresentationBaseMediaExecutionJobProjectionV002({
    formalJob,
    hardlinkVerificationPath: verificationPath,
    hardlinkVerificationBytes: verificationBytes,
    expectedHardlinkVerificationSha256: sha(verificationBytes),
    executionSourcePath: executionSourceVideoPath,
    outputDirectory:
      'evals/clip_composition/outputs/presentation/base-media/distant-connection-hardlink-test-v002'
  });
  assert.equal(projected.job.sourceArtifact.path, executionSourceVideoPath);
  assert.equal(projected.job.sourceArtifact.fileSha256, sourceVideoSha);
  assert.equal(projected.hardlinkVerificationBinding.fileSha256, sha(verificationBytes));
  const changed = JSON.parse(verificationBytes.toString('utf8'));
  changed.target.inode = 'different';
  const changedBytes = jsonBytes(changed);
  assert.throws(() => buildPresentationBaseMediaExecutionJobProjectionV002({
    formalJob,
    hardlinkVerificationPath: verificationPath,
    hardlinkVerificationBytes: changedBytes,
    expectedHardlinkVerificationSha256: sha(changedBytes),
    executionSourcePath: executionSourceVideoPath,
    outputDirectory: projected.job.outputDirectory
  }), DistantConnectionRenderAdapterErrorV002);
});

test('余分fieldとschema外値を拒否する', async () => {
  const job = buildDistantConnectionRenderAdapterJobV002(await jobInput());
  assert.throws(() => assertDistantConnectionRenderAdapterJobV002({...job, extra: true}),
    DistantConnectionRenderAdapterErrorV002);
  assert.throws(() => assertDistantConnectionRenderAdapterJobV002({
    ...job, schemaVersion: 'unknown'
  }), DistantConnectionRenderAdapterErrorV002);
});

test('保存済みformal dry-runは正本からの再生成byteと一致する', async () => {
  const savedPath = 'evals/clip_composition/outputs/work-distant-connection-render-adapter-ymUsGrT6EaA-v002/render-adapter-job-v002.json';
  const savedBytes = await read(savedPath);
  const saved = JSON.parse(savedBytes.toString('utf8'));
  assert.equal(sha(savedBytes), 'e1d9ca181e1fc84c0c3422dd4263ea35740b6a633f6bfa407260df16b2ddb413');
  validateDistantConnectionRenderAdapterJobAgainstSourcesV002(saved, await jobInput());
});
