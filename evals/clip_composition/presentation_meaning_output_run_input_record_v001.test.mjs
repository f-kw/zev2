import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdtemp, mkdir, readFile, writeFile} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import {
  PRESENTATION_MEANING_OUTPUT_RUN_INPUT_PUBLICATION_JOB_SCHEMA_V001,
  PRESENTATION_MEANING_OUTPUT_RUN_INPUT_RECORD_SCHEMA_V001,
  PRESENTATION_MEANING_OUTPUT_RUN_INPUT_STAGES_V001,
  PRESENTATION_MEANING_OUTPUT_RUN_INPUT_VIOLATION_CODES_V001,
  PRESENTATION_MEANING_OUTPUT_STAGE_ADMISSION_JOB_SCHEMA_V001,
  PRESENTATION_MEANING_OUTPUT_STAGE_ADMISSION_JOB_SCHEMA_V002,
  PRESENTATION_MEANING_OUTPUT_STAGE_ADMISSION_RECEIPT_SCHEMA_V001,
  PRESENTATION_MEANING_OUTPUT_STAGE_ADMISSION_RECEIPT_SCHEMA_V002,
  derivePresentationMeaningOutputStageProjectionV001,
  derivePresentationMeaningOutputStageProjectionV002,
  buildPresentationMeaningOutputStageAdmissionReceiptV001,
  buildPresentationMeaningOutputStageAdmissionReceiptV002,
  canonicalSha256PresentationMeaningOutputRunInputJsonV001,
  serializePresentationMeaningOutputRunInputFormalJsonV001,
  validatePresentationMeaningOutputRunInputPublicationJobV001,
  validatePresentationMeaningOutputRunInputPublicationJobEnvelopeV001,
  validatePresentationMeaningOutputRunInputRecordV001,
  validatePresentationMeaningOutputStageAdmissionJobV001,
  validatePresentationMeaningOutputStageAdmissionJobV002,
  validatePresentationMeaningOutputStageAdmissionReceiptV001,
  validatePresentationMeaningOutputStageAdmissionReceiptV002,
  validatePresentationMeaningOutputStageAdmissionReceiptSetV001,
  validatePresentationMeaningOutputStageAdmissionReceiptSetV002,
} from './presentation_meaning_output_run_input_record_v001.mjs';
import {
  PRESENTATION_MEANING_BOUNDARY_TASK_DESCRIPTION_V001,
} from './presentation_meaning_boundary_source_package_v001.mjs';
import {
  projectPresentationMeaningBoundaryB6AuthorizationLineV001,
  validatePresentationMeaningBoundaryB5JobV001,
  validatePresentationMeaningBoundaryB6JobV001,
} from './run_presentation_meaning_boundary_b5_b6_v001.mjs';
import {
  PRESENTATION_OUTPUT_APPROVED_CONTRACT_BINDINGS_V001,
  PRESENTATION_OUTPUT_FORMAL_IMPLEMENTATION_ROLES_V001,
} from './presentation_output_contract_v001.mjs';
import {
  canonicalSha256PresentationOutputFiniteJsonV001,
} from './presentation_output_crop_application_v001.mjs';

const SHA_A = 'a'.repeat(64);
const SHA_B = 'b'.repeat(64);
const SHA_C = 'c'.repeat(64);
const ROOT = 'evals/clip_composition/outputs/presentation/meaning-output-run-input-records';
const CORE = 'evals/clip_composition/presentation_meaning_output_run_input_record_v001.mjs';
const RUNNER = 'evals/clip_composition/run_presentation_meaning_output_run_input_record_v001.mjs';

const clone = value => structuredClone(value);
const sha256 = value => createHash('sha256').update(value).digest('hex');
const binding = (schemaVersion, name, fileSha256 = SHA_A, canonicalSha256 = SHA_B) => ({
  schemaVersion,
  path: `fixtures/${name}.json`,
  fileSha256,
  canonicalSha256,
});
const implementationBindings = () => [
  {path: CORE, fileSha256: SHA_A, role: 'run-input-record'},
  {path: RUNNER, fileSha256: SHA_B, role: 'run-input-record-runner'},
];
const record = () => ({
  schemaVersion: PRESENTATION_MEANING_OUTPUT_RUN_INPUT_RECORD_SCHEMA_V001,
  recordId: 'synthetic-meaning-output-first-run-v001',
  sourceAndInterval: {
    sourceRef: 'youtube:AbCdEfGhI_1',
    candidateId: 7,
    assemblyDecision: binding(
      'presentation-base-media-assembly-decision-v001',
      'assembly-decision',
    ),
    sourceStartMs: 1000,
    sourceEndMs: 4200,
  },
  horizontalStyle: {
    format: 'normal-landscape',
    presetId: 'normal-landscape-readable-pop-v001',
    maxLogicalWidthPerLine: 36,
    crop: {mode: 'identity'},
  },
  verticalStyle: {
    format: 'vertical-short-1080x1920',
    screenLayoutId: 'speaker_only',
    presetId: 'vertical-short-speaker-only-readable-pop-v001',
    maxLogicalWidthPerLine: 14,
    cropDecision: binding('vertical-preset-type-crop-decision-v006', 'crop-decision'),
    selectionPackageManifest: binding(
      'vertical-preset-type-crop-selection-package-v006',
      'selection-package-manifest',
    ),
  },
  spendingLimit: {currency: 'USD', maximumNanoUsd: 500000000},
  title: {text: '', inputMode: 'none'},
});

const publicationJob = () => {
  const value = record();
  return {
    schemaVersion: PRESENTATION_MEANING_OUTPUT_RUN_INPUT_PUBLICATION_JOB_SCHEMA_V001,
    jobId: 'synthetic-run-input-publication-job-v001',
    action: 'publish-run-input-record',
    record: value,
    outputRoot: `${ROOT}/${value.recordId}`,
    implementationBindings: implementationBindings(),
    executionPolicy: {oneShot: true, allowOverwrite: false},
  };
};

const admissionJob = stageDefinition => {
  const value = record();
  const recordPath = `${ROOT}/${value.recordId}/run-input-record.json`;
  return {
    schemaVersion: PRESENTATION_MEANING_OUTPUT_STAGE_ADMISSION_JOB_SCHEMA_V001,
    jobId: `${value.recordId}-${stageDefinition.ordinal}-${stageDefinition.stage}-job`,
    action: 'admit-stage',
    stage: stageDefinition.stage,
    runInputRecordBinding: {
      schemaVersion: value.schemaVersion,
      path: recordPath,
      fileSha256: SHA_A,
      canonicalSha256: SHA_B,
    },
    targetJobBinding: binding('synthetic-target-job-v001', 'target-job', SHA_B, SHA_C),
    upstreamBindings: stageDefinition.upstreamRoles.map((role, index) => ({
      role,
      schemaVersion: role.endsWith('base-media') ? null : `synthetic-${role}-v001`,
      path: `fixtures/upstream-${index}-${role}.${role.endsWith('base-media') ? 'mp4' : 'json'}`,
      fileSha256: index % 2 === 0 ? SHA_A : SHA_B,
      canonicalSha256: role.endsWith('base-media') ? null : SHA_C,
    })),
    outputRoot: `${ROOT}/${value.recordId}/admissions/`
      + `${stageDefinition.ordinal}-${stageDefinition.stage}`,
    implementationBindings: implementationBindings(),
    executionPolicy: {oneShot: true, allowOverwrite: false},
  };
};

const v2ReceiptPath = (stageDefinition, attemptOrdinal, recordId = record().recordId) =>
  `${ROOT}/${recordId}/admissions-v002/${stageDefinition.ordinal}-${stageDefinition.stage}`
    + `/attempt-${String(attemptOrdinal).padStart(4, '0')}/stage-admission-receipt.json`;
const v2ReceiptBinding = (
  stageDefinition,
  attemptOrdinal,
  recordId = record().recordId,
) => ({
  schemaVersion: PRESENTATION_MEANING_OUTPUT_STAGE_ADMISSION_RECEIPT_SCHEMA_V002,
  path: v2ReceiptPath(stageDefinition, attemptOrdinal, recordId),
  fileSha256: SHA_A,
  canonicalSha256: SHA_B,
});
const asAdmissionJobV002 = (
  value,
  attemptOrdinal = 1,
  supersedesReceipt = null,
) => {
  const job = clone(value);
  const definition = PRESENTATION_MEANING_OUTPUT_RUN_INPUT_STAGES_V001.find(
    item => item.stage === job.stage,
  );
  const recordRoot = job.runInputRecordBinding.path.replace(/\/run-input-record\.json$/u, '');
  job.schemaVersion = PRESENTATION_MEANING_OUTPUT_STAGE_ADMISSION_JOB_SCHEMA_V002;
  job.outputRoot = `${recordRoot}/admissions-v002/${definition.ordinal}-${definition.stage}`
    + `/attempt-${String(attemptOrdinal).padStart(4, '0')}`;
  job.attempt = {attemptOrdinal, supersedesReceipt};
  return job;
};
const admissionJobV002 = (
  stageDefinition,
  attemptOrdinal = 1,
  supersedesReceipt = null,
) => asAdmissionJobV002(
  admissionJob(stageDefinition),
  attemptOrdinal,
  supersedesReceipt,
);

const jsonArtifactBinding = (schemaVersion, name, seed = 'a') =>
  binding(schemaVersion, name, seed.repeat(64), SHA_B);
const mediaArtifactBinding = (name, seed = 'a') => ({
  path: `fixtures/${name}.mp4`,
  fileSha256: seed.repeat(64),
});
const upstreamBinding = (role, value, seed = 'a') => value instanceof Uint8Array
  ? {role, schemaVersion: null, path: `fixtures/${role}.mp4`, fileSha256: seed.repeat(64),
    canonicalSha256: null}
  : {role, schemaVersion: value.schemaVersion, path: `fixtures/${role}.json`,
    fileSha256: seed.repeat(64), canonicalSha256: SHA_C};

