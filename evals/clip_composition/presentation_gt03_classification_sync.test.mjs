import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const readJson = async (...parts) => JSON.parse(await readFile(path.join(scriptDir, ...parts), 'utf8'));

const CLASSIFICATION = 'reconstruction-layer-context-card-composition';
const STATUS = 'not_applicable_current_G7';

test('GT-03 frozen ground truth remains the original human-approved observation', async () => {
  const groundTruth = await readJson(
    'outputs', 'presentation', 'g4-g7-ground-truth-v001', 'ground-truth-v001.json',
  );
  const gt03 = groundTruth.examples.find((item) => item.groundTruthId === 'GT-03');
  assert.equal(groundTruth.examples.length, 5);
  assert.equal(gt03.grammar, 'G7');
  assert.equal(Object.hasOwn(gt03, 'currentContractStatus'), false);
  assert.equal(gt03.anchorMs, 548000);
  assert.equal(gt03.observedPresentation, '約2秒の静止画へ文脈を圧縮する');
  assert.equal(gt03.humanDecision, 'approve-as-proposed');
});

test('candidate ledger remains the original frozen provenance record', async () => {
  const ledger = await readJson(
    'outputs', 'presentation', 'g4-g7-ground-truth-v001', 'candidate-ledger.json',
  );
  const gt03 = ledger.candidates.find((item) => item.candidateId === 'GT-03');
  assert.equal(ledger.candidates.length, 5);
  assert.equal(Object.hasOwn(gt03, 'currentContractStatus'), false);
  assert.equal(gt03.humanObservation, '時間・場所・登場人物・状況を約2秒の静止画へ圧縮する');
  assert.equal(gt03.humanConfirmedBy, 'kawafmm');
  assert.equal(gt03.humanConfirmedDate, '2026-07-20');
});

test('plan A retains the historical hold that existed before classification approval', async () => {
  const [visibility, scoring] = await Promise.all([
    readJson('outputs', 'presentation', 'g4-g7-input-readiness-plan-a-v001', 'input-visibility-manifest.json'),
    readJson('outputs', 'presentation', 'g4-g7-input-readiness-plan-a-v001', 'final-scoring-eligibility-v001.json'),
  ]);
  const visibilityGt03 = visibility.results.find((item) => item.groundTruthId === 'GT-03');
  const scoringGt03 = scoring.results.find((item) => item.groundTruthId === 'GT-03');
  assert.equal(visibilityGt03.provisionalScoringStatus, 'held_input_not_ready');
  assert.equal(scoringGt03.finalScoringStatus, 'held_input_not_ready');
  assert.equal(scoringGt03.sourceMappingDecision, 'not_attempted_plan_a_hold');
});

test('classification authority preserves GT-03 and cancels current-G7 input preparation', async () => {
  const classification = await readJson(
    'outputs', 'presentation', 'g4-g7-ground-truth-v002-availability-preflight-v001',
    'gt03-contract-classification-v001.json',
  );
  assert.equal(classification.status, 'human-approved-applied');
  assert.equal(classification.humanAuthority, 'kawafmm');
  assert.equal(classification.decision, STATUS);
  assert.equal(classification.classification, CLASSIFICATION);
  assert.equal(classification.includedInCurrentG7Scoring, false);
  assert.equal(classification.preservation.deleteOriginalObservation, false);
  assert.equal(classification.preservation.deleteFrozenGroundTruth, false);
  assert.deepEqual(classification.workNotRequiredForCurrentG7, [
    '元配信候補5本の特定',
    '媒体取得',
    'STT',
    '素材台帳整備',
  ]);
});
