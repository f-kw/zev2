import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';

import {
  DistantConnectionRenderAdapterErrorV001,
  assertDistantConnectionRenderAdapterJobV001,
  assertDistantConnectionRenderAdapterResultV001,
  buildDistantConnectionRenderAdapterJobV001,
  buildDistantConnectionRenderAdapterResultV001,
  serializeDistantConnectionRenderAdapterJobV001,
  serializeDistantConnectionRenderAdapterResultV001,
  validateDistantConnectionRenderAdapterJobAgainstSourcesV001,
  validateDistantConnectionRenderAdapterResultAgainstSourcesV001,
  type BuildDistantConnectionRenderAdapterJobV001Input,
  type BuildDistantConnectionRenderAdapterResultV001Input
} from '../src/distant-connection-render-adapter-v001.js';

const root = path.resolve(import.meta.dirname, '..', '..');
const planPath =
  'evals/clip_composition/outputs/work-distant-connection-intervalization-plan-ymUsGrT6EaA-v002/intervalization-plan-v002.json';
const candidatePath =
  'evals/clip_composition/outputs/work-distant-connection-luna-b6-candidates-concrete-payoff-ymUsGrT6EaA-v001/candidate-response-v001.json';
const semanticPath =
  'evals/clip_composition/outputs/work-distant-connection-semantic-utterance-ymUsGrT6EaA-v001/semantic-utterance-artifact-v001.json';
const sourceVideoPath =
  'evals/clip_composition/outputs/work-distant-connection-real-input-preparation-ymUsGrT6EaA-v001/source/ymUsGrT6EaA.mp4';
const prototypeRoot =
  'evals/clip_composition/outputs/presentation/distant-connection-video-prototype-concrete-payoff-ymUsGrT6EaA-v001';
const validationPath = `${prototypeRoot}/video-intervalization-improvement-result-v001.json`;
const sourceVideoSha =
  '79e9cf231000c18448d52541449f65ceecd6068ae800e18736c2a0c358c90537';
const candidateIds = [
  'candidate-horror-claim-to-speed-up',
  'candidate-doctor-disappearance-to-ogre-mother'
] as const;

const sha = (bytes: Uint8Array) => createHash('sha256').update(bytes).digest('hex');
const bytes = (value: unknown) => Buffer.from(`${JSON.stringify(value, null, 2)}\n`, 'utf8');

async function read(relativePath: string) {
  return readFile(path.join(root, relativePath));
}

async function binding(relativePath: string, schemaVersion: string) {
  const artifactBytes = await read(relativePath);
  return {path: relativePath, schemaVersion, fileSha256: sha(artifactBytes), bytes: artifactBytes};
}

async function jobInput(): Promise<BuildDistantConnectionRenderAdapterJobV001Input> {
  const [planBytes, candidateBytes, semanticBytes, ...decisionBytes] = await Promise.all([
    read(planPath), read(candidatePath), read(semanticPath),
    ...candidateIds.map((id) => read(
      `evals/clip_composition/outputs/presentation/source-assembly-formalizations/ymUsGrT6EaA-${id}-v001/assembly-decision.json`
    ))
  ]);
  return {
    jobId: 'distant-connection-ymUsGrT6EaA-render-adapter-job-v001',
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
    sourceVideoSha256: sourceVideoSha,
    expectedSourceVideoSha256: sourceVideoSha,
    assemblyDecisions: candidateIds.map((candidateId, index) => ({
      candidateId,
      path: `evals/clip_composition/outputs/presentation/source-assembly-formalizations/ymUsGrT6EaA-${candidateId}-v001/assembly-decision.json`,
      bytes: decisionBytes[index],
      expectedFileSha256: sha(decisionBytes[index]),
      outputDirectory: `${prototypeRoot}/candidates/${candidateId}/render`
    }))
  };
}

async function outputFor(candidateId: typeof candidateIds[number]) {
  const renderRoot = `${prototypeRoot}/candidates/${candidateId}/render`;
  return {
    candidateId,
    baseMediaTimeline: await binding(
      `${renderRoot}/video-intervalization-improvement-candidate-v001.json`,
      'distant-connection-video-intervalization-improvement-candidate-v001'
    ),
    baseMediaTimelineValidation: await binding(
      validationPath,
      'distant-connection-video-intervalization-improvement-result-v001'
    ),
    captionOrder: await binding(
      `${renderRoot}/presentation-instruction-v001.json`,
      'distant-connection-video-prototype-instruction-v001'
    ),
    rendererResult: {
      path: `${renderRoot}/presentation-rendered-v002.mp4`,
      schemaVersion: 'media/mp4',
      fileSha256: candidateId === candidateIds[0]
        ? 'f86ca4550ad198a5153564c8ba7dd3368084105e3686ebd3ab8de5686e5a27b7'
        : '8b29f9bbe6025e31c909a080ebad5578c9ec0f363b8522bd678131d8d480cb3a'
    },
    technicalQc: await binding(
      `${renderRoot}/presentation-render-qc-v002.json`,
      'distant-connection-video-prototype-qc-v001'
    )
  };
}

