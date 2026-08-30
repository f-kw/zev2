import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';

import {
  DistantConnectionPresentationMeaningInputErrorV001,
  assertDistantConnectionPresentationMeaningInputV001,
  buildDistantConnectionPresentationMeaningInputV001,
  serializeDistantConnectionPresentationMeaningInputV001,
  validateDistantConnectionPresentationMeaningInputAgainstSourcesV001,
  type BuildDistantConnectionPresentationMeaningInputV001
} from '../src/distant-connection-presentation-meaning-input-v001.js';

const workspaceRoot = path.resolve(import.meta.dirname, '..', '..');
const candidateResponsePath =
  'evals/clip_composition/outputs/work-distant-connection-luna-b6-candidates-concrete-payoff-ymUsGrT6EaA-v001/candidate-response-v001.json';
const semanticUtterancePath =
  'evals/clip_composition/outputs/work-distant-connection-semantic-utterance-ymUsGrT6EaA-v001/semantic-utterance-artifact-v001.json';
const intervalizationPlanPath =
  'evals/clip_composition/outputs/work-distant-connection-intervalization-plan-ymUsGrT6EaA-v002/intervalization-plan-v002.json';
const editPlanProjectionPath =
  'evals/clip_composition/outputs/work-distant-connection-edit-plan-projection-ymUsGrT6EaA-v001/candidate-horror-claim-to-speed-up/edit-plan.json';
const assemblyDecisionPath =
  'evals/clip_composition/outputs/presentation/source-assembly-formalizations/ymUsGrT6EaA-candidate-horror-claim-to-speed-up-edit-plan-projection-v001/assembly-decision.json';
const artifactPath =
  'evals/clip_composition/outputs/work-distant-connection-presentation-meaning-input-ymUsGrT6EaA-v001/candidate-horror-claim-to-speed-up/meaning-input-v001.json';

const expected = {
  candidateResponse: '4239b6b51d3dd3dd548a9083ac0434860182d497321a89cf07c8f53eb66586b8',
  semanticUtterance: 'e4eb9657994df2814c398a47e751e91d973db28c9ce674dc16f6eaea71f7ffd2',
  intervalizationPlan: 'f9a4c6e3b524117fd46b56d8e14bb410dea9747fec1657022ab69d15019be192',
  editPlanProjection: '961b4f529fb5abff4ffa11129e6ee55967977794ba1bb15d394c2cd8ffee9db6',
  assemblyDecision: 'bd9a0394c1caec7008d291c272aba62798b17f4a9a31c880b57ba68e44a76ca3'
};

const sha256 = (bytes: Uint8Array) => createHash('sha256').update(bytes).digest('hex');

async function sourceInput(): Promise<BuildDistantConnectionPresentationMeaningInputV001> {
  const [candidateResponseBytes, semanticUtteranceBytes, intervalizationPlanBytes,
    editPlanProjectionBytes, assemblyDecisionBytes] = await Promise.all([
    readFile(path.join(workspaceRoot, candidateResponsePath)),
    readFile(path.join(workspaceRoot, semanticUtterancePath)),
    readFile(path.join(workspaceRoot, intervalizationPlanPath)),
    readFile(path.join(workspaceRoot, editPlanProjectionPath)),
    readFile(path.join(workspaceRoot, assemblyDecisionPath))
  ]);
  return {
    artifactId: 'ymUsGrT6EaA-candidate-horror-claim-to-speed-up-presentation-meaning-v001',
    candidateId: 'candidate-horror-claim-to-speed-up',
    candidateResponsePath,
    candidateResponseBytes,
    expectedCandidateResponseSha256: expected.candidateResponse,
    semanticUtterancePath,
    semanticUtteranceBytes,
    expectedSemanticUtteranceSha256: expected.semanticUtterance,
    intervalizationPlanPath,
    intervalizationPlanBytes,
    expectedIntervalizationPlanSha256: expected.intervalizationPlan,
    editPlanProjectionPath,
    editPlanProjectionBytes,
    expectedEditPlanProjectionSha256: expected.editPlanProjection,
    assemblyDecisionPath,
    assemblyDecisionBytes,
    expectedAssemblyDecisionSha256: expected.assemblyDecision
  };
}

