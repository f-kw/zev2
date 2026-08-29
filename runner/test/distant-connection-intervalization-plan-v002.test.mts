import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';

import {
  DistantConnectionIntervalizationPlanErrorV002,
  assertDistantConnectionIntervalizationPlanV002,
  buildDistantConnectionIntervalizationPlanV002,
  serializeDistantConnectionIntervalizationPlanV002,
  validateDistantConnectionIntervalizationPlanAgainstSourcesV002,
  type DistantConnectionIntervalizationDecisionV002
} from '../src/distant-connection-intervalization-plan-v002.js';

const workspaceRoot = path.resolve(import.meta.dirname, '..', '..');
const candidateResponsePath =
  'evals/clip_composition/outputs/work-distant-connection-luna-b6-candidates-concrete-payoff-ymUsGrT6EaA-v001/candidate-response-v001.json';
const semanticUtterancePath =
  'evals/clip_composition/outputs/work-distant-connection-semantic-utterance-ymUsGrT6EaA-v001/semantic-utterance-artifact-v001.json';
const sourcePackagePath =
  'evals/clip_composition/outputs/work-distant-connection-luna-source-package-concrete-payoff-ymUsGrT6EaA-v001/source-package-v001.json';
const legacyVideoResultPath =
  'evals/clip_composition/outputs/presentation/distant-connection-video-prototype-concrete-payoff-ymUsGrT6EaA-v001/video-intervalization-improvement-result-v001.json';
const artifactPath =
  'evals/clip_composition/outputs/work-distant-connection-intervalization-plan-ymUsGrT6EaA-v002/intervalization-plan-v002.json';
const candidateResponseSha =
  '4239b6b51d3dd3dd548a9083ac0434860182d497321a89cf07c8f53eb66586b8';
const semanticUtteranceSha =
  'e4eb9657994df2814c398a47e751e91d973db28c9ce674dc16f6eaea71f7ffd2';
const sourcePackageSha =
  '23d555928762e5a98ccf13c291e0a80ae1935a5cd49010f36512498f5033f6df';
const legacyVideoResultSha =
  '8137a990774f78974008e8bbe8555f8618ce4933a968dd3295c22b017db2b527';

const sha256 = (bytes: Uint8Array) => createHash('sha256').update(bytes).digest('hex');

function expansionReasons(candidateId: string, part: 'first' | 'second') {
  if (candidateId === 'candidate-horror-claim-to-speed-up') {
    return part === 'first'
      ? ['candidate-utterance-containment', 'minimal-introduction-context'] as const
      : ['candidate-utterance-containment', 'cause-visual', 'natural-ending'] as const;
  }
  return [
    'candidate-utterance-containment',
    'minimal-introduction-context',
    'natural-ending'
  ] as const;
}

async function sourceInput() {
  const [
    candidateResponseBytes,
    semanticUtteranceBytes,
    sourcePackageBytes,
    legacyVideoResultBytes
  ] = await Promise.all([
    readFile(path.join(workspaceRoot, candidateResponsePath)),
    readFile(path.join(workspaceRoot, semanticUtterancePath)),
    readFile(path.join(workspaceRoot, sourcePackagePath)),
    readFile(path.join(workspaceRoot, legacyVideoResultPath))
  ]);
  assert.equal(sha256(legacyVideoResultBytes), legacyVideoResultSha);
  const legacy = JSON.parse(legacyVideoResultBytes.toString('utf8'));
  const decisions: DistantConnectionIntervalizationDecisionV002[] = legacy.candidates.map(
    (candidate: any) => ({
      candidateId: candidate.candidateId,
      firstPart: {
        sourceStartMs: candidate.firstPart.sourceStartMs,
        sourceEndMs: candidate.firstPart.sourceEndMs,
        includedSemanticUtteranceIds: candidate.firstPart.semanticUtteranceIds,
        expansionReasons: [...expansionReasons(candidate.candidateId, 'first')],
        reason: candidate.intervalizationDecision.boundaryReason
      },
      secondPart: {
        sourceStartMs: candidate.secondPart.sourceStartMs,
        sourceEndMs: candidate.secondPart.sourceEndMs,
        includedSemanticUtteranceIds: candidate.secondPart.semanticUtteranceIds,
        expansionReasons: [...expansionReasons(candidate.candidateId, 'second')],
        reason: candidate.intervalizationDecision.boundaryReason
      },
      shortFormViabilityObservation: candidate.intervalizationDecision.shortFormAssessment
    })
  );
  return {
    candidateResponsePath,
    candidateResponseBytes,
    expectedCandidateResponseSha256: candidateResponseSha,
    semanticUtterancePath,
    semanticUtteranceBytes,
    expectedSemanticUtteranceSha256: semanticUtteranceSha,
    sourcePackagePath,
    sourcePackageBytes,
    expectedSourcePackageSha256: sourcePackageSha,
    decisions
  };
}

