import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';

import {
  DistantConnectionComparisonHumanReviewErrorV001,
  assertDistantConnectionComparisonHumanReviewPlanV001,
  assertDistantConnectionComparisonHumanReviewResultV001,
  buildDistantConnectionComparisonHumanReviewPageV001,
  buildDistantConnectionComparisonHumanReviewPlanV001,
  buildDistantConnectionComparisonHumanReviewResultV001,
  decodeDistantConnectionComparisonHumanReviewPlanV001,
  serializeDistantConnectionComparisonHumanReviewPlanV001,
  serializeDistantConnectionComparisonHumanReviewResultV001,
  validateDistantConnectionComparisonHumanReviewPlanAgainstSourcesV001,
  validateDistantConnectionComparisonHumanReviewResultAgainstSourcesV001,
  type BuildComparisonSourceHumanReviewV001Input,
  type BuildDistantConnectionComparisonHumanReviewPlanV001Input,
  type CandidateHumanComparisonReviewInputV001
} from '../src/distant-connection-comparison-human-review-v001.js';
import {DISTANT_CONNECTION_CANDIDATE_REVIEW_RESPONSIBILITY_V002}
  from '../src/distant-connection-candidate-review-v002.js';

const workspaceRoot = path.resolve(import.meta.dirname, '..', '..');
const o8Root =
  'evals/clip_composition/outputs/work-distant-connection-comparison-input-o8rZAhARXAc-v001';
const o8B6Root =
  'evals/clip_composition/outputs/work-distant-connection-comparison-luna-b6-candidates-o8rZAhARXAc-v001';
const ymRoot =
  'evals/clip_composition/outputs/work-distant-connection-comparison-input-ymUsGrT6EaA-v001';
const knownGoodPath =
  'evals/clip_composition/outputs/work-distant-connection-human-review-result-ymUsGrT6EaA-v002/human-review-result-v002.json';
const formalPlanPath =
  'evals/clip_composition/outputs/work-distant-connection-comparison-human-review-plan-ymUsGrT6EaA-o8rZAhARXAc-v001/human-review-plan-v001.json';

const newCandidatePath = `${o8B6Root}/candidate-response-v001.json`;
const newB6ManifestPath = `${o8B6Root}/b6-run-manifest-v001.json`;
const newSourcePackagePath = `${o8Root}/source-package-v001.json`;
const oldExactRequestPath = `${ymRoot}/exact-request-v001.json`;
const newCandidateSha = '301919134213a54783540784c537553fc283874cf676f44064165975cec3f089';
const oldExactRequestSha = '8b1a4eaa3b0844f451c4eef611310b1b4e1fa3fd4541f074a85cdcb09b273b08';
const knownGoodSha = 'fac03dc688f28e64831a7b8241cec560313cf7da3aacc585b30bf8efab270a92';

const sha256 = (bytes: Uint8Array) => createHash('sha256').update(bytes).digest('hex');
const canonical = (value: unknown) => Buffer.from(`${JSON.stringify(value, null, 2)}\n`, 'utf8');

async function planInput(): Promise<BuildDistantConnectionComparisonHumanReviewPlanV001Input> {
  const [newCandidateResponseBytes, oldExactRequestBytes, knownGoodHumanReviewResultBytes] =
    await Promise.all([
      readFile(path.join(workspaceRoot, newCandidatePath)),
      readFile(path.join(workspaceRoot, oldExactRequestPath)),
      readFile(path.join(workspaceRoot, knownGoodPath))
    ]);
  return {
    experimentId: 'distant-connection-cross-stream-comparison-20260902-v001',
    newCandidateResponsePath: newCandidatePath,
    newCandidateResponseBytes,
    expectedNewCandidateResponseSha256: newCandidateSha,
    oldExactRequestPath,
    oldExactRequestBytes,
    expectedOldExactRequestSha256: oldExactRequestSha,
    knownGoodHumanReviewResultPath: knownGoodPath,
    knownGoodHumanReviewResultBytes,
    expectedKnownGoodHumanReviewResultSha256: knownGoodSha
  };
}

function humanReviews(candidateIds: string[], sourceRole: 'new-stream' | 'old-stream'):
CandidateHumanComparisonReviewInputV001[] {
  return candidateIds.map((candidateId, index) => ({
    candidateId,
    secondOnlyUnderstanding: `後半単独では${index + 1}件目の出来事と理解した。`,
    concreteMeaningIncrement: index % 2 === 0 ? 'pass' : 'fail',
    concreteMeaningIncrementDescription: index % 2 === 0
      ? '前半の判断が後半の結果に繋がったと具体的に分かった。'
      : '前半を見ても後半の読みは具体的に変わらなかった。',
    lunaReasonDisclosureAssessment: 'Lunaの理由が人間の段階記録と一致するかを最後に確認した。',
    meaningConnection: index % 3 === 0 ? 'pass' : 'fail',
    payoffStrength: index % 4 === 0 ? 'pass' : 'fail',
    wantToMake: index === 0 ? 'pass' : 'fail',
    generalIntroduction: index === 1 ? 'yes' : 'no',
    knownGoodRediscovery: sourceRole === 'old-stream' && index === 2 ? 'yes' : 'no',
    connectionType: [
      '予告→実現', '断言→裏切り', '設置→使用', '認識→訂正', 'その他'
    ][index % 5] as CandidateHumanComparisonReviewInputV001['connectionType'],
    requiredVideoDurationMs: 10_000 + index * 1_000
  }));
}

