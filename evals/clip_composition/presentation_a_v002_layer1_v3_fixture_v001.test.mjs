import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import test from 'node:test';

import {
  PRESENTATION_A_V002_LAYER1_V3_HUMAN_APPROVAL_SCHEMA_V001,
  PRESENTATION_A_V002_LAYER1_V3_LEGACY_HUMAN_RESULT_SCHEMA_V001,
  PRESENTATION_A_V002_LAYER1_V3_PROOF_INPUT_SCHEMA_V001,
  PRESENTATION_A_V002_LAYER1_V3_PROPOSAL_SCHEMA_V001,
  PRESENTATION_A_V002_LAYER1_V3_SOURCE_ATOM_TRANSCRIPT_SCHEMA_V001,
  buildPresentationAV002Layer1V3FixturesV001,
  canonicalSha256PresentationAV002Layer1V3JsonV001,
  inspectPresentationAV002Candidate59FeasibilityV001,
  sha256PresentationAV002Layer1V3BytesV001,
  validatePresentationAV002Layer1V3NormalizedTranscriptV001,
  validatePresentationAV002Layer1V3ProofInputV001,
} from './presentation_a_v002_layer1_v3_fixture_v001.mjs';

const PATHS = Object.freeze({
  legacyPackage:
    'evals/clip_composition/outputs/internal-edit/20260717-layer1-v003-long-gap-pair-review-v001/package-input.json',
  humanResult:
    'evals/clip_composition/outputs/internal-edit/20260717-layer1-v003-long-gap-pair-review-v001/human-result.json',
  sourceIdentity:
    'evals/clip_composition/outputs/presentation/source-review-preparations/qdczJpv8RCc-candidate-59-v001/source-identity.json',
  sourceAtomTranscript:
    'evals/clip_composition/fixtures/nE_bNeBNp4E_multiblock_material_v001/transcript.json',
  feasibilityEvidence:
    'evals/clip_composition/reports/presentation/presentation-a-vad-observation-and-v3-feasibility-evidence-20260809-v001.json',
  normalizedTranscript:
    'evals/clip_composition/outputs/presentation/a-v002/layer1-v3-proof-v001/source-atom-transcript-v001.json',
  normalizedHumanApproval:
    'evals/clip_composition/outputs/presentation/a-v002/layer1-v3-proof-v001/human-approval-v001.json',
});

const EXPECTED_SHA = Object.freeze({
  legacyPackage: 'cfb43e60d8bf73d3377f39ff45d2d69156b6b5432d6944799b402ede764d5b0c',
  humanResult: 'cb08a7607b6d99f3f7fd5ef27582a90b096ac07356d9fd7fc59fef740b44a3bc',
  sourceIdentity: 'fb27b0c17e9663e6fee71489bcb5755964ad04fe0277609d93acd087c3437ac4',
  sourceAtomTranscript: '3e6dc8fa8dd22ea02f296a4fa3bb2d311639af1fba1a56f999abbc6834bcfea3',
});

const loadJson = async filePath => {
  const bytes = await readFile(filePath);
  return {bytes, value: JSON.parse(bytes.toString('utf8'))};
};

const binding = (schemaVersion, filePath, artifact) => ({
  schemaVersion,
  path: filePath,
  fileSha256: sha256PresentationAV002Layer1V3BytesV001(artifact.bytes),
  canonicalSha256: canonicalSha256PresentationAV002Layer1V3JsonV001(artifact.value),
});