const retainedBindings = () => ({
  sourceAtoms: jsonArtifactBinding(
    'presentation-retained-source-atoms-v001', 'source-atoms', '1',
  ),
  generationManifest: jsonArtifactBinding(
    'presentation-retained-source-atoms-generation-manifest-v001',
    'source-atoms-generation', '2',
  ),
  validationReport: jsonArtifactBinding(
    'presentation-retained-source-atoms-validation-report-v001',
    'source-atoms-validation', '3',
  ),
});

const timelineDecision = () => ({
  schemaVersion: 'zev-timeline-composition-decision-v001',
  decisionId: 'synthetic-timeline-decision-v001',
  sourceMedia: [{
    sourceMediaId: 'source-media-000001',
    ordinal: 1,
    sourceRef: record().sourceAndInterval.sourceRef,
    mediaBinding: mediaArtifactBinding('source'),
    sourceIdentityBinding: jsonArtifactBinding(
      'presentation-real-data-source-identity-v001', 'source-identity', '4',
    ),
    retainedSourceAtomsBinding: retainedBindings(),
  }],
  segments: [{
    segmentId: 'segment-0001',
    ordinal: 1,
    sourceMediaId: 'source-media-000001',
    sourceStartMs: record().sourceAndInterval.sourceStartMs,
    sourceEndMs: record().sourceAndInterval.sourceEndMs,
  }],
  decisionProvenance: {
    inputDecisionBinding: jsonArtifactBinding(
      'zev-timeline-composition-decision-job-v001', 'timeline-job', '5',
    ),
    recordedBy: 'human',
    recordedAt: '2026-08-03T00:00:00Z',
  },
});

const sourcePackage = () => {
  const sourceMediaId = 'source-media-000001';
  const timelineSegmentId = 'segment-0001';
  const strictBinding = {
    path: 'evals/clip_composition/presentation_caption_semantic_source_package_v001.mjs',
    fileSha256: '4'.repeat(64),
    role: 'strict-json',
  };
  const implementations = [
    {
      path: 'evals/clip_composition/presentation_meaning_boundary_source_package_v001.mjs',
      fileSha256: '1'.repeat(64),
      role: 'meaning-source-package',
    },
    {
      path: 'evals/clip_composition/presentation_segmenter_boundary_evidence_v001.mjs',
      fileSha256: '2'.repeat(64),
      role: 'gate-a-core',
    },
    {
      path: 'evals/clip_composition/run_presentation_segmenter_boundary_preflight_v001.mjs',
      fileSha256: '3'.repeat(64),
      role: 'gate-a-preflight',
    },
    strictBinding,
  ];
  const atomRef = {timelineSegmentId, sourceMediaId, atomId: 'atom-001'};
  const candidate = {
    boundaryCandidateId: 'segmenter-boundary-000001',
    ordinal: 1,
    atomRefs: [atomRef],
    text: '甲',
    startAnchor: {atomRef, edge: 'start'},
    endAnchor: {atomRef, edge: 'end'},
    sourceStartMs: 1000,
    sourceEndMs: 1100,
    isWordLike: true,
  };
  const decisionBinding = jsonArtifactBinding(
    'zev-timeline-composition-decision-v001', 'timeline-decision', '5',
  );
  return {
    schemaVersion: 'presentation-meaning-boundary-source-package-v001',
    packageId: 'synthetic-source-package-v001',
    timelineCompositionDecisionBinding: decisionBinding,
    runtimeBinding: {
      segmenterSources: [{
        sourceMediaId,
        preflightReportBinding: jsonArtifactBinding(
          'presentation-segmenter-boundary-preflight-report-v001', 'preflight', '6',
        ),
        evidenceBinding: jsonArtifactBinding(
          'presentation-segmenter-boundary-evidence-v001', 'evidence', '7',
        ),
        runtimeProjection: {
          nodeBinarySha256: '8'.repeat(64),
          nodeVersion: 'v20.19.6',
          icuVersion: '75.1',
          resolvedLocale: 'ja',
          resolvedGranularity: 'word',
        },
      }],
      strictJsonImplementationBinding: strictBinding,
    },
    containers: [{
      containerId: 'segmenter-container-000001',
      ordinal: 1,
      sourceMediaId,
      timelineSegmentId,
      boundaryCandidates: [candidate],
    }],
    candidateOccurrenceMap: [{
      boundaryCandidateId: candidate.boundaryCandidateId,
      timelineSegmentId,
      sourceMediaId,
      sourceGateAContainerId: 'segmenter-container-000001',
      sourceGateABoundaryCandidateId: 'segmenter-boundary-000001',
      atomRefs: [atomRef],
    }],
    taskDescription: PRESENTATION_MEANING_BOUNDARY_TASK_DESCRIPTION_V001,
    provenance: {
      sourcePackageJobBinding: jsonArtifactBinding(
        'presentation-meaning-boundary-source-package-job-v001', 'source-package-job', '9',
      ),
      timelineCompositionDecisionBinding: decisionBinding,
      implementationBindings: implementations,
    },
  };
};

const officialSnapshot = () => {
  const sources = [
    ['pricing', 'https://ai.google.dev/gemini-api/docs/pricing'],
    ['tokens-guide', 'https://ai.google.dev/gemini-api/docs/tokens'],
    ['count-tokens-api', 'https://ai.google.dev/api/tokens'],
    ['billing', 'https://ai.google.dev/gemini-api/docs/billing'],
    ['thinking', 'https://ai.google.dev/gemini-api/docs/generate-content/thinking'],
    ['latest-model', 'https://ai.google.dev/gemini-api/docs/latest-model'],
  ].map(([sourceId, url], index) => ({
    sourceId,
    url,
    observedAt: '2026-08-03T00:00:00.000Z',
    snapshotPath: `fixtures/official/${sourceId}.html`,
    snapshotFileSha256: String(index + 1).repeat(64),
    snapshotByteLength: index + 1,
  }));
  const evidence = sourceId => {
    const source = sources.find(item => item.sourceId === sourceId);
    return [{
      sourceId,
      utf8ByteOffset: 0,
      utf8ByteLength: source.snapshotByteLength,
      excerptSha256: source.snapshotFileSha256,
      locatorLabel: `whole-snapshot:${sourceId}`,
    }];
  };
  return {
    modelId: 'gemini-3.6-flash',
    modelResource: 'models/gemini-3.6-flash',
    observedAt: '2026-08-03T00:00:00.000Z',
    inputLimit: 1048576,
    outputLimit: 65536,
    tier: 'PAID_STANDARD_DEFAULT_BY_OMISSION',
    inputPriceNanoUsdPerToken: 1500,
    outputPriceNanoUsdPerToken: 7500,
    sources,
    claims: [
      ['model-exists', 'verified', 'latest-model'],
      ['input-limit', 'verified', 'latest-model'],
      ['output-limit', 'verified', 'latest-model'],
      ['standard-input-price', 'verified', 'pricing'],
      ['standard-output-price', 'verified', 'pricing'],
      ['service-tier-omission-standard', 'verified', 'pricing'],
      ['count-tokens-unbilled', 'unverified', null],
      ['count-tokens-upper-bounds-prompt-billing', 'contradicted', 'tokens-guide'],
      ['max-output-upper-bounds-candidate-plus-thinking', 'unverified', null],
    ].map(([claimId, verdict, sourceId]) => ({
      claimId,
      verdict,
      evidence: sourceId === null ? [] : evidence(sourceId),
    })),
  };
};