function reviewResultBytes(
  sourceVideoId: string,
  candidateBinding: {path: string; schemaVersion: string; fileSha256: string},
  candidates: Array<{
    candidateId: string;
    firstPartUtteranceIds: string[];
    secondPartUtteranceIds: string[];
  }>,
  secondPartBaseMs = 75_000
): Buffer {
  return canonical({
    schemaVersion: 'distant-connection-candidate-review-result-v002',
    resultId: `comparison-review-${sourceVideoId}-v002`,
    artifactClassification: 'candidate-human-review-artifact',
    sourceVideoId,
    generatedAt: '2026-09-02T03:00:00.000Z',
    sourceProjectionBinding: {
      path: `outputs/${sourceVideoId}/projection.json`,
      schemaVersion: 'distant-connection-candidate-review-source-projection-v001',
      fileSha256: '4'.repeat(64)
    },
    candidateResponseBinding: candidateBinding,
    reviewJobBinding: {
      path: `outputs/${sourceVideoId}/job.json`,
      schemaVersion: 'distant-connection-candidate-review-job-v002',
      fileSha256: '5'.repeat(64)
    },
    sourceVideoBinding: {
      path: `evals/clip_composition/research/downloads/${sourceVideoId}/${sourceVideoId}.mp4`,
      fileSha256: '8'.repeat(64),
      measuredDurationMs: 12_000_000
    },
    candidates: candidates.map((candidate, index) => {
      const secondStartMs = secondPartBaseMs + index * 100_000;
      const firstEndMs = secondStartMs - 60_000;
      const firstStartMs = firstEndMs - 5_000;
      const secondEndMs = secondStartMs + 8_000;
      const firstOrdinals = candidate.firstPartUtteranceIds.map((_, partIndex) =>
        index * 100 + partIndex + 1);
      const secondOrdinals = candidate.secondPartUtteranceIds.map((_, partIndex) =>
        index * 100 + candidate.firstPartUtteranceIds.length + partIndex + 1);
      return {
        candidateId: candidate.candidateId,
        candidateOrdinal: index + 1,
        reviewArtifacts: {
          secondOnly: {
            stage: 'second-only',
            videoBinding: {
              path: `outputs/${sourceVideoId}/${candidate.candidateId}-second.mp4`,
              fileSha256: '6'.repeat(64)
            },
            mediaInspection: {
              durationMs: 8_000,
              videoPresent: true,
              audioPresent: true
            },
            evaluatedParts: [{
              part: 'second',
              selectedUtteranceIds: candidate.secondPartUtteranceIds,
              selectedOrdinals: secondOrdinals,
              sourceInterval: {sourceStartMs: secondStartMs, sourceEndMs: secondEndMs}
            }]
          },
          firstThenSecond: {
            stage: 'first-then-second',
            videoBinding: {
              path: `outputs/${sourceVideoId}/${candidate.candidateId}-both.mp4`,
              fileSha256: '7'.repeat(64)
            },
            mediaInspection: {
              durationMs: 13_000,
              videoPresent: true,
              audioPresent: true
            },
            evaluatedParts: [
              {
                part: 'first',
                selectedUtteranceIds: candidate.firstPartUtteranceIds,
                selectedOrdinals: firstOrdinals,
                sourceInterval: {sourceStartMs: firstStartMs, sourceEndMs: firstEndMs}
              },
              {
                part: 'second',
                selectedUtteranceIds: candidate.secondPartUtteranceIds,
                selectedOrdinals: secondOrdinals,
                sourceInterval: {sourceStartMs: secondStartMs, sourceEndMs: secondEndMs}
              }
            ]
          }
        }
      };
    }),
    generationStatus: 'succeeded',
    statusFlags: {
      formalSelection: false,
      formalRenderer: false,
      completedShort: false,
      technicalQcCompleted: false
    },
    responsibilityPrinciple: DISTANT_CONNECTION_CANDIDATE_REVIEW_RESPONSIBILITY_V002
  });
}

