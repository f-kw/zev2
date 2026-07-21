#!/usr/bin/env node

import {createHash} from 'node:crypto';
import {
  lstat,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rename,
  rm,
  writeFile,
} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

import {
  loadTrustedPresentationFirstRealDataRuntimeV001,
  readPresentationFirstRealDataVerifiedFileBytesV001,
} from './presentation_first_real_data_gate_v001.mjs';
import {
  PRESENTATION_BASE_MEDIA_ASSEMBLY_DECISION_SCHEMA_VERSION,
  validatePresentationBaseMediaAssemblyDecisionV001,
  validatePresentationBaseMediaSegmentPlanV001,
} from './presentation_base_media_build_v001.mjs';
import {canonicalJson} from './presentation_caption_contract_v002.mjs';
import {
  closePresentationFirstRealDataRenderedComparisonServingInputsV002,
  loadPresentationFirstRealDataRenderedComparisonServingInputsV002,
} from './serve_presentation_first_real_data_rendered_comparison_v002.mjs';
import {
  assertPresentationRenderedComparisonResultMayBeFormalizedV002,
  validatePresentationRenderedComparisonHumanResultV002,
} from './presentation_first_real_data_rendered_comparison_trust_v002.mjs';

export const PRESENTATION_FIRST_REAL_DATA_FORMALIZER_VERSION_V001 =
  'presentation-first-real-data-assembly-formalizer-v001';
export const PRESENTATION_FIRST_REAL_DATA_FORMALIZATION_RECEIPT_SCHEMA_V001 =
  'presentation-first-real-data-assembly-formalization-receipt-v001';
export const PRESENTATION_FIRST_REAL_DATA_FORMALIZATION_APPROVAL_SCHEMA_V001 =
  'presentation-first-real-data-formalization-approval-v001';

export const PRESENTATION_FIRST_REAL_DATA_FORMALIZATION_ROOT_V001 =
  'evals/clip_composition/outputs/presentation/20260722-first-real-data-assembly-decision-v001';
export const PRESENTATION_FIRST_REAL_DATA_ASSEMBLY_DECISION_PATH_V001 =
  `${PRESENTATION_FIRST_REAL_DATA_FORMALIZATION_ROOT_V001}/assembly-decision.json`;
export const PRESENTATION_FIRST_REAL_DATA_FORMALIZATION_RECEIPT_PATH_V001 =
  `${PRESENTATION_FIRST_REAL_DATA_FORMALIZATION_ROOT_V001}/formalization-receipt.json`;

const HUMAN_RESPONSE_ROOT =
  'evals/clip_composition/outputs/presentation/20260722-first-real-data-rendered-comparison-v002-human-response-v001';
export const PRESENTATION_FIRST_REAL_DATA_FORMALIZATION_FIXED_INPUTS_V001 = Object.freeze({
  humanResult: Object.freeze({
    path: `${HUMAN_RESPONSE_ROOT}/human-result.json`,
    fileSha256: '626c0463db84594133d5c288d1125aa5125a2a6e0e1fef6bfe929786a0d6bcdf',
  }),
  validationReceipt: Object.freeze({
    path: `${HUMAN_RESPONSE_ROOT}/validation-receipt.json`,
    fileSha256: 'd0244597dfa944b4fae62c18b0015fa043419454b74e2de13289b6a9db9831d4',
  }),
  humanObservation: Object.freeze({
    path: `${HUMAN_RESPONSE_ROOT}/human-observation.json`,
    fileSha256: '5e14ed036538eb1bcd27fc9c806eb1ba26932b40260208d306f1238fc5785829',
  }),
  formalizationApproval: Object.freeze({
    path: `${HUMAN_RESPONSE_ROOT}/formalization-approval.json`,
    fileSha256: '785605592c9180b7371ddc977c8b36494e9d893a97188d9af7229dc891a60f6b',
  }),
});