const meaningBoundaryContractBindings = () => [
  {
    path: 'evals/clip_composition/reports/presentation/'
      + 'presentation-meaning-information-package-contract-design-20260803-v001.md',
    fileSha256: SHA_A,
    role: 'meaning-package-contract',
  },
  {
    path: 'evals/clip_composition/reports/presentation/'
      + 'presentation-output-side-acceptance-contract-design-20260803-v001.md',
    fileSha256: SHA_B,
    role: 'output-side-contract',
  },
];
const meaningBoundaryB5ImplementationBindings = () => [
  {
    path: 'evals/clip_composition/presentation_meaning_boundary_source_package_v001.mjs',
    fileSha256: SHA_A,
    role: 'meaning-source-package',
  },
  {
    path: 'evals/clip_composition/run_presentation_meaning_boundary_b5_b6_v001.mjs',
    fileSha256: SHA_B,
    role: 'meaning-boundary-api-runner',
  },
  {
    path: 'evals/clip_composition/presentation_caption_semantic_source_package_v001.mjs',
    fileSha256: SHA_C,
    role: 'strict-json-codec',
  },
  {
    path: 'evals/clip_composition/presentation_caption_api_cost_guard_v001.mjs',
    fileSha256: 'd'.repeat(64),
    role: 'api-cost-policy',
  },
];
const meaningBoundaryB6ImplementationBindings = () => [
  {
    path: 'evals/clip_composition/run_presentation_meaning_boundary_b5_b6_v001.mjs',
    fileSha256: SHA_A,
    role: 'meaning-boundary-api-runner',
  },
  {
    path: 'evals/clip_composition/run_presentation_caption_gate_b6_v001.mjs',
    fileSha256: SHA_B,
    role: 'api-transport',
  },
  {
    path: 'evals/clip_composition/presentation_caption_api_cost_guard_v001.mjs',
    fileSha256: SHA_C,
    role: 'api-cost-policy',
  },
  {
    path: 'evals/clip_composition/presentation_caption_semantic_source_package_v001.mjs',
    fileSha256: 'd'.repeat(64),
    role: 'strict-json-codec',
  },
];
const officialSnapshotForB5Job = jobId => {
  const snapshot = officialSnapshot();
  const basenameBySourceId = {
    pricing: 'pricing.snapshot.html',
    'tokens-guide': 'tokens-guide.snapshot.html',
    'count-tokens-api': 'count-tokens-api.snapshot.html',
    billing: 'billing.snapshot.html',
    thinking: 'thinking.snapshot.html',
    'latest-model': 'latest-model.snapshot.html',
  };
  snapshot.sources = snapshot.sources.map(source => ({
    ...source,
    snapshotPath: 'evals/clip_composition/inputs/presentation/'
      + `gemini-api-official-snapshots/${jobId}/${basenameBySourceId[source.sourceId]}`,
  }));
  return snapshot;
};
const fullMeaningBoundaryB5Job = (sourcePackageBinding, spendingLimit) => {
  const jobId = 'synthetic-meaning-output-b5-v001';
  const officialVerification = officialSnapshotForB5Job(jobId);
  const job = {
    schemaVersion: 'presentation-meaning-boundary-b5-job-v001',
    jobId,
    attemptId: 'attempt-v001',
    action: 'measure-only',
    sourcePackageBinding,
    outputRoot: 'evals/clip_composition/outputs/presentation/meaning-boundary-b5-attempts/'
      + `${jobId}/attempt-v001`,
    executionConfiguration: {
      product: 'Gemini Developer API',
      apiVersion: 'v1beta',
      endpointClass: 'synchronous',
      configuredModelId: officialVerification.modelId,
      modelResource: officialVerification.modelResource,
      thinkingLevel: 'medium',
      responseMimeType: 'application/json',
      modelOutputTokenLimit: officialVerification.outputLimit,
      serviceTierPolicy: 'omit-field-use-paid-standard-default',
      clientTimeoutMilliseconds: 600000,
      automaticRetries: 0,
    },
    officialVerification,
    spendingAuthorization: {
      currency: spendingLimit.currency,
      maximumNanoUsd: spendingLimit.maximumNanoUsd,
      inputPriceNanoUsdPerToken: officialVerification.inputPriceNanoUsdPerToken,
      outputPriceNanoUsdPerToken: officialVerification.outputPriceNanoUsdPerToken,
      status: 'approved-for-measurement',
    },
    implementationBindings: meaningBoundaryB5ImplementationBindings(),
    approvedContractBindings: meaningBoundaryContractBindings(),
  };
  assert.equal(validatePresentationMeaningBoundaryB5JobV001(job), job);
  return job;
};
const fullMeaningBoundaryB6Job = (
  b5ManifestBinding,
  generateRequestBinding,
  spendingLimit,
) => {
  const jobId = 'synthetic-meaning-output-b6-v001';
  const job = {
    schemaVersion: 'presentation-meaning-boundary-b6-job-v001',
    jobId,
    attemptId: 'attempt-v001',
    action: 'generate-once',
    b5ManifestBinding,
    generateRequestBinding,
    outputRoot: 'evals/clip_composition/outputs/presentation/meaning-boundary-b6-attempts/'
      + `${jobId}/attempt-v001`,
    executionPolicy: {
      oneShot: true,
      allowRetry: false,
      timeoutMilliseconds: 600000,
      rawResponseMustPrecedeParsing: true,
      allowRepair: false,
    },
    sendAuthorization: {
      decisionLineBinding: null,
      status: 'approved-for-single-send',
      currency: spendingLimit.currency,
      maximumNanoUsd: spendingLimit.maximumNanoUsd,
      inputPriceNanoUsdPerToken: 1500,
      outputPriceNanoUsdPerToken: 7500,
      finalInputTokens: 1000,
      maxOutputTokens: 1000,
      preSendEstimateNanoUsd: 9000000,
    },
    implementationBindings: meaningBoundaryB6ImplementationBindings(),
    approvedContractBindings: meaningBoundaryContractBindings(),
  };
  const lineText = projectPresentationMeaningBoundaryB6AuthorizationLineV001(job);
  job.sendAuthorization.decisionLineBinding = {
    path: 'DECISIONS.md',
    lineText,
    lineSha256: sha256(Buffer.from(lineText, 'utf8')),
  };
  assert.equal(validatePresentationMeaningBoundaryB6JobV001(job), job);
  return job;
};

const b5Manifest = sourceBinding => {
  const jobBinding = jsonArtifactBinding(
    'presentation-meaning-boundary-b5-job-v001', 'b5-job', 'a',
  );
  return {
    schemaVersion: 'presentation-meaning-boundary-b5-manifest-v001',
    manifestId: `presentation-meaning-boundary-b5-manifest-${jobBinding.fileSha256.slice(0, 32)}`,
    status: 'passed',
    b5JobBinding: jobBinding,
    sourcePackageBinding: sourceBinding,
    generateRequestBinding: mediaArtifactBinding('generate-request', '1'),
    tokenCountBindings: {
      probeRequest: mediaArtifactBinding('probe-request', '2'),
      probeResponse: mediaArtifactBinding('probe-response', '3'),
      finalRequest: mediaArtifactBinding('final-request', '4'),
      finalResponse: mediaArtifactBinding('final-response', '5'),
      maximumResponseStructure: mediaArtifactBinding('maximum-response', '6'),
    },
    officialSnapshot: officialSnapshot(),
    tokenProjection: {
      probeInputTokenCount: 1000,
      finalInputTokenCount: 1010,
      modelOutputTokenLimit: 65536,
      derivedMaxOutputTokens: 65000,
      maximumValidResponseCanonicalByteLength: 256,
    },
    costProjection: {
      currency: 'USD',
      maximumNanoUsd: 500000000,
      preSendEstimateNanoUsd: 489015000,
      verdict: 'within-approved-limit',
      residualRiskDecisionLineBinding: {
        path: 'DECISIONS.md',
        lineText: 'synthetic approved B5 residual risk',
        lineSha256: sha256(Buffer.from('synthetic approved B5 residual risk', 'utf8')),
      },
    },
    checks: {
      sourceBinding: 'passed', visibleInput: 'passed', requestByte: 'passed',
      responseSchema: 'passed', officialSnapshot: 'passed', probeTokenCount: 'passed',
      finalTokenCount: 'passed', maximumResponseDiagnosis: 'passed', costLimit: 'passed',
      secretAbsence: 'passed', artifactHashGraph: 'passed',
    },
  };
};

const providerEnvelope = () => ({
  schemaVersion: 'presentation-meaning-boundary-provider-response-envelope-v001',
  envelopeId: 'synthetic-provider-envelope-v001',
  rawResponseBinding: mediaArtifactBinding('raw-response', '7'),
  httpStatus: 200,
  contentType: 'application/json; charset=UTF-8',
  responseModelVersion: 'gemini-3.6-flash',
  observedServiceTier: 'standard',
  usageMetadata: {
    promptTokenCount: 10, candidatesTokenCount: 2, thoughtsTokenCount: 1,
    totalTokenCount: 13,
  },
  semanticText: '{"status":"complete"}\n',
});

const b6Manifest = b5Binding => {
  const jobBinding = jsonArtifactBinding(
    'presentation-meaning-boundary-b6-job-v001', 'b6-job', 'b',
  );
  return {
    schemaVersion: 'presentation-meaning-boundary-b6-manifest-v001',
    manifestId: `presentation-meaning-boundary-b6-manifest-${jobBinding.fileSha256.slice(0, 32)}`,
    status: 'passed-transport',
    b6JobBinding: jobBinding,
    b5ManifestBinding: b5Binding,
    generateRequestBinding: mediaArtifactBinding('generate-request', '1'),
    rawResponseBinding: mediaArtifactBinding('raw-response', '2'),
    providerEnvelopeBinding: jsonArtifactBinding(
      'presentation-meaning-boundary-provider-response-envelope-v001',
      'provider-envelope', '3',
    ),
    usageListPriceEstimate: {
      currency: 'USD', promptCostNanoUsd: 15000, outputCostNanoUsd: 22500,
      totalCostNanoUsd: 37500, withinApprovedLimit: true,
      exceededPreSendEstimate: false,
      billingObservation: 'usage-metadata-list-price-estimate-invoice-not-observed',
    },
    primaryRejectionCode: null,
    transport: {
      endpoint: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent',
      method: 'POST', clientTimeoutMilliseconds: 600000, automaticRetries: 0,
      generateContentCalls: 1, authorizationHeader: '<redacted>',
    },
    checks: {
      requestByte: 'passed', rawFirst: 'passed', httpEnvelope: 'passed', model: 'passed',
      usage: 'passed', cost: 'passed', responseCandidateCount: 'passed',
      candidateContent: 'passed', secretAbsence: 'passed',
    },
    implementationBindings: [
      {
        path: 'evals/clip_composition/run_presentation_meaning_boundary_b5_b6_v001.mjs',
        fileSha256: '2'.repeat(64), role: 'meaning-boundary-api-runner',
      },
      {
        path: 'evals/clip_composition/run_presentation_caption_gate_b6_v001.mjs',
        fileSha256: '5'.repeat(64), role: 'api-transport',
      },
      {
        path: 'evals/clip_composition/presentation_caption_api_cost_guard_v001.mjs',
        fileSha256: '4'.repeat(64), role: 'api-cost-policy',
      },
      {
        path: 'evals/clip_composition/presentation_caption_semantic_source_package_v001.mjs',
        fileSha256: '3'.repeat(64), role: 'strict-json-codec',
      },
    ],
  };
};