async function resultFixture() {
  const pInput = await planInput();
  const plan = buildDistantConnectionComparisonHumanReviewPlanV001(pInput);
  const planBytes = serializeDistantConnectionComparisonHumanReviewPlanV001(plan);
  const [newB6RunManifestBytes, newSourcePackageBytes] = await Promise.all([
    readFile(path.join(workspaceRoot, newB6ManifestPath)),
    readFile(path.join(workspaceRoot, newSourcePackagePath))
  ]);
  const newCandidateValue = JSON.parse(pInput.newCandidateResponseBytes.toString('utf8'));
  const newCandidateRows = newCandidateValue.candidates.map((candidate: any) => ({
    candidateId: candidate.candidateId,
    firstPartUtteranceIds: candidate.firstPartUtteranceIds,
    secondPartUtteranceIds: candidate.secondPartUtteranceIds
  }));
  const newCandidateIds = newCandidateRows.map((candidate: any) => candidate.candidateId);
  const newCandidateBinding = {
    path: newCandidatePath,
    schemaVersion: 'distant-connection-comparison-candidate-response-v001',
    fileSha256: sha256(pInput.newCandidateResponseBytes)
  };
  const newReviewResult = reviewResultBytes(
    'o8rZAhARXAc',
    newCandidateBinding,
    newCandidateRows
  );

  const oldSourcePackagePath = 'outputs/test-comparison-human-review/ym-source-package.json';
  const oldSourcePackageValue = structuredClone(JSON.parse(newSourcePackageBytes.toString('utf8')));
  oldSourcePackageValue.sourceVideoId = 'ymUsGrT6EaA';
  oldSourcePackageValue.responseContract.sourcePackagePath = oldSourcePackagePath;
  const oldSourcePackageBytes = canonical(oldSourcePackageValue);
  const oldSourcePackageBinding = {
    path: oldSourcePackagePath,
    schemaVersion: 'distant-connection-comparison-source-package-v001',
    fileSha256: sha256(oldSourcePackageBytes)
  };
  const oldCandidatePath = 'outputs/test-comparison-human-review/ym-candidates.json';
  const oldCandidateIds = Array.from({length: 6}, (_, index) => `${'candidate-'}${String(index + 1).padStart(64, '0')}`);
  const oldCandidateValue = {
    schemaVersion: 'distant-connection-comparison-candidate-response-v001',
    sourceVideoId: 'ymUsGrT6EaA',
    sourcePackageBinding: oldSourcePackageBinding,
    indexedModelInputBinding: {
      path: 'outputs/test-comparison-human-review/ym-indexed.json',
      schemaVersion: 'distant-connection-comparison-indexed-model-input-v001',
      fileSha256: '1'.repeat(64)
    },
    rawResponseBinding: {
      path: 'outputs/test-comparison-human-review/ym-raw.json',
      schemaVersion: 'openai-responses-distant-connection-comparison-raw-v001',
      fileSha256: '2'.repeat(64)
    },
    candidates: oldCandidateIds.map((candidateId, index) => ({
      candidateId,
      anchorId: `comparison-anchor-${String(index + 1).padStart(6, '0')}`,
      firstPartUtteranceIds: [`common-utterance-${String(index * 2 + 1).padStart(6, '0')}`],
      secondPartUtteranceIds: [`common-utterance-${String(index * 2 + 2).padStart(6, '0')}`],
      addedUnderstanding: '前半の判断が後半の結果として具体的に回収される。',
      direction: index % 2 === 0 ? 'future' : 'past'
    }))
  };
  const oldCandidateBytes = canonical(oldCandidateValue);
  const oldCandidateBinding = {
    path: oldCandidatePath,
    schemaVersion: 'distant-connection-comparison-candidate-response-v001',
    fileSha256: sha256(oldCandidateBytes)
  };
  const oldManifestPath = 'outputs/test-comparison-human-review/ym-b6-manifest.json';
  const oldManifest = JSON.parse(newB6RunManifestBytes.toString('utf8'));
  oldManifest.sourcePackageBinding = oldSourcePackageBinding;
  oldManifest.exactRequestBinding = plan.sources[1].exactRequestBinding;
  oldManifest.candidateResponseBinding = oldCandidateBinding;
  oldManifest.validation.candidateCount = oldCandidateIds.length;
  const oldManifestBytes = canonical(oldManifest);
  const oldReviewResult = reviewResultBytes(
    'ymUsGrT6EaA',
    oldCandidateBinding,
    oldCandidateValue.candidates,
    oldSourcePackageValue.selectedMinutes[0].sourceStartMs + 1_000
  );

  const sources: [
    BuildComparisonSourceHumanReviewV001Input,
    BuildComparisonSourceHumanReviewV001Input
  ] = [
    {
      sourceRole: 'new-stream',
      candidateResponsePath: newCandidatePath,
      candidateResponseBytes: pInput.newCandidateResponseBytes,
      expectedCandidateResponseSha256: newCandidateSha,
      b6RunManifestPath: newB6ManifestPath,
      b6RunManifestBytes: newB6RunManifestBytes,
      expectedB6RunManifestSha256: sha256(newB6RunManifestBytes),
      candidateReviewResultPath: 'outputs/test-comparison-human-review/o8-review-result.json',
      candidateReviewResultBytes: newReviewResult,
      expectedCandidateReviewResultSha256: sha256(newReviewResult),
      sourcePackagePath: newSourcePackagePath,
      sourcePackageBytes: newSourcePackageBytes,
      expectedSourcePackageSha256: sha256(newSourcePackageBytes),
      candidateReviews: humanReviews(newCandidateIds, 'new-stream')
    },
    {
      sourceRole: 'old-stream',
      candidateResponsePath: oldCandidatePath,
      candidateResponseBytes: oldCandidateBytes,
      expectedCandidateResponseSha256: sha256(oldCandidateBytes),
      b6RunManifestPath: oldManifestPath,
      b6RunManifestBytes: oldManifestBytes,
      expectedB6RunManifestSha256: sha256(oldManifestBytes),
      candidateReviewResultPath: 'outputs/test-comparison-human-review/ym-review-result.json',
      candidateReviewResultBytes: oldReviewResult,
      expectedCandidateReviewResultSha256: sha256(oldReviewResult),
      sourcePackagePath: oldSourcePackagePath,
      sourcePackageBytes: oldSourcePackageBytes,
      expectedSourcePackageSha256: sha256(oldSourcePackageBytes),
      candidateReviews: humanReviews(oldCandidateIds, 'old-stream')
    }
  ];
  return {
    plan,
    input: {
      planPath: 'outputs/test-comparison-human-review/human-review-plan-v001.json',
      planBytes,
      expectedPlanSha256: sha256(planBytes),
      reviewedAt: '2026-09-02T12:34:56+09:00',
      reviewer: 'kawafmm',
      sources
    }
  };
}