const loadFixtureInputs = async () => {
  const [legacyPackage, humanResult, sourceIdentity, sourceAtomTranscript] = await Promise.all([
    loadJson(PATHS.legacyPackage),
    loadJson(PATHS.humanResult),
    loadJson(PATHS.sourceIdentity),
    loadJson(PATHS.sourceAtomTranscript),
  ]);
  return {
    artifacts: {legacyPackage, humanResult, sourceIdentity, sourceAtomTranscript},
    input: {
      legacyPackage: legacyPackage.value,
      humanResult: humanResult.value,
      sourceIdentity: sourceIdentity.value,
      sourceAtomTranscript: sourceAtomTranscript.value,
      sourceAtomTranscriptBytes: sourceAtomTranscript.bytes,
      normalizedTranscriptPath: PATHS.normalizedTranscript,
      normalizedHumanApprovalPath: PATHS.normalizedHumanApproval,
      bindings: {
        legacyPackage: binding(
          PRESENTATION_A_V002_LAYER1_V3_PROPOSAL_SCHEMA_V001,
          PATHS.legacyPackage,
          legacyPackage,
        ),
        humanResult: binding(
          PRESENTATION_A_V002_LAYER1_V3_LEGACY_HUMAN_RESULT_SCHEMA_V001,
          PATHS.humanResult,
          humanResult,
        ),
        sourceIdentity: binding(
          sourceIdentity.value.schemaVersion,
          PATHS.sourceIdentity,
          sourceIdentity,
        ),
        sourceTranscriptByteBinding: {
          path: PATHS.sourceAtomTranscript,
          fileSha256: sha256PresentationAV002Layer1V3BytesV001(sourceAtomTranscript.bytes),
        },
      },
    },
  };
};

test('APF001: 旧v3正式化が四つの保存実体SHAをexactに照合する', async () => {
  const {artifacts, input} = await loadFixtureInputs();
  for (const key of ['legacyPackage', 'humanResult', 'sourceIdentity', 'sourceAtomTranscript']) {
    assert.equal(sha256PresentationAV002Layer1V3BytesV001(artifacts[key].bytes), EXPECTED_SHA[key]);
  }
  const result = buildPresentationAV002Layer1V3FixturesV001(input);
  assert.equal(result.status, 'built');
  assert.equal(result.normalizedHumanApproval.schemaVersion,
    PRESENTATION_A_V002_LAYER1_V3_HUMAN_APPROVAL_SCHEMA_V001);
  assert.equal(result.normalizedHumanApprovalBinding.path, PATHS.normalizedHumanApproval);
});

test('APF002: 三候補を101・72・80 atomの独立fixtureとして正式化する', async () => {
  const {input} = await loadFixtureInputs();
  const result = buildPresentationAV002Layer1V3FixturesV001(input);
  assert.equal(validatePresentationAV002Layer1V3NormalizedTranscriptV001(
    result.normalizedTranscript,
  ), true);
  assert.equal(result.normalizedTranscript.atoms.length, 1890);
  assert.equal(result.normalizedTranscriptBinding.path, PATHS.normalizedTranscript);
  assert.equal(
    sha256PresentationAV002Layer1V3BytesV001(result.normalizedTranscriptBytes),
    result.normalizedTranscriptBinding.fileSha256,
  );
  assert.deepEqual(result.fixtures.map(item => item.proofInput.sourceAtoms.length), [101, 72, 80]);
  assert.equal(new Set(result.fixtures.map(item => item.proofInput.proofInputId)).size, 3);
});

test('APF003: 保存済み発話本文と現行atom連結byteを一件ずつ一致させる', async () => {
  const {input} = await loadFixtureInputs();
  const result = buildPresentationAV002Layer1V3FixturesV001(input);
  assert.deepEqual(
    result.fixtures.map(item => item.proofInput.caption.text),
    input.legacyPackage.humanReview.selections.map(item => item.context.text),
  );
  assert.ok(result.fixtures.every(item => validatePresentationAV002Layer1V3ProofInputV001(
    item.proofInput,
  )));
});