const MODULE_DIRECTORY = path.dirname(fileURLToPath(import.meta.url));
const WORKSPACE_ROOT = path.resolve(MODULE_DIRECTORY, '../..');
const OUTPUT_ROOT = path.join(WORKSPACE_ROOT, PRESENTATION_FIRST_REAL_DATA_FORMALIZATION_ROOT_V001);
const SHA256_PATTERN = /^[0-9a-f]{64}$/u;
const ISO_8601_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/u;

const sha256Bytes = (value) => createHash('sha256').update(value).digest('hex');
const sha256Canonical = (value) => sha256Bytes(canonicalJson(value));
const exactFields = (value, fields) => (
  value !== null
  && typeof value === 'object'
  && !Array.isArray(value)
  && Object.keys(value).length === fields.length
  && fields.every((field) => Object.hasOwn(value, field))
);
const sameValue = (left, right) => canonicalJson(left) === canonicalJson(right);
const clone = (value) => structuredClone(value);
const writeJson = (filePath, value) => writeFile(
  filePath,
  `${JSON.stringify(value, null, 2)}\n`,
  'utf8',
);

const readVerifiedJson = async (reference, label) => {
  const loaded = await readPresentationFirstRealDataVerifiedFileBytesV001(reference);
  let value;
  try {
    value = JSON.parse(loaded.bytes.toString('utf8'));
  } catch {
    throw new TypeError(`${label} is not valid JSON`);
  }
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new TypeError(`${label} JSON root must be an object`);
  }
  return {...loaded, value};
};

export const validatePresentationFirstRealDataFormalizationApprovalV001 = (approval) => {
  if (!exactFields(approval, [
    'schemaVersion', 'approvalId', 'approver', 'recordedAt', 'references', 'scope', 'conditions',
  ])) throw new TypeError('formalization approval fields are invalid');
  if (
    approval.schemaVersion !== PRESENTATION_FIRST_REAL_DATA_FORMALIZATION_APPROVAL_SCHEMA_V001
    || approval.approvalId !== 'DmWu0jVQfTE-candidate-13-formalization-approval-v001'
    || approval.approver !== 'kawafmm'
    || !ISO_8601_PATTERN.test(approval.recordedAt)
  ) throw new TypeError('formalization approval identity is invalid');
  if (!exactFields(approval.references, [
    'humanResult', 'validationReceipt', 'humanObservation',
  ])) throw new TypeError('formalization approval references are invalid');
  for (const field of ['humanResult', 'validationReceipt', 'humanObservation']) {
    if (!sameValue(approval.references[field], PRESENTATION_FIRST_REAL_DATA_FORMALIZATION_FIXED_INPUTS_V001[field])) {
      throw new TypeError(`formalization approval reference mismatch: ${field}`);
    }
  }
  if (!exactFields(approval.scope, [
    'action', 'candidateId', 'selectedVariantId',
    'baseMediaGenerationApproved', 'remainingCandidatesExpansionApproved',
  ]) || approval.scope.action !== 'formalize_selected_comparison_variant'
      || approval.scope.candidateId !== 13
      || approval.scope.selectedVariantId !== 'cut-gap2'
      || approval.scope.baseMediaGenerationApproved !== false
      || approval.scope.remainingCandidatesExpansionApproved !== false) {
    throw new TypeError('formalization approval scope is invalid');
  }
  if (!exactFields(approval.conditions, [
    'reproduceViewedVariantMappingsExactly',
    'gap02ReconfirmationRequired',
    'gap02KnownRiskRetained',
  ]) || approval.conditions.reproduceViewedVariantMappingsExactly !== true
      || approval.conditions.gap02ReconfirmationRequired !== false
      || approval.conditions.gap02KnownRiskRetained !== true) {
    throw new TypeError('formalization approval conditions are invalid');
  }
  return approval;
};

const assertReference = (actual, expected, label) => {
  if (!sameValue(actual, expected)) throw new TypeError(`${label} reference mismatch`);
};