function rebindOldSourcePackage(
  fixture: Awaited<ReturnType<typeof resultFixture>>,
  sourcePackageBytes: Buffer
): void {
  const source = fixture.input.sources[1];
  const sourcePackageBinding = {
    path: source.sourcePackagePath,
    schemaVersion: 'distant-connection-comparison-source-package-v001',
    fileSha256: sha256(sourcePackageBytes)
  };
  source.sourcePackageBytes = sourcePackageBytes;
  source.expectedSourcePackageSha256 = sourcePackageBinding.fileSha256;

  const candidateResponse = JSON.parse(source.candidateResponseBytes.toString('utf8'));
  candidateResponse.sourcePackageBinding = sourcePackageBinding;
  source.candidateResponseBytes = canonical(candidateResponse);
  source.expectedCandidateResponseSha256 = sha256(source.candidateResponseBytes);
  const candidateResponseBinding = {
    path: source.candidateResponsePath,
    schemaVersion: 'distant-connection-comparison-candidate-response-v001',
    fileSha256: source.expectedCandidateResponseSha256
  };

  const manifest = JSON.parse(source.b6RunManifestBytes.toString('utf8'));
  manifest.sourcePackageBinding = sourcePackageBinding;
  manifest.candidateResponseBinding = candidateResponseBinding;
  source.b6RunManifestBytes = canonical(manifest);
  source.expectedB6RunManifestSha256 = sha256(source.b6RunManifestBytes);

  const reviewResult = JSON.parse(source.candidateReviewResultBytes.toString('utf8'));
  reviewResult.candidateResponseBinding = candidateResponseBinding;
  source.candidateReviewResultBytes = canonical(reviewResult);
  source.expectedCandidateReviewResultSha256 = sha256(source.candidateReviewResultBytes);
}

test('事前planがo8rの配列7件と5件/補助2件をSHA付きで固定する', async () => {
  const input = await planInput();
  const plan = buildDistantConnectionComparisonHumanReviewPlanV001(input);
  assert.equal(plan.sources[0].candidateCount, 7);
  assert.deepEqual(plan.sources[0].candidateTargets.map((target) => target.reviewScope), [
    'primary', 'primary', 'primary', 'primary', 'primary', 'supplementary', 'supplementary'
  ]);
  assert.equal(plan.sources[0].candidateResponseBinding.fileSha256, newCandidateSha);
  assert.equal(plan.sources[1].exactRequestBinding.fileSha256, oldExactRequestSha);
  assert.equal(plan.sources[1].candidateTargets.length, 0);
  validateDistantConnectionComparisonHumanReviewPlanAgainstSourcesV001(plan, input);
});

test('既知合格例の正式人間評価・候補・区間改善根拠を束縛しLuna入力使用を禁ずる', async () => {
  const plan = buildDistantConnectionComparisonHumanReviewPlanV001(await planInput());
  assert.equal(plan.knownGoodReferenceEvidence.candidateId, 'camera-fear-escalation');
  assert.equal(plan.knownGoodReferenceEvidence.modelInputUse, 'forbidden');
  assert.equal(
    plan.knownGoodReferenceEvidence.evidenceBindings.humanReviewResult.fileSha256,
    knownGoodSha
  );
  assert.equal(
    plan.knownGoodReferenceEvidence.evidenceBindings.candidateResponse.fileSha256,
    '8c8f1aa5bf69eb38076ce9ccdffab2f94cb2e8c2348695da2f3b45b9ad3b114d'
  );
  assert.equal(
    plan.knownGoodReferenceEvidence.evidenceBindings.intervalizationImprovementResult.fileSha256,
    'b1a6c1e4233aaabf447ec5ab3ca7d14657bd5a1dfb09a18557c11752fdd85dfe'
  );
  assert.equal(plan.knownGoodReferenceEvidence.modelInputNegativeAudit.allAbsent, true);
  assert.deepEqual(
    plan.knownGoodReferenceEvidence.modelInputNegativeAudit.auditedFields,
    ['instructions', 'input']
  );
  assert.deepEqual(
    plan.knownGoodReferenceEvidence.modelInputNegativeAudit.forbiddenStrings.map((row) => row.value),
    [
      'camera-fear-escalation',
      knownGoodPath,
      knownGoodSha,
      'evals/clip_composition/outputs/work-distant-connection-luna-b6-candidates-quality-increment-ymUsGrT6EaA-v001/candidate-response-v001.json',
      '8c8f1aa5bf69eb38076ce9ccdffab2f94cb2e8c2348695da2f3b45b9ad3b114d',
      'evals/clip_composition/outputs/presentation/distant-connection-video-intervalization-improvement-ymUsGrT6EaA-v001/video-intervalization-improvement-result-v001.json',
      'b1a6c1e4233aaabf447ec5ab3ca7d14657bd5a1dfb09a18557c11752fdd85dfe',
      'accepted-after-intervalization-improvement',
      'accepted-distant-connection-example',
      'known-good-rediscovery'
    ]
  );
});