test('正式候補2件を同順で完全被覆する一般区間化計画を生成する', async () => {
  const input = await sourceInput();
  const plan = buildDistantConnectionIntervalizationPlanV002(input);
  assert.equal(plan.sourceVideoId, 'ymUsGrT6EaA');
  assert.equal(plan.candidateCount, 2);
  assert.deepEqual(
    plan.candidates.map((candidate) => candidate.candidateId),
    ['candidate-horror-claim-to-speed-up', 'candidate-doctor-disappearance-to-ogre-mother']
  );
  assert.equal(plan.sourceBindings.candidateResponse.fileSha256, candidateResponseSha);
  assert.equal(plan.sourceBindings.semanticUtterance.fileSha256, semanticUtteranceSha);
  assert.equal(plan.sourceBindings.sourcePackage.fileSha256, sourcePackageSha);
  validateDistantConnectionIntervalizationPlanAgainstSourcesV002(plan, input);
});

test('既存2候補の区間・正式候補包含・区間理由を同じ意味で再現する', async () => {
  const input = await sourceInput();
  const plan = buildDistantConnectionIntervalizationPlanV002(input);
  assert.deepEqual(plan.candidates.map((candidate) => ({
    candidateId: candidate.candidateId,
    firstStartMs: candidate.firstPart.sourceStartMs,
    firstEndMs: candidate.firstPart.sourceEndMs,
    secondStartMs: candidate.secondPart.sourceStartMs,
    secondEndMs: candidate.secondPart.sourceEndMs,
    firstIds: candidate.firstPart.includedSemanticUtteranceIds,
    secondIds: candidate.secondPart.includedSemanticUtteranceIds,
    shortForm: candidate.shortFormViabilityObservation
  })), input.decisions.map((decision) => ({
    candidateId: decision.candidateId,
    firstStartMs: decision.firstPart.sourceStartMs,
    firstEndMs: decision.firstPart.sourceEndMs,
    secondStartMs: decision.secondPart.sourceStartMs,
    secondEndMs: decision.secondPart.sourceEndMs,
    firstIds: decision.firstPart.includedSemanticUtteranceIds,
    secondIds: decision.secondPart.includedSemanticUtteranceIds,
    shortForm: decision.shortFormViabilityObservation
  })));
  for (const candidate of plan.candidates) {
    assert.equal(candidate.candidateMeaningChanged, false);
    assert.ok(candidate.formalCandidate.firstPartSemanticUtteranceIds.every((id) =>
      candidate.firstPart.includedSemanticUtteranceIds.includes(id)));
    assert.ok(candidate.formalCandidate.secondPartSemanticUtteranceIds.every((id) =>
      candidate.secondPart.includedSemanticUtteranceIds.includes(id)));
  }
});

test('原因映像・最小導入文脈・自然終端を別の区間拡張理由として保存する', async () => {
  const plan = buildDistantConnectionIntervalizationPlanV002(await sourceInput());
  const horror = plan.candidates[0];
  assert.ok(horror.firstPart.expansionReasons.includes('minimal-introduction-context'));
  assert.ok(horror.secondPart.expansionReasons.includes('cause-visual'));
  assert.ok(horror.secondPart.expansionReasons.includes('natural-ending'));
  assert.match(horror.secondPart.reason, /追跡が加速/u);
  assert.match(plan.candidates[1].shortFormViabilityObservation, /人間確認/u);
});

test('同一入力から同一formal byteを生成する', async () => {
  const input = await sourceInput();
  const first = serializeDistantConnectionIntervalizationPlanV002(
    buildDistantConnectionIntervalizationPlanV002(input)
  );
  const second = serializeDistantConnectionIntervalizationPlanV002(
    buildDistantConnectionIntervalizationPlanV002(input)
  );
  assert.deepEqual(first, second);
});