async function validResultInput(): Promise<BuildDistantConnectionRenderAdapterResultV001Input> {
  const baseInput = await jobInput();
  const job = buildDistantConnectionRenderAdapterJobV001(baseInput);
  const jobBytes = serializeDistantConnectionRenderAdapterJobV001(job);
  return {
    resultId: 'distant-connection-ymUsGrT6EaA-render-adapter-result-v001',
    jobPath:
      'evals/clip_composition/outputs/work-distant-connection-render-adapter-ymUsGrT6EaA-v001/render-adapter-job-v001.json',
    jobBytes,
    expectedJobSha256: sha(jobBytes),
    intervalizationPlanPath: planPath,
    intervalizationPlanBytes: baseInput.intervalizationPlanBytes,
    expectedIntervalizationPlanSha256: baseInput.expectedIntervalizationPlanSha256,
    outputs: await Promise.all(candidateIds.map(outputFor))
  };
}

test('承認済み一般区間化計画を既存基礎映像build jobへ決定的に投影する', async () => {
  const input = await jobInput();
  const job = buildDistantConnectionRenderAdapterJobV001(input);
  assert.deepEqual(job.candidates.map((row) => row.candidateId), [...candidateIds]);
  assert.deepEqual(job.candidates.map((row) => row.baseMediaBuildJob.assemblyDecision.path),
    input.assemblyDecisions.map((row) => row.path));
  assert.ok(job.candidates.every((row) =>
    row.baseMediaBuildJob.sourceArtifact.fileSha256 === sourceVideoSha));
  assert.deepEqual(
    serializeDistantConnectionRenderAdapterJobV001(job),
    serializeDistantConnectionRenderAdapterJobV001(
      buildDistantConnectionRenderAdapterJobV001(await jobInput())
    )
  );
});

test('既存timeline・字幕注文・renderer・QCを一般resultでSHA閉包する', async () => {
  const input = await validResultInput();
  const result = buildDistantConnectionRenderAdapterResultV001(input);
  assert.equal(result.status, 'passed');
  assert.deepEqual(result.candidates.map((row) => row.candidateId), [...candidateIds]);
  assert.ok(result.candidates.every((row) => row.status === 'passed'));
  assert.deepEqual(
    serializeDistantConnectionRenderAdapterResultV001(result),
    serializeDistantConnectionRenderAdapterResultV001(
      buildDistantConnectionRenderAdapterResultV001(await validResultInput())
    )
  );
});

test('保存済み正式job/resultが同じ入力からの決定的再生成結果と一致する', async () => {
  const [savedJobBytes, savedResultBytes] = await Promise.all([
    read('evals/clip_composition/outputs/work-distant-connection-render-adapter-ymUsGrT6EaA-v001/render-adapter-job-v001.json'),
    read('evals/clip_composition/outputs/work-distant-connection-render-adapter-ymUsGrT6EaA-v001/render-adapter-result-v001.json')
  ]);
  const source = await jobInput();
  const savedJob = JSON.parse(savedJobBytes.toString('utf8'));
  const savedResult = JSON.parse(savedResultBytes.toString('utf8'));
  validateDistantConnectionRenderAdapterJobAgainstSourcesV001(savedJob, source);
  validateDistantConnectionRenderAdapterResultAgainstSourcesV001(
    savedResult,
    await validResultInput()
  );
  assert.equal(sha(savedJobBytes), '43dc2cc00b5607c2d7acacbb74b694695ce0df1039e7844764eba6d4c728fba7');
  assert.equal(sha(savedResultBytes), '063f371b594122b1a1d88d571e1f6352048b894fa4b8be0f901d04b2f486118a');
});