test('既知合格例のID・正式評価path/SHA・成功ラベルがLuna入力へ混入したrequestを拒否する', async () => {
  const input = await planInput();
  for (const [field, forbidden] of [
    ['instructions', 'camera-fear-escalation'],
    ['input', knownGoodPath],
    ['input', knownGoodSha],
    [
      'instructions',
      'evals/clip_composition/outputs/work-distant-connection-luna-b6-candidates-quality-increment-ymUsGrT6EaA-v001/candidate-response-v001.json'
    ],
    ['input', '8c8f1aa5bf69eb38076ce9ccdffab2f94cb2e8c2348695da2f3b45b9ad3b114d'],
    [
      'input',
      'evals/clip_composition/outputs/presentation/distant-connection-video-intervalization-improvement-ymUsGrT6EaA-v001/video-intervalization-improvement-result-v001.json'
    ],
    ['instructions', 'b1a6c1e4233aaabf447ec5ab3ca7d14657bd5a1dfb09a18557c11752fdd85dfe'],
    ['instructions', 'accepted-after-intervalization-improvement'],
    ['input', 'accepted-distant-connection-example'],
    ['input', 'known-good-rediscovery']
  ] as const) {
    const request = JSON.parse(input.oldExactRequestBytes.toString('utf8'));
    request[field] += `\n${forbidden}`;
    const bytes = canonical(request);
    assert.throws(() => buildDistantConnectionComparisonHumanReviewPlanV001({
      ...input,
      oldExactRequestBytes: bytes,
      expectedOldExactRequestSha256: sha256(bytes)
    }), DistantConnectionComparisonHumanReviewErrorV001);
  }
});

test('後半のみ→前半+後半→Luna理由とA〜E・診断語彙を事前固定する', async () => {
  const plan = buildDistantConnectionComparisonHumanReviewPlanV001(await planInput());
  assert.deepEqual(plan.disclosureSequence.map((stage) => stage.stage), [
    'second-only', 'first-then-second', 'luna-reason'
  ]);
  assert.deepEqual(Object.keys(plan.criteria), ['A', 'B', 'C', 'D', 'E']);
  assert.deepEqual(plan.diagnostics.connectionTypes, [
    '予告→実現', '断言→裏切り', '設置→使用', '認識→訂正', 'その他'
  ]);
  assert.equal(plan.comparisonPrinciple.coefficients, 'none');
  assert.equal(plan.comparisonPrinciple.rankingOrReranking, 'none');
});

test('planは同一入力から同一formal byteを生成する', async () => {
  const input = await planInput();
  const first = serializeDistantConnectionComparisonHumanReviewPlanV001(
    buildDistantConnectionComparisonHumanReviewPlanV001(input)
  );
  const second = serializeDistantConnectionComparisonHumanReviewPlanV001(
    buildDistantConnectionComparisonHumanReviewPlanV001(input)
  );
  assert.deepEqual(first, second);
  assert.deepEqual(serializeDistantConnectionComparisonHumanReviewPlanV001(
    decodeDistantConnectionComparisonHumanReviewPlanV001(first)
  ), first);
});

test('保存済みformal planが正本入力からの再生成byteと一致する', async () => {
  const saved = await readFile(path.join(workspaceRoot, formalPlanPath));
  const rebuilt = serializeDistantConnectionComparisonHumanReviewPlanV001(
    buildDistantConnectionComparisonHumanReviewPlanV001(await planInput())
  );
  assert.equal(sha256(saved), 'a0431d30ce7c02aed0813e524da9b364c9902bd0fb717e605110b2d8f158e22a');
  assert.deepEqual(saved, rebuilt);
});

test('planのSHA差・候補欠落・重複・順序差・余分fieldを拒否する', async () => {
  const input = await planInput();
  assert.throws(() => buildDistantConnectionComparisonHumanReviewPlanV001({
    ...input,
    expectedNewCandidateResponseSha256: '0'.repeat(64)
  }), DistantConnectionComparisonHumanReviewErrorV001);
  const original = JSON.parse(input.newCandidateResponseBytes.toString('utf8'));
  for (const mutate of [
    (value: any) => value.candidates.pop(),
    (value: any) => value.candidates.push({...value.candidates[0]})
  ]) {
    const value = structuredClone(original);
    mutate(value);
    const bytes = canonical(value);
    assert.throws(() => buildDistantConnectionComparisonHumanReviewPlanV001({
      ...input,
      newCandidateResponseBytes: bytes,
      expectedNewCandidateResponseSha256: sha256(bytes)
    }), DistantConnectionComparisonHumanReviewErrorV001);
  }
  const plan = buildDistantConnectionComparisonHumanReviewPlanV001(input);
  assert.throws(() => assertDistantConnectionComparisonHumanReviewPlanV001({
    ...plan,
    sources: [{
      ...plan.sources[0],
      candidateTargets: [...plan.sources[0].candidateTargets].reverse()
    }, plan.sources[1]]
  }), DistantConnectionComparisonHumanReviewErrorV001);
  assert.throws(() => assertDistantConnectionComparisonHumanReviewPlanV001({
    ...plan,
    extra: true
  }), DistantConnectionComparisonHumanReviewErrorV001);
  assert.throws(() => assertDistantConnectionComparisonHumanReviewPlanV001({
    ...plan,
    knownGoodReferenceEvidence: {
      ...plan.knownGoodReferenceEvidence,
      modelInputNegativeAudit: {
        ...plan.knownGoodReferenceEvidence.modelInputNegativeAudit,
        allAbsent: false
      }
    }
  }), DistantConnectionComparisonHumanReviewErrorV001);
});