test('APF004: 人間認定済み三切断を丸めずremove決定へ写す', async () => {
  const {input} = await loadFixtureInputs();
  const result = buildPresentationAV002Layer1V3FixturesV001(input);
  assert.deepEqual(
    result.fixtures.map(item => [
      item.removalDecision.sourceStartMs,
      item.removalDecision.sourceEndMs,
    ]),
    [[4084435, 4086915], [4455270, 4457090], [4611230, 4613470]],
  );
  assert.ok(result.fixtures.every(item => item.removalDecision.verdict === 'remove'));
  assert.ok(result.fixtures.every(item => (
    item.removalDecision.evidenceBinding.fileSha256
      === result.normalizedHumanApprovalBinding.fileSha256
    && item.proofInput.humanApprovalBinding.fileSha256
      === result.normalizedHumanApprovalBinding.fileSha256
  )));
});

test('APF005: 人間結果が差なし・繋ぎ問題なしでない候補を拒否する', async () => {
  const {input} = await loadFixtureInputs();
  input.humanResult.results[0].decision = '詰め前が良い';
  input.humanResult.summary.same = 2;
  input.bindings.humanResult.fileSha256 = '0'.repeat(64);
  assert.throws(
    () => buildPresentationAV002Layer1V3FixturesV001(input),
    /human result is invalid/u,
  );
});

test('APF006: proposalと人間結果の一対一対応崩れを拒否する', async () => {
  const {input} = await loadFixtureInputs();
  input.humanResult.results[2].candidateId = input.humanResult.results[1].candidateId;
  const humanBytes = Buffer.from(`${JSON.stringify(input.humanResult, null, 2)}\n`, 'utf8');
  input.bindings.humanResult.fileSha256 = sha256PresentationAV002Layer1V3BytesV001(humanBytes);
  input.bindings.humanResult.canonicalSha256 =
    canonicalSha256PresentationAV002Layer1V3JsonV001(input.humanResult);
  assert.throws(
    () => buildPresentationAV002Layer1V3FixturesV001(input),
    /legacy human results are ambiguous/u,
  );
});

test('APF007: v002 proof inputはidentityとatom transcriptを別bindingで保持する', async () => {
  const {input} = await loadFixtureInputs();
  const result = buildPresentationAV002Layer1V3FixturesV001(input);
  for (const item of result.fixtures) {
    assert.equal(
      item.proofInput.schemaVersion,
      PRESENTATION_A_V002_LAYER1_V3_PROOF_INPUT_SCHEMA_V001,
    );
    assert.notEqual(
      item.proofInput.sourceMedia.sourceIdentityBinding.fileSha256,
      item.proofInput.sourceMedia.sourceAtomTranscriptBinding.fileSha256,
    );
    assert.deepEqual(
      item.proofInput.sourceMedia.sourceAtomTranscriptBinding,
      result.normalizedTranscriptBinding,
    );
    for (const atom of item.proofInput.sourceAtoms) {
      const normalized = result.normalizedTranscript.atoms.find(entry => (
        entry.sourceAtomId === atom.sourceAtomId
      ));
      assert.ok(normalized);
      assert.equal(normalized.text, atom.text);
      assert.equal(normalized.sourceStartMs, atom.sourceStartMs);
      assert.equal(normalized.sourceEndMs, atom.sourceEndMs);
    }
    const extra = structuredClone(item.proofInput);
    extra.uncontracted = true;
    assert.equal(validatePresentationAV002Layer1V3ProofInputV001(extra), false);
  }
});

test('APF008: candidate59の保存済み六観測も複数retained spanで表現可能と確定する', async () => {
  const evidence = (await loadJson(PATHS.feasibilityEvidence)).value;
  assert.deepEqual(inspectPresentationAV002Candidate59FeasibilityV001(evidence), {
    status: 'passed',
    observationCount: 6,
    retainedAtomCount: 5,
  });
  const invalid = structuredClone(evidence);
  invalid.candidate59Evidence.observations[0].startMs = 5982369;
  invalid.candidate59Evidence.observations[0].endMs = 5984951;
  invalid.candidate59Evidence.observations[0].durationMs = 2582;
  assert.equal(inspectPresentationAV002Candidate59FeasibilityV001(invalid).status, 'rejected');
});