test('5正本から前半→後半の正式字幕意味入力を無変更生成する', async () => {
  const input = await sourceInput();
  const artifact = buildDistantConnectionPresentationMeaningInputV001(input);
  assertDistantConnectionPresentationMeaningInputV001(artifact);
  validateDistantConnectionPresentationMeaningInputAgainstSourcesV001(artifact, input);
  assert.equal(artifact.sourceVideoId, 'ymUsGrT6EaA');
  assert.equal(artifact.candidateId, 'candidate-horror-claim-to-speed-up');
  assert.deepEqual(artifact.orderedParts.map((part) => part.part), ['first', 'second']);
  assert.deepEqual(
    artifact.orderedParts.map((part) => [
      part.sourceInterval.sourceStartMs,
      part.sourceInterval.sourceEndMs
    ]),
    [[246000, 255324], [1980000, 1996000]]
  );
  assert.equal(artifact.atomOccurrences.length, 38);
  assert.equal(artifact.captions[0].text,
    '今年一怖いと言われるホラーゲームおい、急に速くなった!おい、急に速くなった!');
});

test('正式候補発話・区間包含発話・字幕atomを欠落や言い換えなしで保持する', async () => {
  const artifact = buildDistantConnectionPresentationMeaningInputV001(await sourceInput());
  assert.deepEqual(
    artifact.orderedParts[0].candidateSemanticUtteranceIds,
    artifact.orderedParts[0].includedSemanticUtteranceIds
  );
  assert.deepEqual(
    artifact.orderedParts[1].candidateSemanticUtteranceIds,
    artifact.orderedParts[1].includedSemanticUtteranceIds
  );
  assert.deepEqual(
    artifact.atomOccurrences.map((atom) => atom.semanticUtteranceId),
    artifact.orderedParts.flatMap((part) => part.includedSemanticUtteranceIds)
  );
  assert.deepEqual(
    artifact.atomOccurrences.map((atom) => atom.text),
    [...'今年一怖いと言われるホラーゲームおい、急に速くなった!おい、急に速くなった!']
  );
});

test('5入力のpath・schema・SHAを正式bindingとして保持する', async () => {
  const artifact = buildDistantConnectionPresentationMeaningInputV001(await sourceInput());
  assert.deepEqual(Object.keys(artifact.sourceBindings), [
    'candidateResponse', 'semanticUtterance', 'intervalizationPlan',
    'editPlanProjection', 'assemblyDecision'
  ]);
  assert.deepEqual(
    Object.values(artifact.sourceBindings).map((binding) => binding.fileSha256),
    Object.values(expected)
  );
});

test('同一入力から同一formal byteを生成し、固定成果物と一致する', async () => {
  const input = await sourceInput();
  const first = serializeDistantConnectionPresentationMeaningInputV001(
    buildDistantConnectionPresentationMeaningInputV001(input)
  );
  const second = serializeDistantConnectionPresentationMeaningInputV001(
    buildDistantConnectionPresentationMeaningInputV001(input)
  );
  assert.deepEqual(first, second);
  const saved = await readFile(path.join(workspaceRoot, artifactPath));
  assert.deepEqual(saved, first);
  assert.match(sha256(saved), /^[0-9a-f]{64}$/u);
});

test('5正本のSHA不一致をそれぞれfail-closedで拒否する', async () => {
  const input = await sourceInput();
  for (const key of [
    'expectedCandidateResponseSha256',
    'expectedSemanticUtteranceSha256',
    'expectedIntervalizationPlanSha256',
    'expectedEditPlanProjectionSha256',
    'expectedAssemblyDecisionSha256'
  ] as const) {
    assert.throws(() => buildDistantConnectionPresentationMeaningInputV001({
      ...input,
      [key]: '0'.repeat(64)
    }), DistantConnectionPresentationMeaningInputErrorV001);
  }
});