export const createPresentationFirstRealDataFormalizationDocumentsV001 = ({
  humanResult,
  humanReceipt,
  humanObservation,
  approval,
  servingInputs,
  trustedRuntime,
}) => {
  validatePresentationFirstRealDataFormalizationApprovalV001(approval);
  const page = servingInputs.loadedJson.reviewPage;
  const manifest = servingInputs.loadedJson.comparisonManifest;
  const provenance = servingInputs.loadedJson.comparisonProvenance;
  const resultValidation = assertPresentationRenderedComparisonResultMayBeFormalizedV002(
    validatePresentationRenderedComparisonHumanResultV002({
      result: humanResult,
      page,
      manifest,
      provenance,
    }),
  );
  if (
    resultValidation.resultCanonicalSha256
      !== humanReceipt.humanResult?.canonicalSha256
    || resultValidation.recomputedResolution.variantId !== approval.scope.selectedVariantId
    || humanReceipt.validation?.fixedReferenceChain !== 'passed'
    || humanReceipt.validation?.resultSchema !== 'passed'
    || humanReceipt.validation?.resolutionRecomputation !== 'passed'
    || humanReceipt.validation?.contractMayCreateFormalAssemblyDecision !== true
    || humanReceipt.workflow?.formalAssemblyDecisionCreated !== false
  ) throw new TypeError('human response receipt does not authorize formalization');
  if (
    humanObservation.diagnosis?.selectedVariantAffected !== false
    || humanObservation.selectedBoundaryKnownRisk?.gapId !== 'gap-02'
    || humanObservation.selectedBoundaryKnownRisk?.humanAudibleDefect !== 'not_reported'
  ) throw new TypeError('human boundary observation is inconsistent with approval');

  const selectedVariant = provenance.variants.find(
    ({variantId}) => variantId === resultValidation.recomputedResolution.variantId,
  );
  if (
    !selectedVariant
    || selectedVariant.variantId !== 'cut-gap2'
    || !sameValue(selectedVariant.cutGapIds, ['gap-02'])
    || selectedVariant.media?.fileSha256 !== humanResult.selectedVariant.fileSha256
  ) throw new TypeError('selected comparison variant is invalid');

  const segments = selectedVariant.mappings.map(({sourceStartMs, sourceEndMs}) => ({
    sourceStartMs,
    sourceEndMs,
  }));
  const mappingValidation = validatePresentationBaseMediaSegmentPlanV001(
    segments,
    provenance.sourceClock,
    provenance.audioClock,
  );
  if (
    mappingValidation.status !== 'passed'
    || !sameValue(mappingValidation.mappings, selectedVariant.mappings)
  ) throw new TypeError('formal segments do not reproduce the viewed variant mappings');

  const trustedSummary = trustedRuntime.summary;
  const sourceIdentity = trustedRuntime.bindings.sourceIdentity.value;
  const basisEditPlanReference = trustedSummary.artifactBindings.basisEditPlan;
  const sourceIdentityReference = trustedSummary.artifactBindings.sourceIdentity;
  if (
    sourceIdentity.videoId !== 'DmWu0jVQfTE'
    || sourceIdentity.executionMedia.fileSha256 !== provenance.source.fileSha256
    || sourceIdentity.executionMedia.path !== provenance.source.path
  ) throw new TypeError('formalization source identity mismatch');

  const payload = {
    basisEditPlan: {
      kind: 'edit_plan_json',
      path: basisEditPlanReference.path,
      fileSha256: basisEditPlanReference.fileSha256,
    },
    sourceArtifact: {
      sourceProvenance: sourceIdentity.sourceProvenance,
      sourceRef: sourceIdentity.sourceRef,
      sourceUri: sourceIdentity.sourceUrl,
      fileSha256: sourceIdentity.executionMedia.fileSha256,
    },
    segments,
    unresolvedEdits: [],
  };
  const payloadSha256 = sha256Canonical(payload);
  const decision = {
    schemaVersion: PRESENTATION_BASE_MEDIA_ASSEMBLY_DECISION_SCHEMA_VERSION,
    decisionId: 'DmWu0jVQfTE-candidate-13-base-media-assembly-decision-v001',
    payload,
    approval: {
      status: 'approved',
      approverType: 'human',
      recordId: approval.approvalId,
      recordedAt: approval.recordedAt,
      targetPayloadSha256: payloadSha256,
    },
  };
  const decisionValidation = validatePresentationBaseMediaAssemblyDecisionV001(decision);
  if (decisionValidation.status !== 'passed') {
    throw new TypeError(`formal assembly decision is invalid: ${canonicalJson(decisionValidation.violations)}`);
  }

  const selectedMediaReference = servingInputs.references.mediaVariants.find(
    ({variantId}) => variantId === selectedVariant.variantId,
  );
  if (!selectedMediaReference || selectedMediaReference.fileSha256 !== selectedVariant.media.fileSha256) {
    throw new TypeError('selected media reference mismatch');
  }
  assertReference(
    servingInputs.references.comparisonProvenance,
    humanResult.comparisonProvenance,
    'comparison provenance',
  );

  const receipt = {
    schemaVersion: PRESENTATION_FIRST_REAL_DATA_FORMALIZATION_RECEIPT_SCHEMA_V001,
    formalizationId: 'DmWu0jVQfTE-candidate-13-assembly-formalization-v001',
    formalizerVersion: PRESENTATION_FIRST_REAL_DATA_FORMALIZER_VERSION_V001,
    status: 'passed',
    references: {
      humanResult: clone(PRESENTATION_FIRST_REAL_DATA_FORMALIZATION_FIXED_INPUTS_V001.humanResult),
      validationReceipt: clone(PRESENTATION_FIRST_REAL_DATA_FORMALIZATION_FIXED_INPUTS_V001.validationReceipt),
      humanObservation: clone(PRESENTATION_FIRST_REAL_DATA_FORMALIZATION_FIXED_INPUTS_V001.humanObservation),
      formalizationApproval: clone(PRESENTATION_FIRST_REAL_DATA_FORMALIZATION_FIXED_INPUTS_V001.formalizationApproval),
      comparisonSummary: clone(servingInputs.references.summary),
      comparisonProvenance: clone(servingInputs.references.comparisonProvenance),
      selectedMedia: clone(selectedMediaReference),
      trustedArtifactSummary: {
        path: trustedRuntime.summaryBinding.path,
        fileSha256: trustedRuntime.summaryBinding.fileSha256,
      },
      sourceIdentity: clone(sourceIdentityReference),
      basisEditPlan: clone(basisEditPlanReference),
      assemblyDecision: {
        path: PRESENTATION_FIRST_REAL_DATA_ASSEMBLY_DECISION_PATH_V001,
        fileSha256: null,
        payloadSha256,
      },
    },
    selection: {
      candidateId: humanResult.candidate.candidateId,
      variantId: selectedVariant.variantId,
      gapDecisions: clone(resultValidation.recomputedResolution.gapDecisions),
      mappingSource: 'fixed-comparison-provenance-v001',
      viewedMappings: clone(selectedVariant.mappings),
      expectedFrameCount: selectedVariant.expectedFrameCount,
      expectedAudioSampleCount: selectedVariant.expectedAudioSampleCount,
    },
    formalization: {
      segments: clone(segments),
      derivedMappings: clone(mappingValidation.mappings),
      mappingsMatchViewedVariant: true,
      decisionPayloadSha256: payloadSha256,
      frameSchemaLimitation: 'decision-v001はms区間のみを保持するため、正式生成時にも本receiptのframe・sample列との完全一致検査が必要',
    },
    knownBoundaryRisk: {
      gapId: 'gap-02',
      precedingCharacter: 'ど',
      annotatedDurationMs: 20,
      effectiveFrameEndDeltaMs: -3.333,
      humanReconfirmationRequired: false,
      handling: '人間が実媒体Dを聴取・採用済みのため区間を変更せず既知事項として保持',
    },
    workflow: {
      formalAssemblyDecisionCreated: true,
      baseMediaCreated: false,
      timelineCreated: false,
      renderingStarted: false,
      remainingCandidatesExpanded: false,
      nextGate: '正式基礎映像生成は別承認',
    },
  };
  return {decision, receipt};
};