test('未知・欠落・重複・順序不一致candidateを拒否する', async () => {
  const input = await sourceInput();
  const first = input.decisions[0];
  const second = input.decisions[1];
  for (const decisions of [
    [first],
    [first, first],
    [second, first],
    [{...first, candidateId: 'unknown-candidate'}, second]
  ]) {
    assert.throws(() => buildDistantConnectionIntervalizationPlanV002({
      ...input,
      decisions
    }), DistantConnectionIntervalizationPlanErrorV002);
  }
});

test('正式候補発話を包含しない区間とfirst・second取り違えを拒否する', async () => {
  const input = await sourceInput();
  const missingFormal = structuredClone(input.decisions);
  missingFormal[0].firstPart.includedSemanticUtteranceIds.shift();
  assert.throws(() => buildDistantConnectionIntervalizationPlanV002({
    ...input,
    decisions: missingFormal
  }), DistantConnectionIntervalizationPlanErrorV002);

  const swapped = structuredClone(input.decisions);
  [swapped[0].firstPart, swapped[0].secondPart] = [swapped[0].secondPart, swapped[0].firstPart];
  assert.throws(() => buildDistantConnectionIntervalizationPlanV002({
    ...input,
    decisions: swapped
  }), DistantConnectionIntervalizationPlanErrorV002);
});

test('3入力のSHA不一致をそれぞれ拒否する', async () => {
  const input = await sourceInput();
  for (const key of [
    'expectedCandidateResponseSha256',
    'expectedSemanticUtteranceSha256',
    'expectedSourcePackageSha256'
  ] as const) {
    assert.throws(() => buildDistantConnectionIntervalizationPlanV002({
      ...input,
      [key]: '0'.repeat(64)
    }), DistantConnectionIntervalizationPlanErrorV002);
  }
});

test('不正時刻・発話途中境界・区間拡張理由の欠落を拒否する', async () => {
  const input = await sourceInput();
  const cases = [
    (decisions: typeof input.decisions) => {
      decisions[0].firstPart.sourceEndMs = decisions[0].firstPart.sourceStartMs;
    },
    (decisions: typeof input.decisions) => {
      decisions[0].firstPart.sourceStartMs = 249_400;
    },
    (decisions: typeof input.decisions) => {
      decisions[0].firstPart.expansionReasons = ['candidate-utterance-containment'];
    }
  ];
  for (const mutate of cases) {
    const decisions = structuredClone(input.decisions);
    mutate(decisions);
    assert.throws(() => buildDistantConnectionIntervalizationPlanV002({
      ...input,
      decisions
    }), DistantConnectionIntervalizationPlanErrorV002);
  }
});

test('余分field・schema外値・sourceVideoId差を拒否する', async () => {
  const plan = buildDistantConnectionIntervalizationPlanV002(await sourceInput());
  assert.throws(() => assertDistantConnectionIntervalizationPlanV002({
    ...plan,
    extra: true
  }), DistantConnectionIntervalizationPlanErrorV002);
  assert.throws(() => assertDistantConnectionIntervalizationPlanV002({
    ...plan,
    candidates: [
      {
        ...plan.candidates[0],
        firstPart: {
          ...plan.candidates[0].firstPart,
          expansionReasons: ['candidate-utterance-containment', 'unknown-reason']
        }
      },
      plan.candidates[1]
    ]
  }), DistantConnectionIntervalizationPlanErrorV002);
  assert.throws(() => assertDistantConnectionIntervalizationPlanV002({
    ...plan,
    candidates: [
      {...plan.candidates[0], sourceVideoId: 'different-video'},
      plan.candidates[1]
    ]
  }), DistantConnectionIntervalizationPlanErrorV002);
});

test('保存済み一般区間化成果物は正本と判断入力からの再生成byteに一致する', async () => {
  const [input, savedBytes] = await Promise.all([
    sourceInput(),
    readFile(path.join(workspaceRoot, artifactPath))
  ]);
  const rebuilt = serializeDistantConnectionIntervalizationPlanV002(
    buildDistantConnectionIntervalizationPlanV002(input)
  );
  assert.deepEqual(savedBytes, rebuilt);
  assertDistantConnectionIntervalizationPlanV002(JSON.parse(savedBytes.toString('utf8')));
});