test('resultが新旧全candidateの3段階記録・診断・A〜Eを決定的に保存する', async () => {
  const fixture = await resultFixture();
  const result = buildDistantConnectionComparisonHumanReviewResultV001(fixture.input);
  assert.deepEqual(result.sources.map((source) => source.sourceRole), [
    'new-stream', 'old-stream'
  ]);
  assert.deepEqual(result.sources.map((source) => source.candidateCount), [7, 6]);
  assert.equal(result.sources[0].candidateReviews[0].stageObservations.secondOnly.stage, 'second-only');
  assert.equal(
    result.sources[0].candidateReviews[0].stageObservations.firstThenSecond.stage,
    'first-then-second'
  );
  assert.equal(result.sources[0].candidateReviews[0].stageObservations.lunaReason.stage, 'luna-reason');
  assert.equal(result.sources[0].candidateReviews[0].diagnostics.temporalDistanceMs, 60_000);
  assert.equal(result.sources[0].candidateReviews[0].diagnostics.requiredVideoDurationMs, 10_000);
  assert.equal(
    result.sources[1].candidateReviews[0].diagnostics.secondPartFromCommentIncreaseInterval,
    true
  );
  assert.equal(
    result.sources[1].candidateReviews[2].knownGoodRediscovery.referenceHumanReviewResultSha256,
    knownGoodSha
  );
  assert.equal(result.metricAggregates.A.rediscovered, 'yes');
  assert.equal(result.metricAggregates.A.referenceHumanReviewResultSha256, knownGoodSha);
  assert.deepEqual(result.metricAggregates.B.sources.map((source) => source.ratio), [
    {numerator: 1, denominator: 5}, {numerator: 1, denominator: 5}
  ]);
  assert.deepEqual(result.metricAggregates.C.sources.map((source) => source.passCount), [3, 3]);
  assert.deepEqual(result.metricAggregates.D.sources.map((source) => source.bothPassCount), [1, 1]);
  assert.deepEqual(result.metricAggregates.E.sources.map((source) => source.passCount), [1, 1]);
  validateDistantConnectionComparisonHumanReviewResultAgainstSourcesV001(result, fixture.input);
});

test('A〜Eは配列先頭5件だけを主集計し、6件目以降でrerankしない', async () => {
  const fixture = await resultFixture();
  fixture.input.sources[0].candidateReviews[5] = {
    ...fixture.input.sources[0].candidateReviews[5],
    generalIntroduction: 'yes',
    concreteMeaningIncrement: 'pass',
    meaningConnection: 'pass',
    payoffStrength: 'pass',
    wantToMake: 'pass'
  };
  const result = buildDistantConnectionComparisonHumanReviewResultV001(fixture.input);
  assert.equal(result.sources[0].candidateReviews[5].reviewScope, 'supplementary');
  assert.equal(result.metricAggregates.B.sources[0].passCount, 1);
  assert.equal(result.metricAggregates.D.sources[0].bothPassCount, 1);
  assert.equal(result.metricAggregates.E.sources[0].passCount, 1);
});

test('resultの候補欠落・重複・順序差・段階欠落・SHA差・source差を拒否する', async () => {
  for (const mutate of [
    (fixture: Awaited<ReturnType<typeof resultFixture>>) => {
      fixture.input.sources[0].candidateReviews.pop();
    },
    (fixture: Awaited<ReturnType<typeof resultFixture>>) => {
      fixture.input.sources[0].candidateReviews[1] = fixture.input.sources[0].candidateReviews[0];
    },
    (fixture: Awaited<ReturnType<typeof resultFixture>>) => {
      fixture.input.sources[0].candidateReviews.reverse();
    },
    (fixture: Awaited<ReturnType<typeof resultFixture>>) => {
      fixture.input.sources[0].expectedCandidateReviewResultSha256 = '0'.repeat(64);
    },
    (fixture: Awaited<ReturnType<typeof resultFixture>>) => {
      fixture.input.sources.reverse();
    }
  ]) {
    const fixture = await resultFixture();
    mutate(fixture);
    assert.throws(
      () => buildDistantConnectionComparisonHumanReviewResultV001(fixture.input),
      DistantConnectionComparisonHumanReviewErrorV001
    );
  }
  const fixture = await resultFixture();
  const reviewResult = JSON.parse(
    fixture.input.sources[0].candidateReviewResultBytes.toString('utf8')
  );
  delete reviewResult.candidates[0].reviewArtifacts.secondOnly;
  const bytes = canonical(reviewResult);
  fixture.input.sources[0].candidateReviewResultBytes = bytes;
  fixture.input.sources[0].expectedCandidateReviewResultSha256 = sha256(bytes);
  assert.throws(
    () => buildDistantConnectionComparisonHumanReviewResultV001(fixture.input),
    DistantConnectionComparisonHumanReviewErrorV001
  );
});