export const loadPresentationFirstRealDataFormalizationInputsV001 = async (...args) => {
  if (args.length !== 0) throw new TypeError('formalization loader does not accept alternate inputs');
  const [humanResult, humanReceipt, humanObservation, approval, trustedRuntime] =
    await Promise.all([
      readVerifiedJson(
        PRESENTATION_FIRST_REAL_DATA_FORMALIZATION_FIXED_INPUTS_V001.humanResult,
        'human result',
      ),
      readVerifiedJson(
        PRESENTATION_FIRST_REAL_DATA_FORMALIZATION_FIXED_INPUTS_V001.validationReceipt,
        'validation receipt',
      ),
      readVerifiedJson(
        PRESENTATION_FIRST_REAL_DATA_FORMALIZATION_FIXED_INPUTS_V001.humanObservation,
        'human observation',
      ),
      readVerifiedJson(
        PRESENTATION_FIRST_REAL_DATA_FORMALIZATION_FIXED_INPUTS_V001.formalizationApproval,
        'formalization approval',
      ),
      loadTrustedPresentationFirstRealDataRuntimeV001(),
    ]);
  const servingInputs = await loadPresentationFirstRealDataRenderedComparisonServingInputsV002();
  return {
    humanResult: humanResult.value,
    humanReceipt: humanReceipt.value,
    humanObservation: humanObservation.value,
    approval: approval.value,
    servingInputs,
    trustedRuntime,
  };
};

