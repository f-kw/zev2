import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import test from 'node:test';

import {
  readPresentationFirstRealDataVerifiedFileBytesV001,
} from './presentation_first_real_data_gate_v001.mjs';
import {
  closePresentationFirstRealDataRenderedComparisonServingInputsV002,
  loadPresentationFirstRealDataRenderedComparisonServingInputsV002,
} from './serve_presentation_first_real_data_rendered_comparison_v002.mjs';
import {
  presentationRenderedComparisonCanonicalSha256V002,
  validatePresentationRenderedComparisonHumanResultV002,
} from './presentation_first_real_data_rendered_comparison_trust_v002.mjs';

const RESPONSE_ROOT =
  'evals/clip_composition/outputs/presentation/20260722-first-real-data-rendered-comparison-v002-human-response-v001';
const RESULT_PATH = `${RESPONSE_ROOT}/human-result.json`;
const OBSERVATION_PATH = `${RESPONSE_ROOT}/human-observation.json`;
const RECEIPT_PATH = `${RESPONSE_ROOT}/validation-receipt.json`;

const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');
const readJson = async (filePath) => JSON.parse(await readFile(filePath, 'utf8'));

test('人間回答原文をv002固定資料へ照合し、受領receiptのhashを再検査する', async () => {
  const [resultBytes, observationBytes, receipt] = await Promise.all([
    readFile(RESULT_PATH),
    readFile(OBSERVATION_PATH),
    readJson(RECEIPT_PATH),
  ]);
  const result = JSON.parse(resultBytes.toString('utf8'));
  const servingInputs = await loadPresentationFirstRealDataRenderedComparisonServingInputsV002();
  try {
    const validation = validatePresentationRenderedComparisonHumanResultV002({
      result,
      page: servingInputs.loadedJson.reviewPage,
      manifest: servingInputs.loadedJson.comparisonManifest,
      provenance: servingInputs.loadedJson.comparisonProvenance,
    });
    assert.equal(validation.status, 'received');
    assert.equal(validation.resultCanonicalSha256, receipt.humanResult.canonicalSha256);
    assert.equal(validation.mayCreateFormalAssemblyDecision, true);
    assert.deepEqual(validation.recomputedResolution, {
      status: 'resolved',
      gapDecisions: {gap01: 'keep', gap02: 'cut'},
      variantId: 'cut-gap2',
    });
    assert.equal(receipt.comparisonPackage.fileSha256, servingInputs.references.summary.fileSha256);
  } finally {
    await closePresentationFirstRealDataRenderedComparisonServingInputsV002(servingInputs);
  }
  assert.equal(sha256(resultBytes), receipt.humanResult.fileSha256);
  assert.equal(sha256(observationBytes), receipt.humanObservation.fileSha256);
  assert.equal(
    presentationRenderedComparisonCanonicalSha256V002(result),
    '12b9e1bfb8e848a29b875ead1e34aed8e8a604a0d6fadce742ec5b9210ec95d3',
  );
  assert.equal(receipt.workflow.formalAssemblyDecisionCreated, false);
  assert.equal(receipt.workflow.baseMediaCreated, false);
  assert.equal(receipt.workflow.renderingStarted, false);
});

test('語尾欠け診断をSTT文字時刻と比較媒体の区間列へ照合する', async () => {
  const [observation, receipt, servingInputs] = await Promise.all([
    readJson(OBSERVATION_PATH),
    readJson(RECEIPT_PATH),
    loadPresentationFirstRealDataRenderedComparisonServingInputsV002(),
  ]);
  try {
    const provenance = servingInputs.loadedJson.comparisonProvenance;
    const candidateManifestReference = provenance.fixedReferences.candidateManifest;
    const candidateManifestBytes = await readPresentationFirstRealDataVerifiedFileBytesV001(
      candidateManifestReference,
    );
    const candidateManifest = JSON.parse(candidateManifestBytes.bytes.toString('utf8'));
    const gap01 = candidateManifest.reviewItems[0];
    const gap02 = candidateManifest.reviewItems[1];
    const finalKa = gap01.beforeUtterance.characters.at(-1);
    const finalDo = gap02.beforeUtterance.characters.at(-1);
    assert.deepEqual(finalKa, {
      characterId: 'word-7057', text: 'か', startMs: 1948038, endMs: 1948058,
    });
    assert.equal(gap01.gap.startMs, finalKa.endMs);
    assert.deepEqual(observation.diagnosis.finalCharacter, {
      ...finalKa,
      annotatedDurationMs: 20,
    });
    const cutBoth = provenance.variants.find(({variantId}) => variantId === 'cut-both');
    const cutGap1 = provenance.variants.find(({variantId}) => variantId === 'cut-gap1');
    const selected = provenance.variants.find(({variantId}) => variantId === 'cut-gap2');
    assert.equal(cutBoth.cutGapIds.includes('gap-01'), true);
    assert.equal(cutGap1.cutGapIds.includes('gap-01'), true);
    assert.equal(selected.cutGapIds.includes('gap-01'), false);
    assert.deepEqual(selected.cutGapIds, ['gap-02']);
    assert.equal(selected.mappings[0].sourceStartMs, candidateManifest.candidate.outerRange.startMs);
    assert.equal(selected.mappings[0].sourceEndMs, gap02.gap.startMs);
    assert.equal(selected.mappings[0].sourceEndFrame30, 59330);
    assert.equal(finalDo.text, 'ど');
    assert.equal(finalDo.endMs - finalDo.startMs, 20);
    assert.equal(receipt.diagnosticImpact.reportedDefectAffectsSelectedVariant, false);
    assert.equal(receipt.workflow.nextGate, '正式組立決定への変換は別承認');
  } finally {
    await closePresentationFirstRealDataRenderedComparisonServingInputsV002(servingInputs);
  }
});