test('candidate欠落・重複・順序差と未承認組立を拒否する', async () => {
  const input = await jobInput();
  for (const assemblyDecisions of [
    [input.assemblyDecisions[0]],
    [input.assemblyDecisions[0], input.assemblyDecisions[0]],
    [input.assemblyDecisions[1], input.assemblyDecisions[0]]
  ]) assert.throws(() => buildDistantConnectionRenderAdapterJobV001({
    ...input, assemblyDecisions
  }), DistantConnectionRenderAdapterErrorV001);

  const changed = JSON.parse(Buffer.from(input.assemblyDecisions[0].bytes).toString('utf8'));
  changed.approval.status = 'pending';
  const changedBytes = bytes(changed);
  assert.throws(() => buildDistantConnectionRenderAdapterJobV001({
    ...input,
    assemblyDecisions: [
      {...input.assemblyDecisions[0], bytes: changedBytes, expectedFileSha256: sha(changedBytes)},
      input.assemblyDecisions[1]
    ]
  }), DistantConnectionRenderAdapterErrorV001);
});

test('plan・候補・意味発話・元動画・組立決定の各SHA差を拒否する', async () => {
  const input = await jobInput();
  for (const key of [
    'expectedIntervalizationPlanSha256',
    'expectedCandidateResponseSha256',
    'expectedSemanticUtteranceSha256',
    'expectedSourceVideoSha256'
  ] as const) assert.throws(() => buildDistantConnectionRenderAdapterJobV001({
    ...input, [key]: '0'.repeat(64)
  }), DistantConnectionRenderAdapterErrorV001);
  assert.throws(() => buildDistantConnectionRenderAdapterJobV001({
    ...input,
    assemblyDecisions: [
      {...input.assemblyDecisions[0], expectedFileSha256: '0'.repeat(64)},
      input.assemblyDecisions[1]
    ]
  }), DistantConnectionRenderAdapterErrorV001);
});

test('planと異なる時刻・output欠落重複順序差・各出力SHA差を拒否する', async () => {
  const input = await validResultInput();
  const timeline = JSON.parse(Buffer.from(input.outputs[0].baseMediaTimeline.bytes).toString('utf8'));
  timeline.firstPart.sourceStartMs -= 1;
  const alteredTimeline = bytes(timeline);
  assert.throws(() => buildDistantConnectionRenderAdapterResultV001({
    ...input,
    outputs: [{
      ...input.outputs[0],
      baseMediaTimeline: {
        ...input.outputs[0].baseMediaTimeline,
        bytes: alteredTimeline,
        fileSha256: sha(alteredTimeline)
      }
    }, input.outputs[1]]
  }), DistantConnectionRenderAdapterErrorV001);

  for (const outputs of [
    [input.outputs[0]],
    [input.outputs[0], input.outputs[0]],
    [input.outputs[1], input.outputs[0]]
  ]) assert.throws(() => buildDistantConnectionRenderAdapterResultV001({
    ...input, outputs
  }), DistantConnectionRenderAdapterErrorV001);

  for (const key of [
    'baseMediaTimeline', 'baseMediaTimelineValidation', 'captionOrder', 'technicalQc'
  ] as const) assert.throws(() => buildDistantConnectionRenderAdapterResultV001({
    ...input,
    outputs: [{
      ...input.outputs[0],
      [key]: {...input.outputs[0][key], fileSha256: '0'.repeat(64)}
    }, input.outputs[1]]
  }), DistantConnectionRenderAdapterErrorV001);
});

test('resultのplan・job・renderer・QC binding差を拒否する', async () => {
  const input = await validResultInput();
  for (const patch of [
    {expectedJobSha256: '0'.repeat(64)},
    {expectedIntervalizationPlanSha256: '0'.repeat(64)}
  ]) assert.throws(() => buildDistantConnectionRenderAdapterResultV001({
    ...input, ...patch
  }), DistantConnectionRenderAdapterErrorV001);
  assert.throws(() => buildDistantConnectionRenderAdapterResultV001({
    ...input,
    outputs: [{
      ...input.outputs[0],
      rendererResult: {...input.outputs[0].rendererResult, fileSha256: '0'.repeat(64)}
    }, input.outputs[1]]
  }), DistantConnectionRenderAdapterErrorV001);
});

test('余分fieldとschema外構造をjob/resultで拒否する', async () => {
  const job = buildDistantConnectionRenderAdapterJobV001(await jobInput());
  assert.throws(() => assertDistantConnectionRenderAdapterJobV001({...job, extra: true}),
    DistantConnectionRenderAdapterErrorV001);
  const result = buildDistantConnectionRenderAdapterResultV001(await validResultInput());
  assert.throws(() => assertDistantConnectionRenderAdapterResultV001({
    ...result,
    candidates: [{...result.candidates[0], status: 'failed'}, result.candidates[1]]
  }), DistantConnectionRenderAdapterErrorV001);
});
