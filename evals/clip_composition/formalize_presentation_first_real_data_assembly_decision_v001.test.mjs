import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFile, readdir} from 'node:fs/promises';
import test from 'node:test';

import {
  buildPresentationFirstRealDataAssemblyDecisionV001,
  createPresentationFirstRealDataFormalizationDocumentsV001,
  loadPresentationFirstRealDataFormalizationInputsV001,
  PRESENTATION_FIRST_REAL_DATA_ASSEMBLY_DECISION_PATH_V001,
  PRESENTATION_FIRST_REAL_DATA_FORMALIZATION_RECEIPT_PATH_V001,
  PRESENTATION_FIRST_REAL_DATA_FORMALIZATION_ROOT_V001,
} from './formalize_presentation_first_real_data_assembly_decision_v001.mjs';
import {
  validatePresentationBaseMediaAssemblyDecisionV001,
  validatePresentationBaseMediaSegmentPlanV001,
} from './presentation_base_media_build_v001.mjs';
import {canonicalJson} from './presentation_caption_contract_v002.mjs';
import {
  closePresentationFirstRealDataRenderedComparisonServingInputsV002,
} from './serve_presentation_first_real_data_rendered_comparison_v002.mjs';

const EXPECTED_SEGMENTS = [
  {sourceStartMs: 1920260, sourceEndMs: 1977670},
  {sourceStartMs: 1981394, sourceEndMs: 2008506},
];
const EXPECTED_MAPPINGS = [
  {
    segmentId: 'segment-0001',
    sourceStartMs: 1920260,
    sourceEndMs: 1977670,
    sourceStartFrame30: 57608,
    sourceEndFrame30: 59330,
    outputStartFrame: 0,
    outputEndFrame: 1722,
    audioSamples: {
      sourceStart: 92172800,
      sourceEnd: 94928000,
      outputStart: 0,
      outputEnd: 2755200,
    },
  },
  {
    segmentId: 'segment-0002',
    sourceStartMs: 1981394,
    sourceEndMs: 2008506,
    sourceStartFrame30: 59442,
    sourceEndFrame30: 60255,
    outputStartFrame: 1722,
    outputEndFrame: 2535,
    audioSamples: {
      sourceStart: 95107200,
      sourceEnd: 96408000,
      outputStart: 2755200,
      outputEnd: 4056000,
    },
  },
];
const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');
const readJson = async (filePath) => JSON.parse(await readFile(filePath, 'utf8'));

test('人間が採用したD媒体のframe・音声sample列を正式組立決定へ完全一致で固定する', async () => {
  const inputs = await loadPresentationFirstRealDataFormalizationInputsV001();
  try {
    const {decision, receipt} = createPresentationFirstRealDataFormalizationDocumentsV001(inputs);
    assert.deepEqual(decision.payload.segments, EXPECTED_SEGMENTS);
    assert.deepEqual(receipt.selection.viewedMappings, EXPECTED_MAPPINGS);
    assert.deepEqual(receipt.formalization.derivedMappings, EXPECTED_MAPPINGS);
    assert.equal(receipt.selection.expectedFrameCount, 2535);
    assert.equal(receipt.selection.expectedAudioSampleCount, 4056000);
    assert.equal(receipt.references.selectedMedia.fileSha256,
      'c2aed204784cb111c0b0f9752ccd886b40eac123b85d152b770ebd656ce8de69');
    assert.equal(receipt.formalization.decisionPayloadSha256,
      '7fbdc54c548be6e7a475cb54f221644c3d7ff5ce89442cd6a38fbccc7bd13755');
    assert.deepEqual(validatePresentationBaseMediaAssemblyDecisionV001(decision).violations, []);
    const provenance = inputs.servingInputs.loadedJson.comparisonProvenance;
    const mappingValidation = validatePresentationBaseMediaSegmentPlanV001(
      decision.payload.segments,
      provenance.sourceClock,
      provenance.audioClock,
    );
    assert.equal(mappingValidation.status, 'passed');
    assert.deepEqual(mappingValidation.mappings, EXPECTED_MAPPINGS);
    assert.deepEqual(
      provenance.variants.find(({variantId}) => variantId === 'cut-gap2').mappings,
      EXPECTED_MAPPINGS,
    );
  } finally {
    await closePresentationFirstRealDataRenderedComparisonServingInputsV002(inputs.servingInputs);
  }
});