test('診断に使うsource packageは正式decoderを通しminimal偽物・余分fieldを拒否する', async () => {
  const minimalFixture = await resultFixture();
  rebindOldSourcePackage(minimalFixture, canonical({
    schemaVersion: 'distant-connection-comparison-source-package-v001',
    sourceVideoId: 'ymUsGrT6EaA',
    selectedMinutes: [{
      minuteIndex: 9,
      sourceStartMs: 540_000,
      sourceEndMs: 600_000,
      commentCount: 1,
      relativeToStreamBaseline: 2
    }]
  }));
  assert.throws(
    () => buildDistantConnectionComparisonHumanReviewResultV001(minimalFixture.input),
    DistantConnectionComparisonHumanReviewErrorV001
  );

  const extraFieldFixture = await resultFixture();
  const sourcePackage = JSON.parse(
    extraFieldFixture.input.sources[1].sourcePackageBytes.toString('utf8')
  );
  sourcePackage.unexpected = true;
  rebindOldSourcePackage(extraFieldFixture, canonical(sourcePackage));
  assert.throws(
    () => buildDistantConnectionComparisonHumanReviewResultV001(extraFieldFixture.input),
    DistantConnectionComparisonHumanReviewErrorV001
  );
});

test('resultの余分field・不正enum・集計改変を拒否する', async () => {
  const fixture = await resultFixture();
  const result = buildDistantConnectionComparisonHumanReviewResultV001(fixture.input);
  assert.throws(() => assertDistantConnectionComparisonHumanReviewResultV001({
    ...result,
    extra: true
  }), DistantConnectionComparisonHumanReviewErrorV001);
  assert.throws(() => assertDistantConnectionComparisonHumanReviewResultV001({
    ...result,
    sources: [{
      ...result.sources[0],
      candidateReviews: [{
        ...result.sources[0].candidateReviews[0],
        connectionType: '不正値'
      }, ...result.sources[0].candidateReviews.slice(1)]
    }, result.sources[1]]
  }), DistantConnectionComparisonHumanReviewErrorV001);
  assert.throws(() => assertDistantConnectionComparisonHumanReviewResultV001({
    ...result,
    metricAggregates: {
      ...result.metricAggregates,
      D: {
        ...result.metricAggregates.D,
        sources: [{
          ...result.metricAggregates.D.sources[0],
          bothPassCount: 5
        }, result.metricAggregates.D.sources[1]]
      }
    }
  }), DistantConnectionComparisonHumanReviewErrorV001);
  assert.throws(() => assertDistantConnectionComparisonHumanReviewResultV001({
    ...result,
    sources: [{
      ...result.sources[0],
      candidateReviews: [{
        ...result.sources[0].candidateReviews[0],
        stageObservations: {
          ...result.sources[0].candidateReviews[0].stageObservations,
          secondOnly: {
            stage: 'second-only',
            understoodContent: '上位評価値とは一致しない改変'
          }
        }
      }, ...result.sources[0].candidateReviews.slice(1)]
    }, result.sources[1]]
  }), DistantConnectionComparisonHumanReviewErrorV001);
  assert.throws(() => assertDistantConnectionComparisonHumanReviewResultV001({
    ...result,
    sources: [{
      ...result.sources[0],
      candidateReviews: [result.sources[0].candidateReviews[0], {
        ...result.sources[0].candidateReviews[1],
        knownGoodRediscovery: {
          ...result.sources[0].candidateReviews[1].knownGoodRediscovery,
          referenceHumanReviewResultSha256: '9'.repeat(64)
        }
      }, ...result.sources[0].candidateReviews.slice(2)]
    }, result.sources[1]]
  }), DistantConnectionComparisonHumanReviewErrorV001);
});

test('resultは同一入力から同一formal byteを生成する', async () => {
  const fixture = await resultFixture();
  const first = serializeDistantConnectionComparisonHumanReviewResultV001(
    buildDistantConnectionComparisonHumanReviewResultV001(fixture.input)
  );
  const second = serializeDistantConnectionComparisonHumanReviewResultV001(
    buildDistantConnectionComparisonHumanReviewResultV001(fixture.input)
  );
  assert.deepEqual(first, second);
});