const semanticArtifacts = (sourceBinding, b6Binding, providerBinding) => {
  const suffix = 'd'.repeat(32);
  const selectionBinding = jsonArtifactBinding(
    'presentation-meaning-boundary-selection-v001', 'semantic-selection', 'd',
  );
  const selection = {
    schemaVersion: 'presentation-meaning-boundary-selection-v001',
    selectionId: `presentation-meaning-boundary-selection-${suffix}`,
    sourcePackageBinding: sourceBinding,
    b6ManifestBinding: b6Binding,
    providerEnvelopeBinding: providerBinding,
    response: {
      status: 'complete',
      containers: [{
        containerId: 'segmenter-container-000001',
        meaningGroups: [{meaningGroupEndBoundaryCandidateId: 'segmenter-boundary-000001'}],
      }],
    },
  };
  const report = {
    schemaVersion: 'presentation-caption-meaning-boundary-validation-report-v001',
    reportId: `presentation-meaning-boundary-validation-report-${suffix}`,
    status: 'passed',
    sourcePackageBinding: sourceBinding,
    rawResponseBinding: mediaArtifactBinding('raw-response', 'e'),
    selectionBinding,
    checks: [
      'sourcePackageBinding', 'responseEnvelope', 'responseSchema', 'containerBijection',
      'candidateResolution', 'endMonotonicity', 'containerFinalEnd', 'candidateCoverage',
      'atomOccurrenceCoverage', 'captionProjection',
    ].map(name => ({name, status: 'passed', violationCodes: []})),
    violations: [],
    selectionProjection: {
      containerCount: 1, meaningGroupCount: 1, selectedBoundaryCount: 1,
      selectionCanonicalSha256: SHA_A,
    },
    captionProjection: {
      captionCount: 1, atomOccurrenceCount: 1,
      captionTextSequenceCanonicalSha256: SHA_A,
      captionTimingSequenceCanonicalSha256: SHA_B,
      captionAtomRefSequenceCanonicalSha256: SHA_C,
    },
    implementationBindings: [
      {
        path: 'evals/clip_composition/presentation_meaning_boundary_selection_v001.mjs',
        fileSha256: SHA_A, role: 'meaning-selection',
      },
      {
        path: 'evals/clip_composition/presentation_meaning_boundary_source_package_v001.mjs',
        fileSha256: SHA_B, role: 'meaning-source-package',
      },
      {
        path: 'evals/clip_composition/presentation_caption_semantic_source_package_v001.mjs',
        fileSha256: SHA_C, role: 'strict-json-codec',
      },
    ],
  };
  return {selection, selectionBinding, report};
};

const meaningPackage = () => {
  const atomRef = {
    timelineSegmentId: 'segment-0001',
    sourceMediaId: 'source-media-000001',
    atomId: 'atom-001',
  };
  return {
    schemaVersion: 'zev-meaning-information-package-v001',
    packageId: 'synthetic-meaning-information-v001',
    sourceMedia: timelineDecision().sourceMedia,
    timelineComposition: {
      timelineId: 'synthetic-meaning-information-v001-timeline',
      segments: timelineDecision().segments,
    },
    captions: [{
      captionId: 'caption-000001',
      ordinal: 1,
      timelineSegmentId: 'segment-0001',
      text: '甲',
      atomRefs: [atomRef],
      startAnchor: {atomRef, edge: 'start'},
      endAnchor: {atomRef, edge: 'end'},
      sourceStartMs: 1000,
      sourceEndMs: 1100,
    }],
    title: {text: '', inputMode: 'none'},
    semanticObservations: [],
    provenance: {
      formalJobBinding: jsonArtifactBinding(
        'zev-meaning-information-package-job-v001', 'meaning-job', 'a',
      ),
      timelineCompositionBinding: jsonArtifactBinding(
        'zev-timeline-composition-decision-v001', 'timeline-decision', 'b',
      ),
      semanticSelectionValidationBinding: jsonArtifactBinding(
        'presentation-caption-meaning-boundary-validation-report-v001',
        'semantic-validation', 'c',
      ),
    },
  };
};

const outputRequest = ({vertical = false, cropApplicationBinding = null} = {}) => {
  const requestId = vertical ? 'synthetic-output-vertical-v001' : 'synthetic-output-landscape-v001';
  const schemaSet = vertical
    ? [
      'presentation-registry-trust-v002', 'presentation-preset-registry-v002',
      'vertical-short-preset-registry-v001', 'presentation-material-registry-empty-v001',
      'presentation-vertical-renderer-trust-v001',
    ]
    : [
      'presentation-registry-trust-v001', 'presentation-preset-registry-v001',
      'normal-landscape-preset-registry-v001', 'presentation-material-registry-empty-v001',
      'presentation-renderer-trust-v001',
    ];
  const [trusted, preset, index, materials, renderer] = schemaSet.map((schema, position) =>
    jsonArtifactBinding(schema, `style-${position}`, String(position + 1)));
  return {
    schemaVersion: 'presentation-output-request-v001',
    requestId,
    mode: 'formal-generation',
    meaningInformationPackage: jsonArtifactBinding(
      'zev-meaning-information-package-v001', 'meaning-package', '1',
    ),
    baseMediaInput: {
      baseMedia: mediaArtifactBinding('base-media', '2'),
      timeline: jsonArtifactBinding('presentation-base-media-timeline-v002', 'timeline', '3'),
      generationManifest: jsonArtifactBinding(
        'presentation-output-base-media-generation-manifest-v001', 'generation-manifest', '4',
      ),
      validationReceipt: jsonArtifactBinding(
        'presentation-output-base-media-validation-receipt-v001', 'validation-receipt', '5',
      ),
    },
    styleInput: {
      format: vertical ? 'vertical-short-1080x1920' : 'normal-landscape',
      screenLayoutId: vertical ? 'speaker_only' : null,
      presetBinding: {
        trustedRegistryBindings: trusted,
        presetRegistry: preset,
        presetValidationIndex: index,
        materialValidationIndex: materials,
        rendererTrust: renderer,
        presetId: vertical
          ? 'vertical-short-speaker-only-readable-pop-v001'
          : 'normal-landscape-readable-pop-v001',
      },
      captionLayoutPolicy: {
        maxLogicalWidthPerLine: vertical ? 14 : 36,
        maxLinesPerDisplayPage: 2,
        characterWidthRule: 'U+0000..U+00FF=1; other Unicode code point=2',
        pageBreakPolicy: 'split-at-source-atom-boundary-or-reject',
      },
      cropPolicy: vertical
        ? {mode: 'bound-decision', scope: 'all-segments', application: cropApplicationBinding}
        : {mode: 'identity'},
      sceneTransitionPolicy: {mode: 'straight-cut-only'},
      audioPolicy: {mode: 'preserve-source-only'},
      materials: [],
    },
    publication: {
      outputId: `${requestId}-output`,
      controlRoot: `evals/clip_composition/outputs/presentation/meaning-output-control/${requestId}`,
      renderOutputRoot:
        `evals/clip_composition/outputs/presentation/meaning-output-renders/${requestId}-output`,
    },
  };
};

const outputFormalJob = request => ({
  schemaVersion: 'presentation-output-formal-job-v001',
  jobId: `${request.requestId}-formal-output`,
  requestBinding: {
    schemaVersion: request.schemaVersion,
    path: `evals/clip_composition/outputs/presentation/meaning-output-jobs/`
      + `${request.requestId}/output-request.json`,
    fileSha256: SHA_A,
    canonicalSha256: SHA_B,
  },
  runtimeProfile: Object.fromEntries(
    ['node', 'tsx', 'remotion', 'browser', 'ffmpeg', 'ffprobe', 'imageMagick']
      .map(role => [role, {path: `/fixtures/${role}`, version: 'fixture-v001', fileSha256: SHA_A}]),
  ),
  implementationBindings: PRESENTATION_OUTPUT_FORMAL_IMPLEMENTATION_ROLES_V001
    .map(({path: implementationPath, role}) => ({
      path: implementationPath, fileSha256: SHA_A, role,
    })),
  approvedContractBindings: structuredClone(PRESENTATION_OUTPUT_APPROVED_CONTRACT_BINDINGS_V001),
  controlOutputRoot: request.publication.controlRoot,
  renderOutputRoot: request.publication.renderOutputRoot,
  expectedOutputId: request.publication.outputId,
  executionPolicy: {oneShot: true, allowRetry: false, allowLegacyArtifacts: false},
});

const targetBaseArtifacts = () => ({
  generationManifest: {
    schemaVersion: 'presentation-output-base-media-generation-manifest-v001',
    manifestId: 'synthetic-base-generation-v001',
    jobBinding: jsonArtifactBinding(
      'presentation-output-base-media-build-job-v001', 'base-job', '1',
    ),
    meaningPackageBinding: jsonArtifactBinding(
      'zev-meaning-information-package-v001', 'meaning-package', '2',
    ),
    sourceMediaBindings: [mediaArtifactBinding('source', '3')],
    baseMedia: mediaArtifactBinding('base-media', '4'),
    timeline: jsonArtifactBinding('presentation-base-media-timeline-v002', 'timeline', '5'),
    semanticProjection: {
      sourceMediaCount: 1, segmentCount: 1,
      sourceMediaBindingsCanonicalSha256: SHA_A,
      timelineCompositionCanonicalSha256: SHA_B,
    },
    mediaBuildProjection: {
      frameCount: 96, sampleCount: 153600, audioPacketPayloadSha256: SHA_C,
    },
  },
  receipt: {
    schemaVersion: 'presentation-output-base-media-validation-receipt-v001',
    receiptId: 'synthetic-base-receipt-v001',
    status: 'passed',
    jobBinding: jsonArtifactBinding(
      'presentation-output-base-media-build-job-v001', 'base-job', '1',
    ),
    manifestBinding: jsonArtifactBinding(
      'presentation-output-base-media-generation-manifest-v001', 'base-manifest', '2',
    ),
    checks: {
      meaningBinding: 'passed', timelineMapping: 'passed', videoFrameCount: 'passed',
      audioSampleGrid: 'passed', publicationHashGraph: 'passed',
    },
    mediaProjection: {
      frameCount: 96, sampleCount: 153600, audioPacketPayloadSha256: SHA_A,
      baseMediaFileSha256: SHA_B, timelineFileSha256: SHA_C,
    },
  },
});