test('実保存物は固定入力・人間承認・正式decisionを一方向に束縛し、下流生成物を含まない', async () => {
  const [decisionBytes, receiptBytes, names] = await Promise.all([
    readFile(PRESENTATION_FIRST_REAL_DATA_ASSEMBLY_DECISION_PATH_V001),
    readFile(PRESENTATION_FIRST_REAL_DATA_FORMALIZATION_RECEIPT_PATH_V001),
    readdir(PRESENTATION_FIRST_REAL_DATA_FORMALIZATION_ROOT_V001),
  ]);
  const decision = JSON.parse(decisionBytes.toString('utf8'));
  const receipt = JSON.parse(receiptBytes.toString('utf8'));
  assert.deepEqual(names.sort(), ['assembly-decision.json', 'formalization-receipt.json']);
  assert.equal(sha256(decisionBytes), 'b2360d5e2aa56075728d692a7d456455d2cac168d47325631cfea4d919e3aa32');
  assert.equal(sha256(receiptBytes), 'a0979241643d77494443ab80880cd3c4dd75be5c0241424a7634082f65275fca');
  assert.equal(receipt.references.assemblyDecision.fileSha256, sha256(decisionBytes));
  assert.equal(receipt.references.assemblyDecision.payloadSha256,
    sha256(Buffer.from(canonicalJson(decision.payload))));
  assert.equal(receipt.references.humanResult.fileSha256,
    '626c0463db84594133d5c288d1125aa5125a2a6e0e1fef6bfe929786a0d6bcdf');
  assert.equal(receipt.references.validationReceipt.fileSha256,
    'd0244597dfa944b4fae62c18b0015fa043419454b74e2de13289b6a9db9831d4');
  assert.equal(receipt.references.comparisonProvenance.fileSha256,
    '46bae75601c72d0a9880c099e930209ccb794a333ba17a9d77b6c744b86ba597');
  assert.equal(receipt.references.sourceIdentity.fileSha256,
    'a7c9e9a8c3917662bcf3b66fad46cedc56f5ca558467226453339ea370108993');
  assert.equal(receipt.references.basisEditPlan.fileSha256,
    '31f93434d8a0ba2f1b8cb2e6d845fd48f0064bcf2fcfb5aaee967653e90f2e64');
  assert.deepEqual(receipt.workflow, {
    formalAssemblyDecisionCreated: true,
    baseMediaCreated: false,
    timelineCreated: false,
    renderingStarted: false,
    remainingCandidatesExpanded: false,
    nextGate: '正式基礎映像生成は別承認',
  });
  assert.equal(names.some((name) => /base-media|timeline|render|job/u.test(name)), false);
});

test('固定出力の上書きと承認範囲を外れる入力を拒否する', async () => {
  await assert.rejects(
    buildPresentationFirstRealDataAssemblyDecisionV001(),
    /formalization output already exists/u,
  );
  const inputs = await loadPresentationFirstRealDataFormalizationInputsV001();
  try {
    const changedApproval = structuredClone(inputs.approval);
    changedApproval.scope.baseMediaGenerationApproved = true;
    assert.throws(
      () => createPresentationFirstRealDataFormalizationDocumentsV001({
        ...inputs,
        approval: changedApproval,
      }),
      /formalization approval scope is invalid/u,
    );
    const changedResult = structuredClone(inputs.humanResult);
    changedResult.resolution.variantId = 'cut-both';
    assert.throws(
      () => createPresentationFirstRealDataFormalizationDocumentsV001({
        ...inputs,
        humanResult: changedResult,
      }),
      /result resolution mismatch|selected variant mismatch/u,
    );
    const changedProvenanceInputs = {
      loadedJson: structuredClone(inputs.servingInputs.loadedJson),
      references: structuredClone(inputs.servingInputs.references),
    };
    changedProvenanceInputs.loadedJson.comparisonProvenance.variants
      .find(({variantId}) => variantId === 'cut-gap2')
      .mappings[0].sourceEndFrame30 += 1;
    assert.throws(
      () => createPresentationFirstRealDataFormalizationDocumentsV001({
        ...inputs,
        servingInputs: changedProvenanceInputs,
      }),
      /provenance|source frame|formal segments do not reproduce/u,
    );
  } finally {
    await closePresentationFirstRealDataRenderedComparisonServingInputsV002(inputs.servingInputs);
  }
});