export const buildPresentationFirstRealDataAssemblyDecisionV001 = async (...args) => {
  if (args.length !== 0) throw new TypeError('formalizer does not accept alternate inputs');
  try {
    await lstat(OUTPUT_ROOT);
    throw new Error(`formalization output already exists: ${PRESENTATION_FIRST_REAL_DATA_FORMALIZATION_ROOT_V001}`);
  } catch (error) {
    if (error?.code !== 'ENOENT') throw error;
  }
  const inputs = await loadPresentationFirstRealDataFormalizationInputsV001();
  const parent = path.dirname(OUTPUT_ROOT);
  await mkdir(parent, {recursive: true});
  const temporaryRoot = await mkdtemp(path.join(parent, '.assembly-formalization-v001-'));
  try {
    const {decision, receipt} = createPresentationFirstRealDataFormalizationDocumentsV001(inputs);
    const decisionPath = path.join(temporaryRoot, 'assembly-decision.json');
    await writeJson(decisionPath, decision);
    const decisionFileSha256 = sha256Bytes(await readFile(decisionPath));
    receipt.references.assemblyDecision.fileSha256 = decisionFileSha256;
    const receiptPath = path.join(temporaryRoot, 'formalization-receipt.json');
    await writeJson(receiptPath, receipt);
    const names = (await readdir(temporaryRoot)).sort();
    if (!sameValue(names, ['assembly-decision.json', 'formalization-receipt.json'])) {
      throw new TypeError('formalization output contains an unexpected file');
    }
    await rename(temporaryRoot, OUTPUT_ROOT);
    return {decision, receipt, outputRoot: OUTPUT_ROOT};
  } catch (error) {
    await rm(temporaryRoot, {recursive: true, force: true});
    throw error;
  } finally {
    await closePresentationFirstRealDataRenderedComparisonServingInputsV002(inputs.servingInputs);
  }
};

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  buildPresentationFirstRealDataAssemblyDecisionV001()
    .then(() => process.stdout.write(`${PRESENTATION_FIRST_REAL_DATA_FORMALIZATION_ROOT_V001}\n`))
    .catch((error) => {
      process.stderr.write(`${error.stack ?? error.message}\n`);
      process.exitCode = 1;
    });
}