test('schema、10工程、11違反codeの固定順を公開する', () => {
  assert.equal(
    PRESENTATION_MEANING_OUTPUT_STAGE_ADMISSION_JOB_SCHEMA_V002,
    'presentation-meaning-output-stage-admission-job-v002',
  );
  assert.equal(
    PRESENTATION_MEANING_OUTPUT_STAGE_ADMISSION_RECEIPT_SCHEMA_V002,
    'presentation-meaning-output-stage-admission-receipt-v002',
  );
  assert.equal(PRESENTATION_MEANING_OUTPUT_RUN_INPUT_STAGES_V001.length, 10);
  assert.deepEqual(
    PRESENTATION_MEANING_OUTPUT_RUN_INPUT_STAGES_V001.map(item => item.ordinal),
    ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10'],
  );
  assert.deepEqual(PRESENTATION_MEANING_OUTPUT_RUN_INPUT_VIOLATION_CODES_V001, [
    'RUN_INPUT_PUBLICATION_JOB_INVALID',
    'RUN_INPUT_RECORD_INVALID',
    'RUN_INPUT_REFERENCE_MISMATCH',
    'RUN_INPUT_PUBLICATION_TARGET_INVALID',
    'STAGE_ADMISSION_JOB_INVALID',
    'STAGE_ADMISSION_RECORD_BINDING_MISMATCH',
    'STAGE_ADMISSION_TARGET_JOB_BINDING_MISMATCH',
    'STAGE_ADMISSION_UPSTREAM_BINDING_MISMATCH',
    'STAGE_ADMISSION_PROJECTION_MISMATCH',
    'RUN_INPUT_PUBLICATION_FAILED',
    'STAGE_ADMISSION_PUBLICATION_FAILED',
  ]);
  assert.ok(Object.isFrozen(PRESENTATION_MEANING_OUTPUT_RUN_INPUT_STAGES_V001));
  assert.ok(Object.isFrozen(PRESENTATION_MEANING_OUTPUT_RUN_INPUT_VIOLATION_CODES_V001));
});

test('実行入力記録は業務入力5件をexact順で受理する', () => {
  const value = record();
  assert.equal(validatePresentationMeaningOutputRunInputRecordV001(value), true);
  assert.deepEqual(Object.keys(value), [
    'schemaVersion', 'recordId', 'sourceAndInterval', 'horizontalStyle',
    'verticalStyle', 'spendingLimit', 'title',
  ]);
});

test('業務入力5件は各一差を拒否する', () => {
  const cases = [
    value => { value.sourceAndInterval.sourceEndMs = value.sourceAndInterval.sourceStartMs; },
    value => { value.horizontalStyle.format = 'vertical-short-1080x1920'; },
    value => { value.verticalStyle.screenLayoutId = 'unknown-layout'; },
    value => { value.spendingLimit.currency = 'JPY'; },
    value => { value.title.text = 'unexpected'; },
  ];
  for (const mutate of cases) {
    const value = record();
    mutate(value);
    assert.equal(validatePresentationMeaningOutputRunInputRecordV001(value), false);
  }
});

test('区間の1ms差はschema上有効であり、工程投影が不一致として所有する', () => {
  const value = record();
  value.sourceAndInterval.sourceEndMs += 1;
  assert.equal(validatePresentationMeaningOutputRunInputRecordV001(value), true);
});

test('記録は未知key、欠落key、key順違いを拒否する', () => {
  const unknown = record();
  unknown.extra = true;
  assert.equal(validatePresentationMeaningOutputRunInputRecordV001(unknown), false);
  const missing = record();
  delete missing.title;
  assert.equal(validatePresentationMeaningOutputRunInputRecordV001(missing), false);
  const reordered = record();
  const title = reordered.title;
  delete reordered.title;
  reordered.title = title;
  const horizontal = reordered.horizontalStyle;
  delete reordered.horizontalStyle;
  reordered.horizontalStyle = horizontal;
  assert.equal(validatePresentationMeaningOutputRunInputRecordV001(reordered), false);
});

test('正式byteは2-space、末尾LF一つで決定的である', () => {
  const value = record();
  const first = serializePresentationMeaningOutputRunInputFormalJsonV001(value);
  const second = serializePresentationMeaningOutputRunInputFormalJsonV001(clone(value));
  assert.ok(first.equals(second));
  assert.equal(first.at(-1), 0x0a);
  assert.notEqual(first.at(-2), 0x0a);
  assert.match(first.toString('utf8'), /\n  "recordId"/u);
  assert.equal(
    canonicalSha256PresentationMeaningOutputRunInputJsonV001(value),
    canonicalSha256PresentationMeaningOutputRunInputJsonV001(clone(value)),
  );
});

test('記録公開jobはexact 7 keyと固定公開先だけを受理する', () => {
  const value = publicationJob();
  assert.equal(validatePresentationMeaningOutputRunInputPublicationJobV001(value), true);
  const wrongRoot = clone(value);
  wrongRoot.outputRoot += '-other';
  assert.equal(validatePresentationMeaningOutputRunInputPublicationJobV001(wrongRoot), false);
  const fallback = clone(value);
  fallback.executionPolicy.allowOverwrite = true;
  assert.equal(validatePresentationMeaningOutputRunInputPublicationJobV001(fallback), false);

  const invalidRecord = publicationJob();
  invalidRecord.record.title.text = 'unexpected';
  assert.equal(
    validatePresentationMeaningOutputRunInputPublicationJobEnvelopeV001(invalidRecord),
    true,
  );
  assert.equal(validatePresentationMeaningOutputRunInputPublicationJobV001(invalidRecord), false);
});

test('工程入場jobは10工程それぞれのupstream role順を固定する', () => {
  for (const definition of PRESENTATION_MEANING_OUTPUT_RUN_INPUT_STAGES_V001) {
    const value = admissionJob(definition);
    assert.equal(
      validatePresentationMeaningOutputStageAdmissionJobV001(value),
      true,
      definition.stage,
    );
    if (value.upstreamBindings.length > 0) {
      const wrong = clone(value);
      wrong.upstreamBindings[0].role = 'wrong-role';
      assert.equal(validatePresentationMeaningOutputStageAdmissionJobV001(wrong), false);
    }
  }
  const sparse = admissionJob(PRESENTATION_MEANING_OUTPUT_RUN_INPUT_STAGES_V001[1]);
  sparse.upstreamBindings = Array(1);
  assert.equal(validatePresentationMeaningOutputStageAdmissionJobV001(sparse), false);
});

test('工程入場v002 jobはv1の10 keyにattemptだけを加えた別入口である', () => {
  for (const definition of PRESENTATION_MEANING_OUTPUT_RUN_INPUT_STAGES_V001) {
    const value = admissionJobV002(definition);
    assert.deepEqual(Object.keys(value), [
      'schemaVersion', 'jobId', 'action', 'stage', 'runInputRecordBinding',
      'targetJobBinding', 'upstreamBindings', 'outputRoot',
      'implementationBindings', 'executionPolicy', 'attempt',
    ]);
    assert.deepEqual(value.attempt, {attemptOrdinal: 1, supersedesReceipt: null});
    assert.equal(validatePresentationMeaningOutputStageAdmissionJobV002(value), true);
    assert.equal(validatePresentationMeaningOutputStageAdmissionJobV001(value), false);
    assert.equal(
      value.outputRoot,
      `${ROOT}/${record().recordId}/admissions-v002/`
        + `${definition.ordinal}-${definition.stage}/attempt-0001`,
    );
    assert.equal(
      validatePresentationMeaningOutputStageAdmissionJobV002(admissionJob(definition)),
      false,
    );
  }
});

test('工程入場v002 attempt 2以降は同record・同工程の直前receiptだけを束縛する', () => {
  const definition = PRESENTATION_MEANING_OUTPUT_RUN_INPUT_STAGES_V001[1];
  const previous = v2ReceiptBinding(definition, 1);
  const value = admissionJobV002(definition, 2, previous);
  assert.equal(validatePresentationMeaningOutputStageAdmissionJobV002(value), true);

  const cases = [
    job => { job.attempt.attemptOrdinal = 0; },
    job => { job.attempt.supersedesReceipt = null; },
    job => { job.attempt.supersedesReceipt.schemaVersion
      = PRESENTATION_MEANING_OUTPUT_STAGE_ADMISSION_RECEIPT_SCHEMA_V001; },
    job => { job.attempt.supersedesReceipt.path
      = v2ReceiptPath(PRESENTATION_MEANING_OUTPUT_RUN_INPUT_STAGES_V001[0], 1); },
    job => { job.attempt.supersedesReceipt.path
      = v2ReceiptPath(definition, 1, 'different-record-v001'); },
    job => { job.attempt.supersedesReceipt.path = v2ReceiptPath(definition, 2); },
    job => { job.outputRoot += '-other'; },
    job => { job.attempt = {
      supersedesReceipt: job.attempt.supersedesReceipt,
      attemptOrdinal: job.attempt.attemptOrdinal,
    }; },
    job => { job.attempt.extra = true; },
  ];
  for (const mutate of cases) {
    const invalid = clone(value);
    mutate(invalid);
    assert.equal(validatePresentationMeaningOutputStageAdmissionJobV002(invalid), false);
  }

  const firstWithPrevious = admissionJobV002(definition, 1, previous);
  assert.equal(validatePresentationMeaningOutputStageAdmissionJobV002(firstWithPrevious), false);
});

const stripRole = value => ({
  schemaVersion: value.schemaVersion,
  path: value.path,
  fileSha256: value.fileSha256,
  canonicalSha256: value.canonicalSha256,
});