test('候補非依存pageは後半のみ→前半+後半→Luna理由を段階解放する', async () => {
  const fixture = await resultFixture();
  const source = fixture.input.sources[0];
  const pageInput = {
    planPath: fixture.input.planPath,
    planBytes: fixture.input.planBytes,
    expectedPlanSha256: fixture.input.expectedPlanSha256,
    sourceRole: 'new-stream' as const,
    candidateResponsePath: source.candidateResponsePath,
    candidateResponseBytes: source.candidateResponseBytes,
    expectedCandidateResponseSha256: source.expectedCandidateResponseSha256,
    b6RunManifestPath: source.b6RunManifestPath,
    b6RunManifestBytes: source.b6RunManifestBytes,
    expectedB6RunManifestSha256: source.expectedB6RunManifestSha256,
    candidateReviewResultPath: source.candidateReviewResultPath,
    candidateReviewResultBytes: source.candidateReviewResultBytes,
    expectedCandidateReviewResultSha256: source.expectedCandidateReviewResultSha256,
    outputPath: 'outputs/test-comparison-human-review/staged-review.html'
  };
  const first = buildDistantConnectionComparisonHumanReviewPageV001(pageInput);
  const second = buildDistantConnectionComparisonHumanReviewPageV001(pageInput);
  const html = first.htmlBytes.toString('utf8');
  assert.equal(first.candidateCount, 7);
  assert.equal(first.primaryCandidateCount, 5);
  assert.deepEqual(first.htmlBytes, second.htmlBytes);
  assert.equal((html.match(/data-stage="second-only"/gu) ?? []).length, 7);
  assert.equal((html.match(/data-stage="first-then-second" hidden/gu) ?? []).length, 7);
  assert.equal((html.match(/data-stage="luna-reason" hidden/gu) ?? []).length, 7);
  const firstCard = html.slice(html.indexOf('<article class="candidate"'), html.indexOf('</article>'));
  const firstStage = firstCard.slice(
    firstCard.indexOf('data-stage="second-only"'),
    firstCard.indexOf('data-stage="first-then-second"')
  );
  const candidate = JSON.parse(source.candidateResponseBytes.toString('utf8')).candidates[0];
  assert.equal(firstStage.includes('-both.mp4'), false);
  assert.equal(firstStage.includes(candidate.addedUnderstanding), false);
  assert.ok(firstCard.indexOf(candidate.addedUnderstanding)
    > firstCard.indexOf('data-stage="luna-reason"'));
  assert.match(html, /if \(!observation\.value\.trim\(\)\)/u);
  assert.match(html, /next\.hidden = false/u);
  assert.ok(html.indexOf('observation.readOnly = true')
    < html.indexOf('next.hidden = false'));
  assert.match(
    html,
    /"draftClassification":"non-formal-comparison-human-review-draft"/u
  );
  assert.match(html, /"formalHumanReviewResult":false/u);
  assert.match(html, /finalObservation\.readOnly = true/u);
  assert.match(html, /正式な比較評価resultではなく、入力用の非正式下書き/u);
});

test('段階確認pageはSHA差・正式candidate順序差をfail-closedする', async () => {
  const fixture = await resultFixture();
  const source = fixture.input.sources[0];
  const input = {
    planPath: fixture.input.planPath,
    planBytes: fixture.input.planBytes,
    expectedPlanSha256: fixture.input.expectedPlanSha256,
    sourceRole: 'new-stream' as const,
    candidateResponsePath: source.candidateResponsePath,
    candidateResponseBytes: source.candidateResponseBytes,
    expectedCandidateResponseSha256: source.expectedCandidateResponseSha256,
    b6RunManifestPath: source.b6RunManifestPath,
    b6RunManifestBytes: source.b6RunManifestBytes,
    expectedB6RunManifestSha256: source.expectedB6RunManifestSha256,
    candidateReviewResultPath: source.candidateReviewResultPath,
    candidateReviewResultBytes: source.candidateReviewResultBytes,
    expectedCandidateReviewResultSha256: source.expectedCandidateReviewResultSha256,
    outputPath: 'outputs/test-comparison-human-review/staged-review.html'
  };
  assert.throws(() => buildDistantConnectionComparisonHumanReviewPageV001({
    ...input,
    expectedCandidateReviewResultSha256: '0'.repeat(64)
  }), DistantConnectionComparisonHumanReviewErrorV001);
  const reviewResult = JSON.parse(source.candidateReviewResultBytes.toString('utf8'));
  reviewResult.candidates.reverse();
  reviewResult.candidates.forEach((candidate: any, index: number) => {
    candidate.candidateOrdinal = index + 1;
  });
  const changedBytes = canonical(reviewResult);
  assert.throws(() => buildDistantConnectionComparisonHumanReviewPageV001({
    ...input,
    candidateReviewResultBytes: changedBytes,
    expectedCandidateReviewResultSha256: sha256(changedBytes)
  }), DistantConnectionComparisonHumanReviewErrorV001);
});

test('段階確認page実装に特定candidate ID・動画固有発話のhardcodeがない', async () => {
  const sourceBytes = await readFile(path.join(
    workspaceRoot,
    'runner/src/distant-connection-comparison-human-review-v001.ts'
  ));
  const implementation = sourceBytes.toString('utf8');
  const formalCandidates = JSON.parse(
    (await readFile(path.join(workspaceRoot, newCandidatePath))).toString('utf8')
  ).candidates;
  for (const candidate of formalCandidates) {
    assert.equal(implementation.includes(candidate.candidateId), false);
    assert.equal(implementation.includes(candidate.addedUnderstanding), false);
  }
});