test('未知candidate・候補欠落・候補重複を拒否する', async () => {
  const input = await sourceInput();
  assert.throws(() => buildDistantConnectionPresentationMeaningInputV001({
    ...input,
    candidateId: 'unknown-candidate'
  }), DistantConnectionPresentationMeaningInputErrorV001);

  const candidate = JSON.parse(Buffer.from(input.candidateResponseBytes).toString('utf8'));
  candidate.candidates = [candidate.candidates[1]];
  assert.throws(() => buildDistantConnectionPresentationMeaningInputV001({
    ...input,
    candidateResponseBytes: Buffer.from(`${JSON.stringify(candidate, null, 2)}\n`),
    expectedCandidateResponseSha256: sha256(Buffer.from(`${JSON.stringify(candidate, null, 2)}\n`))
  }), DistantConnectionPresentationMeaningInputErrorV001);

  candidate.candidates = [candidate.candidates[0], candidate.candidates[0]];
  const duplicateBytes = Buffer.from(`${JSON.stringify(candidate, null, 2)}\n`);
  assert.throws(() => buildDistantConnectionPresentationMeaningInputV001({
    ...input,
    candidateResponseBytes: duplicateBytes,
    expectedCandidateResponseSha256: sha256(duplicateBytes)
  }), DistantConnectionPresentationMeaningInputErrorV001);
});

test('発話追加削除・順序逆転・区間補正を拒否する', async () => {
  const input = await sourceInput();
  for (const mutate of [
    (value: any) => value.candidates[0].firstPart.includedSemanticUtteranceIds.shift(),
    (value: any) => value.candidates[0].firstPart.includedSemanticUtteranceIds.reverse(),
    (value: any) => { value.candidates[0].firstPart.sourceStartMs += 1; }
  ]) {
    const plan = JSON.parse(Buffer.from(input.intervalizationPlanBytes).toString('utf8'));
    mutate(plan);
    const bytes = Buffer.from(`${JSON.stringify(plan, null, 2)}\n`);
    assert.throws(() => buildDistantConnectionPresentationMeaningInputV001({
      ...input,
      intervalizationPlanBytes: bytes,
      expectedIntervalizationPlanSha256: sha256(bytes)
    }), DistantConnectionPresentationMeaningInputErrorV001);
  }
});

test('projection区間差・組立区間差・非human承認を拒否する', async () => {
  const input = await sourceInput();
  const projection = JSON.parse(Buffer.from(input.editPlanProjectionBytes).toString('utf8'));
  projection.segments[0].sourceStartMs += 1;
  const projectionBytes = Buffer.from(`${JSON.stringify(projection, null, 2)}\n`);
  assert.throws(() => buildDistantConnectionPresentationMeaningInputV001({
    ...input,
    editPlanProjectionBytes: projectionBytes,
    expectedEditPlanProjectionSha256: sha256(projectionBytes)
  }), DistantConnectionPresentationMeaningInputErrorV001);

  for (const mutate of [
    (value: any) => { value.payload.segments[0].sourceStartMs += 1; },
    (value: any) => { value.approval.approverType = 'agent'; }
  ]) {
    const assembly = JSON.parse(Buffer.from(input.assemblyDecisionBytes).toString('utf8'));
    mutate(assembly);
    const bytes = Buffer.from(`${JSON.stringify(assembly, null, 2)}\n`);
    assert.throws(() => buildDistantConnectionPresentationMeaningInputV001({
      ...input,
      assemblyDecisionBytes: bytes,
      expectedAssemblyDecisionSha256: sha256(bytes)
    }), DistantConnectionPresentationMeaningInputErrorV001);
  }
});

test('余分なfield・caption書換え・atom重複を拒否する', async () => {
  const artifact = buildDistantConnectionPresentationMeaningInputV001(await sourceInput());
  const cases: any[] = [
    {...structuredClone(artifact), extra: true},
    structuredClone(artifact),
    structuredClone(artifact)
  ];
  cases[1].captions[0].text = '言い換え';
  cases[2].atomOccurrences[1].atomOccurrenceId = cases[2].atomOccurrences[0].atomOccurrenceId;
  for (const value of cases) {
    assert.throws(
      () => assertDistantConnectionPresentationMeaningInputV001(value),
      DistantConnectionPresentationMeaningInputErrorV001
    );
  }
});