const semanticProjectionCase = stageDefinition => {
  const runInput = record();
  const job = admissionJob(stageDefinition);
  const source = sourcePackage();
  const sourceBinding = upstreamBinding('source-package', source, '1');
  const b5 = b5Manifest(stripRole(sourceBinding));
  const b5Binding = upstreamBinding('b5-manifest', b5, '2');
  const b6 = b6Manifest(stripRole(b5Binding));
  const b6Binding = upstreamBinding('b6-manifest', b6, '3');
  const provider = providerEnvelope();
  const providerBinding = upstreamBinding('provider-envelope', provider, '4');
  const semantic = semanticArtifacts(
    stripRole(sourceBinding), stripRole(b6Binding), stripRole(providerBinding),
  );
  const decision = timelineDecision();
  const meaning = meaningPackage();
  const cropApplication = {schemaVersion: 'presentation-output-crop-application-v001'};
  const base = targetBaseArtifacts();
  const targetTimeline = {schemaVersion: 'presentation-base-media-timeline-v002'};
  const reviewedTimeline = {schemaVersion: 'presentation-base-media-timeline-v001'};
  let targetJob;
  let values = [];
  let referenceArtifacts = {};

  if (stageDefinition.stage === 'timeline-decision') {
    targetJob = {sourceMedia: decision.sourceMedia, segments: decision.segments};
    const assemblyDecision = {
      schemaVersion: 'presentation-base-media-assembly-decision-v001',
      decisionId: 'synthetic-assembly-decision-v001',
      payload: {
        basisEditPlan: {kind: 'edit_plan_json', path: 'fixtures/edit-plan.json', fileSha256: SHA_A},
        sourceArtifact: {
          sourceProvenance: 'synthetic-source-v001',
          sourceRef: runInput.sourceAndInterval.sourceRef,
          sourceUri: 'https://www.youtube.com/watch?v=AbCdEfGhI_1',
          fileSha256: SHA_B,
        },
        segments: [{
          sourceStartMs: runInput.sourceAndInterval.sourceStartMs,
          sourceEndMs: runInput.sourceAndInterval.sourceEndMs,
        }],
        unresolvedEdits: [],
      },
      approval: {
        status: 'approved', approverType: 'human', recordId: 'synthetic-human-record-v001',
        recordedAt: '2026-08-03T00:00:00Z', targetPayloadSha256: SHA_C,
      },
    };
    assemblyDecision.approval.targetPayloadSha256 =
      canonicalSha256PresentationMeaningOutputRunInputJsonV001(assemblyDecision.payload);
    referenceArtifacts = {
      assemblyDecision,
      assemblyDecisionBinding: runInput.sourceAndInterval.assemblyDecision,
    };
  } else if (stageDefinition.stage === 'b3-source-package') {
    const decisionBinding = upstreamBinding('timeline-decision', decision, '5');
    values = [{role: 'timeline-decision', binding: decisionBinding, value: decision}];
    targetJob = {timelineCompositionDecisionBinding: stripRole(decisionBinding)};
  } else if (stageDefinition.stage === 'b5-token-measurement') {
    values = [{role: 'source-package', binding: sourceBinding, value: source}];
    targetJob = fullMeaningBoundaryB5Job(
      stripRole(sourceBinding),
      runInput.spendingLimit,
    );
  } else if (stageDefinition.stage === 'b6-generation') {
    values = [{role: 'b5-manifest', binding: b5Binding, value: b5}];
    targetJob = fullMeaningBoundaryB6Job(
      stripRole(b5Binding),
      structuredClone(b5.generateRequestBinding),
      runInput.spendingLimit,
    );
  } else if (stageDefinition.stage === 'b1-validation') {
    values = [
      {role: 'source-package', binding: sourceBinding, value: source},
      {role: 'b6-manifest', binding: b6Binding, value: b6},
      {role: 'provider-envelope', binding: providerBinding, value: provider},
    ];
    targetJob = {
      sourcePackageBinding: stripRole(sourceBinding),
      b6ManifestBinding: stripRole(b6Binding),
      providerEnvelopeBinding: stripRole(providerBinding),
    };
    referenceArtifacts = {b5Manifest: b5, b5ManifestBinding: stripRole(b5Binding)};
  } else if (stageDefinition.stage === 'meaning-package') {
    const decisionBinding = upstreamBinding('timeline-decision', decision, '5');
    const selectionBinding = upstreamBinding('semantic-selection', semantic.selection, '6');
    semantic.report.selectionBinding = stripRole(selectionBinding);
    const reportBinding = upstreamBinding('semantic-validation', semantic.report, '7');
    values = [
      {role: 'timeline-decision', binding: decisionBinding, value: decision},
      {role: 'semantic-validation', binding: reportBinding, value: semantic.report},
      {role: 'semantic-selection', binding: selectionBinding, value: semantic.selection},
    ];
    targetJob = {
      timelineCompositionDecisionBinding: stripRole(decisionBinding),
      semanticSelectionValidationBinding: stripRole(reportBinding),
      semanticSelectionBinding: stripRole(selectionBinding),
      title: structuredClone(runInput.title),
    };
  } else if (stageDefinition.stage === 'base-media') {
    const meaningBinding = upstreamBinding('meaning-package', meaning, '8');
    values = [{role: 'meaning-package', binding: meaningBinding, value: meaning}];
    targetJob = {meaningPackageBinding: stripRole(meaningBinding)};
  } else if (stageDefinition.stage === 'output-landscape') {
    const meaningBinding = upstreamBinding('meaning-package', meaning, '8');
    const baseBinding = upstreamBinding('base-media', Buffer.from('base'), '9');
    const request = outputRequest();
    request.meaningInformationPackage = stripRole(meaningBinding);
    request.baseMediaInput.baseMedia = {
      path: baseBinding.path, fileSha256: baseBinding.fileSha256,
    };
    const requestBinding = upstreamBinding('output-request', request, 'a');
    requestBinding.path = `evals/clip_composition/outputs/presentation/meaning-output-jobs/`
      + `${request.requestId}/output-request.json`;
    targetJob = outputFormalJob(request);
    targetJob.requestBinding = stripRole(requestBinding);
    values = [
      {role: 'output-request', binding: requestBinding, value: request},
      {role: 'meaning-package', binding: meaningBinding, value: meaning},
      {role: 'base-media', binding: baseBinding, value: Buffer.from('base')},
    ];
  } else if (stageDefinition.stage === 'crop-application') {
    const reviewedDecision = {
      schemaVersion: 'vertical-preset-type-crop-decision-v006',
      selectedPlan: {screenLayoutId: runInput.verticalStyle.screenLayoutId},
    };
    const roles = [
      ['reviewed-crop-decision', reviewedDecision, runInput.verticalStyle.cropDecision],
      ['reviewed-crop-selection', {
        schemaVersion: 'vertical-preset-type-crop-selection-package-v006',
      }, runInput.verticalStyle.selectionPackageManifest],
      ['reviewed-base-media', Buffer.from('reviewed'), null],
      ['reviewed-timeline', reviewedTimeline, null],
      ['reviewed-generation-manifest', {schemaVersion: 'reviewed-generation-v001'}, null],
      ['reviewed-validation-report', {schemaVersion: 'reviewed-validation-v001'}, null],
      ['target-base-media', Buffer.from('target'), null],
      ['target-timeline', targetTimeline, null],
      ['target-generation-manifest', base.generationManifest, null],
      ['target-validation-receipt', base.receipt, null],
    ];
    values = roles.map(([role, value, fixed]) => {
      const generated = upstreamBinding(role, value, role.length % 9 + 1 + '');
      const bound = fixed === null ? generated : {role, ...fixed};
      return {role, binding: bound, value};
    });
    const byRole = new Map(values.map(item => [item.role, item.binding]));
    const media = role => ({path: byRole.get(role).path, fileSha256: byRole.get(role).fileSha256});
    const json = role => stripRole(byRole.get(role));
    targetJob = {
      runInputRecordBinding: job.runInputRecordBinding,
      reviewedCrop: {
        decision: json('reviewed-crop-decision'),
        selectionPackageManifest: json('reviewed-crop-selection'),
        reviewedBaseMedia: {
          baseMedia: media('reviewed-base-media'),
          timeline: json('reviewed-timeline'),
          generationManifest: json('reviewed-generation-manifest'),
          validationReport: json('reviewed-validation-report'),
        },
      },
      targetBaseMedia: {
        baseMedia: media('target-base-media'),
        timeline: json('target-timeline'),
        generationManifest: json('target-generation-manifest'),
        validationReceipt: json('target-validation-receipt'),
      },
    };
    referenceArtifacts = {cropDecision: reviewedDecision};
  } else {
    const meaningBinding = upstreamBinding('meaning-package', meaning, '8');
    const baseBinding = upstreamBinding('base-media', Buffer.from('base'), '9');
    const cropBinding = upstreamBinding('crop-application', cropApplication, 'a');
    const request = outputRequest({vertical: true, cropApplicationBinding: stripRole(cropBinding)});
    request.meaningInformationPackage = stripRole(meaningBinding);
    request.baseMediaInput.baseMedia = {
      path: baseBinding.path, fileSha256: baseBinding.fileSha256,
    };
    const requestBinding = upstreamBinding('output-request', request, 'b');
    requestBinding.path = `evals/clip_composition/outputs/presentation/meaning-output-jobs/`
      + `${request.requestId}/output-request.json`;
    targetJob = outputFormalJob(request);
    targetJob.requestBinding = stripRole(requestBinding);
    values = [
      {role: 'output-request', binding: requestBinding, value: request},
      {role: 'meaning-package', binding: meaningBinding, value: meaning},
      {role: 'base-media', binding: baseBinding, value: Buffer.from('base')},
      {role: 'crop-application', binding: cropBinding, value: cropApplication},
    ];
  }
  job.upstreamBindings = values.map(item => item.binding);
  return {runInput, job, targetJob, values, referenceArtifacts};
};

const stageUsesRealTargetValidatorInProjectionFixture = stage => [
  'b5-token-measurement',
  'b6-generation',
  'output-landscape',
  'output-vertical',
].includes(stage);
const targetValidatorOverrideForProjectionFixture = stage => (
  stageUsesRealTargetValidatorInProjectionFixture(stage)
    ? {}
    : {targetJobValidator: () => true}
);

test('10工程は固定入力・job・上流成果物の意味投影をそれぞれ通す', () => {
  for (const definition of PRESENTATION_MEANING_OUTPUT_RUN_INPUT_STAGES_V001) {
    const fixture = semanticProjectionCase(definition);
    const result = derivePresentationMeaningOutputStageProjectionV001({
      record: fixture.runInput,
      admissionJob: fixture.job,
      targetJob: fixture.targetJob,
      upstreamArtifacts: fixture.values,
      referenceArtifacts: fixture.referenceArtifacts,
      ...targetValidatorOverrideForProjectionFixture(definition.stage),
    });
    assert.equal(result.status, 'passed', definition.stage);
    assert.equal(result.projection.stage, definition.stage);
    assert.ok(result.projection.comparedPaths.length > 0);
  }
});

test('基礎映像工程は非空captionのschema envelopeと区間を分けて検査する', () => {
  const definition = PRESENTATION_MEANING_OUTPUT_RUN_INPUT_STAGES_V001.find(
    item => item.stage === 'base-media',
  );
  const fixture = semanticProjectionCase(definition);
  const derive = overrides => derivePresentationMeaningOutputStageProjectionV001({
    record: fixture.runInput,
    admissionJob: fixture.job,
    targetJob: fixture.targetJob,
    upstreamArtifacts: fixture.values,
    referenceArtifacts: fixture.referenceArtifacts,
    targetJobValidator: () => true,
    ...overrides,
  });

  assert.equal(fixture.values[0].value.captions.length, 1);
  assert.equal(derive({}).status, 'passed');

  const wrongSchemaArtifacts = clone(fixture.values);
  wrongSchemaArtifacts[0].value.schemaVersion = 'zev-meaning-information-package-v999';
  assert.deepEqual(
    derive({upstreamArtifacts: wrongSchemaArtifacts}),
    {
      status: 'rejected',
      violations: [{
        code: 'STAGE_ADMISSION_PROJECTION_MISMATCH',
        path: '/stageInputs',
        relatedIds: [],
      }],
    },
  );

  const wrongIntervalArtifacts = clone(fixture.values);
  wrongIntervalArtifacts[0].value.timelineComposition.segments[0].sourceEndMs += 1;
  assert.deepEqual(
    derive({upstreamArtifacts: wrongIntervalArtifacts}),
    {
      status: 'rejected',
      violations: [{
        code: 'STAGE_ADMISSION_PROJECTION_MISMATCH',
        path: '/stageProjection',
        relatedIds: [],
      }],
    },
  );
});

test('10工程のreceiptはbuilder実体を通り一つのrecord SHAへだけ接続する', () => {
  const receipts = PRESENTATION_MEANING_OUTPUT_RUN_INPUT_STAGES_V001.map(definition => {
    const fixture = semanticProjectionCase(definition);
    const receipt = buildPresentationMeaningOutputStageAdmissionReceiptV001({
      record: fixture.runInput,
      admissionJob: fixture.job,
      targetJob: fixture.targetJob,
      upstreamArtifacts: fixture.values,
      referenceArtifacts: fixture.referenceArtifacts,
      ...targetValidatorOverrideForProjectionFixture(definition.stage),
    });
    assert.equal(validatePresentationMeaningOutputStageAdmissionReceiptV001(receipt), true);
    return receipt;
  });
  assert.equal(validatePresentationMeaningOutputStageAdmissionReceiptSetV001(receipts), true);

  const otherRecord = structuredClone(receipts);
  otherRecord[7].runInputRecordBinding.fileSha256 = SHA_C;
  assert.equal(validatePresentationMeaningOutputStageAdmissionReceiptSetV001(otherRecord), false);

  const wrongOrder = structuredClone(receipts);
  [wrongOrder[0], wrongOrder[1]] = [wrongOrder[1], wrongOrder[0]];
  assert.equal(validatePresentationMeaningOutputStageAdmissionReceiptSetV001(wrongOrder), false);
});

test('工程入場v002 receiptはexact 9 keyでattemptを保存し固定10工程を同recordへ閉じる', () => {
  const receipts = PRESENTATION_MEANING_OUTPUT_RUN_INPUT_STAGES_V001.map(definition => {
    const fixture = semanticProjectionCase(definition);
    fixture.job = asAdmissionJobV002(fixture.job);
    const projection = derivePresentationMeaningOutputStageProjectionV002({
      record: fixture.runInput,
      admissionJob: fixture.job,
      targetJob: fixture.targetJob,
      upstreamArtifacts: fixture.values,
      referenceArtifacts: fixture.referenceArtifacts,
      ...targetValidatorOverrideForProjectionFixture(definition.stage),
    });
    assert.equal(projection.status, 'passed', definition.stage);
    const receipt = buildPresentationMeaningOutputStageAdmissionReceiptV002({
      record: fixture.runInput,
      admissionJob: fixture.job,
      targetJob: fixture.targetJob,
      upstreamArtifacts: fixture.values,
      referenceArtifacts: fixture.referenceArtifacts,
      targetJobValidator: () => true,
    });
    assert.deepEqual(Object.keys(receipt), [
      'schemaVersion', 'receiptId', 'status', 'stage', 'runInputRecordBinding',
      'jobBinding', 'upstreamBindings', 'checks', 'attempt',
    ]);
    assert.equal(
      receipt.receiptId,
      `${record().recordId}-${definition.ordinal}-${definition.stage}-admission`,
    );
    assert.deepEqual(receipt.attempt, {attemptOrdinal: 1, supersedesReceipt: null});
    assert.equal(validatePresentationMeaningOutputStageAdmissionReceiptV002(receipt), true);
    assert.equal(validatePresentationMeaningOutputStageAdmissionReceiptV001(receipt), false);
    return receipt;
  });
  assert.equal(validatePresentationMeaningOutputStageAdmissionReceiptSetV002(receipts), true);
  assert.equal(validatePresentationMeaningOutputStageAdmissionReceiptSetV001(receipts), false);

  const otherRecord = clone(receipts);
  otherRecord[7].runInputRecordBinding.path = `${ROOT}/different-record-v001/run-input-record.json`;
  otherRecord[7].receiptId = 'different-record-v001-08-output-landscape-admission';
  assert.equal(validatePresentationMeaningOutputStageAdmissionReceiptV002(otherRecord[7]), true);
  assert.equal(validatePresentationMeaningOutputStageAdmissionReceiptSetV002(otherRecord), false);

  const wrongOrder = clone(receipts);
  [wrongOrder[0], wrongOrder[1]] = [wrongOrder[1], wrongOrder[0]];
  assert.equal(validatePresentationMeaningOutputStageAdmissionReceiptSetV002(wrongOrder), false);
});

test('B5とB6の工程入場は実validatorのsame-job返値を受理し不正jobを拒否する', () => {
  for (const stage of ['b5-token-measurement', 'b6-generation']) {
    const definition = PRESENTATION_MEANING_OUTPUT_RUN_INPUT_STAGES_V001.find(
      item => item.stage === stage,
    );
    const fixture = semanticProjectionCase(definition);
    fixture.job = asAdmissionJobV002(fixture.job);
    const passed = derivePresentationMeaningOutputStageProjectionV002({
      record: fixture.runInput,
      admissionJob: fixture.job,
      targetJob: fixture.targetJob,
      upstreamArtifacts: fixture.values,
      referenceArtifacts: fixture.referenceArtifacts,
    });
    assert.equal(passed.status, 'passed', stage);

    const invalidTarget = clone(fixture.targetJob);
    if (stage === 'b5-token-measurement') invalidTarget.action = 'generate-once';
    else invalidTarget.executionPolicy.allowRetry = true;
    const rejected = derivePresentationMeaningOutputStageProjectionV002({
      record: fixture.runInput,
      admissionJob: fixture.job,
      targetJob: invalidTarget,
      upstreamArtifacts: fixture.values,
      referenceArtifacts: fixture.referenceArtifacts,
    });
    assert.deepEqual(rejected, {
      status: 'rejected',
      violations: [{
        code: 'STAGE_ADMISSION_PROJECTION_MISMATCH',
        path: '/targetJob',
        relatedIds: [],
      }],
    });
  }
});

test('任意objectを返す身代わりvalidatorは従来どおり工程入場で不合格となる', () => {
  const definition = PRESENTATION_MEANING_OUTPUT_RUN_INPUT_STAGES_V001[0];
  const fixture = semanticProjectionCase(definition);
  fixture.job = asAdmissionJobV002(fixture.job);
  const result = derivePresentationMeaningOutputStageProjectionV002({
    record: fixture.runInput,
    admissionJob: fixture.job,
    targetJob: fixture.targetJob,
    upstreamArtifacts: fixture.values,
    referenceArtifacts: fixture.referenceArtifacts,
    targetJobValidator: value => value,
  });
  assert.equal(result.status, 'rejected');
  assert.equal(result.violations[0].path, '/targetJob');
});

test('工程入場v002 receiptのattempt番号・ID・直前bindingは一致しなければならない', () => {
  const definition = PRESENTATION_MEANING_OUTPUT_RUN_INPUT_STAGES_V001[0];
  const fixture = semanticProjectionCase(definition);
  fixture.job = asAdmissionJobV002(
    fixture.job,
    2,
    v2ReceiptBinding(definition, 1),
  );
  const receipt = buildPresentationMeaningOutputStageAdmissionReceiptV002({
    record: fixture.runInput,
    admissionJob: fixture.job,
    targetJob: fixture.targetJob,
    upstreamArtifacts: fixture.values,
    referenceArtifacts: fixture.referenceArtifacts,
    targetJobValidator: () => true,
  });
  assert.equal(validatePresentationMeaningOutputStageAdmissionReceiptV002(receipt), true);
  assert.equal(receipt.attempt.attemptOrdinal, 2);
  assert.equal(receipt.attempt.supersedesReceipt.path, v2ReceiptPath(definition, 1));

  const wrongId = clone(receipt);
  wrongId.receiptId = wrongId.receiptId.replace('timeline-decision', 'b3-source-package');
  assert.equal(validatePresentationMeaningOutputStageAdmissionReceiptV002(wrongId), false);
  const wrongPrevious = clone(receipt);
  wrongPrevious.attempt.supersedesReceipt.path = v2ReceiptPath(definition, 2);
  assert.equal(validatePresentationMeaningOutputStageAdmissionReceiptV002(wrongPrevious), false);
});

test('schema上有効な1ms区間差はtimeline工程の意味投影で拒否する', () => {
  const definition = PRESENTATION_MEANING_OUTPUT_RUN_INPUT_STAGES_V001[0];
  const fixture = semanticProjectionCase(definition);
  fixture.runInput.sourceAndInterval.sourceEndMs += 1;
  assert.equal(validatePresentationMeaningOutputRunInputRecordV001(fixture.runInput), true);
  const result = derivePresentationMeaningOutputStageProjectionV001({
    record: fixture.runInput,
    admissionJob: fixture.job,
    targetJob: fixture.targetJob,
    upstreamArtifacts: fixture.values,
    referenceArtifacts: fixture.referenceArtifacts,
    targetJobValidator: () => true,
  });
  assert.equal(result.status, 'rejected');
  assert.equal(result.violations[0].code, 'STAGE_ADMISSION_PROJECTION_MISMATCH');
});

test('B6工程はB5で固定した生成requestと異なる送信requestを拒否する', () => {
  const definition = PRESENTATION_MEANING_OUTPUT_RUN_INPUT_STAGES_V001.find(
    item => item.stage === 'b6-generation',
  );
  const fixture = semanticProjectionCase(definition);
  fixture.targetJob.generateRequestBinding.fileSha256 = SHA_C;
  const result = derivePresentationMeaningOutputStageProjectionV001({
    record: fixture.runInput,
    admissionJob: fixture.job,
    targetJob: fixture.targetJob,
    upstreamArtifacts: fixture.values,
    referenceArtifacts: fixture.referenceArtifacts,
    targetJobValidator: () => true,
  });
  assert.equal(result.status, 'rejected');
  assert.equal(result.violations[0].code, 'STAGE_ADMISSION_PROJECTION_MISMATCH');
});

test('工程入場receiptはexact 8 key、固定5検査、工程role順を受理する', () => {
  const definition = PRESENTATION_MEANING_OUTPUT_RUN_INPUT_STAGES_V001[1];
  const job = admissionJob(definition);
  const receipt = {
    schemaVersion: PRESENTATION_MEANING_OUTPUT_STAGE_ADMISSION_RECEIPT_SCHEMA_V001,
    receiptId: `${record().recordId}-${definition.ordinal}-${definition.stage}-admission`,
    status: 'passed',
    stage: definition.stage,
    runInputRecordBinding: job.runInputRecordBinding,
    jobBinding: job.targetJobBinding,
    upstreamBindings: job.upstreamBindings,
    checks: [
      {name: 'recordBinding', status: 'passed', comparedPaths: ['record:/recordId']},
      {name: 'targetJobBinding', status: 'passed', comparedPaths: ['job:/targetJobBinding']},
      {
        name: 'upstreamBindings', status: 'passed',
        comparedPaths: ['upstream:timeline-decision:'],
      },
      {
        name: 'stageProjection', status: 'passed',
        comparedPaths: ['record:/sourceAndInterval', 'job:/timelineCompositionDecisionBinding'],
      },
      {
        name: 'prePublicationReread', status: 'passed',
        comparedPaths: ['job:/upstreamBindings'],
      },
    ],
  };
  assert.equal(validatePresentationMeaningOutputStageAdmissionReceiptV001(receipt), true);
  const wrong = clone(receipt);
  wrong.checks[3].comparedPaths[0] = 'unknown:/sourceAndInterval';
  assert.equal(validatePresentationMeaningOutputStageAdmissionReceiptV001(wrong), false);
});

test('CLIはjob path一引数以外をfatal exit 2として扱う', async () => {
  const {runPresentationMeaningOutputRunInputCliV001} = await import(
    './run_presentation_meaning_output_run_input_record_v001.mjs'
  );
  assert.equal(await runPresentationMeaningOutputRunInputCliV001([]), 2);
  assert.equal(await runPresentationMeaningOutputRunInputCliV001(['a', 'b']), 2);
});

test('不正なjob byteは修復せず検査済み拒否として版付き保存する', async () => {
  const {runPresentationMeaningOutputRunInputJobV001} = await import(
    './run_presentation_meaning_output_run_input_record_v001.mjs'
  );
  const workspaceRoot = await mkdtemp(path.join(os.tmpdir(), 'meaning-run-input-v001-'));
  const relative = 'jobs/invalid.json';
  await mkdir(path.join(workspaceRoot, 'jobs'), {recursive: true});
  await writeFile(path.join(workspaceRoot, relative), Buffer.from('{"broken":true}\n', 'utf8'));
  const result = await runPresentationMeaningOutputRunInputJobV001({
    workspaceRoot,
    jobPath: relative,
    executedAt: '2026-08-03T00:00:00Z',
  });
  assert.equal(result.exitCode, 1);
  assert.equal(result.report.violations[0].code, 'RUN_INPUT_PUBLICATION_JOB_INVALID');
  assert.equal(result.report.status, 'rejected');
  assert.ok(SHA256.test(result.report.jobFileObservation.fileSha256));
});

test('job外形が正しくrecord本文だけが不正なら専用違反へ帰属する', async () => {
  const {runPresentationMeaningOutputRunInputJobV001} = await import(
    './run_presentation_meaning_output_run_input_record_v001.mjs'
  );
  const workspaceRoot = await mkdtemp(path.join(os.tmpdir(), 'meaning-run-input-record-bad-v001-'));
  const relative = 'jobs/record-invalid.json';
  const job = publicationJob();
  job.record.title.text = 'unexpected';
  await mkdir(path.join(workspaceRoot, 'jobs'), {recursive: true});
  await writeFile(
    path.join(workspaceRoot, relative),
    serializePresentationMeaningOutputRunInputFormalJsonV001(job),
    {flag: 'wx'},
  );
  const result = await runPresentationMeaningOutputRunInputJobV001({
    workspaceRoot,
    jobPath: relative,
    executedAt: '2026-08-03T00:00:00Z',
  });
  assert.equal(result.exitCode, 1);
  assert.equal(result.report.violations[0].code, 'RUN_INPUT_RECORD_INVALID');
});

test('正式publication runnerは参照3件を照合してrecord byteを一回だけ公開する', async () => {
  const {runPresentationMeaningOutputRunInputJobV001} = await import(
    './run_presentation_meaning_output_run_input_record_v001.mjs'
  );
  const repositoryRoot = process.cwd();
  const workspaceRoot = await mkdtemp(path.join(os.tmpdir(), 'meaning-run-input-passed-v001-'));
  const actual = async relativePath => {
    const bytes = await readFile(path.join(repositoryRoot, relativePath));
    return {bytes, value: JSON.parse(bytes.toString('utf8'))};
  };
  const assemblyPath = 'evals/clip_composition/outputs/presentation/'
    + 'source-assembly-formalizations/qdczJpv8RCc-candidate-59-v001/assembly-decision.json';
  const cropRoot = 'evals/clip_composition/outputs/presentation/vertical-preset-previews/'
    + 'qdczJpv8RCc-candidate-59-vertical-preset-v001-candidate/type-crop-v006';
  const [assembly, cropDecision, cropSelection] = await Promise.all([
    actual(assemblyPath),
    actual(`${cropRoot}/crop-decision-v006.json`),
    actual(`${cropRoot}/selection-package-manifest-v006.json`),
  ]);
  const copyArtifact = async (relativePath, artifact) => {
    await mkdir(path.join(workspaceRoot, path.dirname(relativePath)), {recursive: true});
    await writeFile(path.join(workspaceRoot, relativePath), artifact.bytes, {flag: 'wx'});
    return {
      schemaVersion: artifact.value.schemaVersion,
      path: relativePath,
      fileSha256: sha256(artifact.bytes),
      canonicalSha256: canonicalSha256PresentationOutputFiniteJsonV001(
        artifact.value,
      ),
    };
  };
  const [assemblyBinding, cropDecisionBinding, cropSelectionBinding] = await Promise.all([
    copyArtifact('fixtures/assembly-decision.json', assembly),
    copyArtifact('fixtures/crop-decision.json', cropDecision),
    copyArtifact('fixtures/crop-selection.json', cropSelection),
  ]);
  const coreBytes = Buffer.from('run-input-record test core\n', 'utf8');
  const runnerBytes = Buffer.from('run-input-record test runner\n', 'utf8');
  await Promise.all([
    mkdir(path.join(workspaceRoot, path.dirname(CORE)), {recursive: true}),
    mkdir(path.join(workspaceRoot, path.dirname(RUNNER)), {recursive: true}),
  ]);
  await Promise.all([
    writeFile(path.join(workspaceRoot, CORE), coreBytes, {flag: 'wx'}),
    writeFile(path.join(workspaceRoot, RUNNER), runnerBytes, {flag: 'wx'}),
  ]);
  const value = record();
  value.recordId = `candidate-59-publication-test-${process.pid}`;
  value.sourceAndInterval = {
    sourceRef: 'youtube:qdczJpv8RCc',
    candidateId: 59,
    assemblyDecision: assemblyBinding,
    sourceStartMs: 5941162,
    sourceEndMs: 5992736,
  };
  value.verticalStyle.cropDecision = cropDecisionBinding;
  value.verticalStyle.selectionPackageManifest = cropSelectionBinding;
  const job = publicationJob();
  job.jobId = `${value.recordId}-publication-job`;
  job.record = value;
  job.outputRoot = `${ROOT}/${value.recordId}`;
  job.implementationBindings = [
    {path: CORE, fileSha256: sha256(coreBytes), role: 'run-input-record'},
    {path: RUNNER, fileSha256: sha256(runnerBytes), role: 'run-input-record-runner'},
  ];
  const jobPath = 'jobs/publication.json';
  const jobBytes = serializePresentationMeaningOutputRunInputFormalJsonV001(job);
  await mkdir(path.join(workspaceRoot, 'jobs'), {recursive: true});
  await writeFile(path.join(workspaceRoot, jobPath), jobBytes, {flag: 'wx'});

  const result = await runPresentationMeaningOutputRunInputJobV001({
    workspaceRoot,
    jobPath,
    executedAt: '2026-08-03T00:00:00Z',
  });
  assert.equal(result.status, 'passed');
  assert.equal(result.exitCode, 0);
  assert.deepEqual(result.artifact, value);
  assert.deepEqual(result.bytes, serializePresentationMeaningOutputRunInputFormalJsonV001(value));
  assert.deepEqual(
    await readFile(path.join(workspaceRoot, result.outputPath)),
    result.bytes,
  );
});

const SHA256 = /^[0-9a-f]{64}$/u;
