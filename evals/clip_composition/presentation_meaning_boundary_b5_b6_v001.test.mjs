import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdir, mkdtemp, readdir, rm, writeFile} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import {
  PRESENTATION_CAPTION_API_OFFICIAL_SOURCE_SPECS_V001,
  derivePresentationApiPostSendCostProjectionV001,
  derivePresentationApiPreSendCostV001,
  derivePresentationCaptionPostSendCostV001,
  derivePresentationCaptionPreSendCostV001,
  presentationCaptionApiBytesContainSecretV001,
} from './presentation_caption_api_cost_guard_v001.mjs';
import {
  canonicalizePresentationCaptionB1JsonV001,
  serializePresentationCaptionB1FormalJsonV001,
} from './presentation_caption_semantic_source_package_v001.mjs';
import {
  PRESENTATION_MEANING_BOUNDARY_TASK_DESCRIPTION_V001,
  validatePresentationMeaningBoundarySourcePackageV001,
} from './presentation_meaning_boundary_source_package_v001.mjs';
import {
  executePresentationCaptionGateB6TransportV002,
  executePresentationCaptionGateB6ObservationTransportV001,
  inspectPresentationCaptionGateB6ProviderResponseV001,
} from './run_presentation_caption_gate_b6_v001.mjs';
import {
  PRESENTATION_MEANING_BOUNDARY_API_OWNED_VIOLATION_CODES_V001,
  PRESENTATION_MEANING_BOUNDARY_VIOLATION_CODES_V001,
  buildPresentationMeaningBoundaryB5RequestSetV001,
  buildPresentationMeaningBoundaryB6AttemptProjectionV001,
  buildPresentationMeaningBoundaryGenerateRequestV001,
  buildPresentationMeaningBoundaryProviderEnvelopeV001,
  derivePresentationMeaningBoundaryB6OutcomeV001,
  derivePresentationMeaningBoundaryB6PublicationProjectionV001,
  inspectPresentationMeaningBoundaryB5ArtifactPathsV001,
  inspectPresentationMeaningBoundaryB6ArtifactPathsV001,
  inspectPresentationMeaningBoundaryDecisionLineV001,
  inspectPresentationMeaningBoundaryOfficialSnapshotCopyV001,
  inspectPresentationMeaningBoundaryOfficialSnapshotPathV001,
  inspectPresentationMeaningBoundaryPublicationLayoutV001,
  inspectPresentationMeaningBoundaryPreSendCostV001,
  inspectPresentationMeaningBoundarySecretAbsenceV001,
  normalizePresentationMeaningBoundaryTransportObservationV001,
  performPresentationMeaningBoundaryCountTokensV001,
  projectPresentationMeaningBoundaryProviderRejectionV001,
  projectPresentationMeaningBoundaryTransportFailureV001,
  projectPresentationMeaningBoundaryB5AuthorizationLineV001,
  projectPresentationMeaningBoundaryB6AuthorizationLineV001,
  selectPresentationMeaningBoundaryJobActionV001,
  validatePresentationMeaningBoundaryB5JobV001,
  validatePresentationMeaningBoundaryB5ManifestV001,
  validatePresentationMeaningBoundaryB6JobV001,
  validatePresentationMeaningBoundaryB6ArtifactGraphV001,
  validatePresentationMeaningBoundaryB6ManifestV001,
  validatePresentationMeaningBoundaryProviderEnvelopeV001,
} from './run_presentation_meaning_boundary_b5_b6_v001.mjs';
const H = character => character.repeat(64);
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const formalBytes = value => {
  const result = serializePresentationCaptionB1FormalJsonV001(value);
  assert.equal(result.status, 'serialized');
  return result.bytes;
};
const canonicalSha256 = value => {
  const result = canonicalizePresentationCaptionB1JsonV001(value);
  assert.equal(result.status, 'canonicalized');
  return sha256(result.bytes);
};
const jsonBinding = (schemaVersion, bindingPath, value) => ({
  schemaVersion,
  path: bindingPath,
  fileSha256: sha256(formalBytes(value)),
  canonicalSha256: canonicalSha256(value),
});
const dummyJsonBinding = (schemaVersion, bindingPath, character) => ({
  schemaVersion,
  path: bindingPath,
  fileSha256: H(character),
  canonicalSha256: H(character === 'f' ? 'e' : 'f'),
});
const mediaBinding = (bindingPath, character) => ({
  path: bindingPath,
  fileSha256: H(character),
});
const clone = value => structuredClone(value);

const CONTRACT_BINDINGS = Object.freeze([
  Object.freeze({
    path: 'evals/clip_composition/reports/presentation/presentation-meaning-information-package-contract-design-20260803-v001.md',
    fileSha256: H('a'),
    role: 'meaning-package-contract',
  }),
  Object.freeze({
    path: 'evals/clip_composition/reports/presentation/presentation-output-side-acceptance-contract-design-20260803-v001.md',
    fileSha256: H('b'),
    role: 'output-side-contract',
  }),
]);
const B5_IMPLEMENTATION_BINDINGS = Object.freeze([
  Object.freeze({
    path: 'evals/clip_composition/presentation_meaning_boundary_source_package_v001.mjs',
    fileSha256: H('1'),
    role: 'meaning-source-package',
  }),
  Object.freeze({
    path: 'evals/clip_composition/run_presentation_meaning_boundary_b5_b6_v001.mjs',
    fileSha256: H('2'),
    role: 'meaning-boundary-api-runner',
  }),
  Object.freeze({
    path: 'evals/clip_composition/presentation_caption_semantic_source_package_v001.mjs',
    fileSha256: H('3'),
    role: 'strict-json-codec',
  }),
  Object.freeze({
    path: 'evals/clip_composition/presentation_caption_api_cost_guard_v001.mjs',
    fileSha256: H('4'),
    role: 'api-cost-policy',
  }),
]);
const B6_IMPLEMENTATION_BINDINGS = Object.freeze([
  Object.freeze({
    path: 'evals/clip_composition/run_presentation_meaning_boundary_b5_b6_v001.mjs',
    fileSha256: H('2'),
    role: 'meaning-boundary-api-runner',
  }),
  Object.freeze({
    path: 'evals/clip_composition/run_presentation_caption_gate_b6_v001.mjs',
    fileSha256: H('5'),
    role: 'api-transport',
  }),
  Object.freeze({
    path: 'evals/clip_composition/presentation_caption_api_cost_guard_v001.mjs',
    fileSha256: H('4'),
    role: 'api-cost-policy',
  }),
  Object.freeze({
    path: 'evals/clip_composition/presentation_caption_semantic_source_package_v001.mjs',
    fileSha256: H('3'),
    role: 'strict-json-codec',
  }),
]);

const makeSourcePackage = () => {
  const sourceMediaId = 'source-media-000001';
  const timelineSegmentId = 'segment-000001';
  const strictBinding = B5_IMPLEMENTATION_BINDINGS[2];
  const implementationBindings = [
    {
      path: 'evals/clip_composition/presentation_meaning_boundary_source_package_v001.mjs',
      fileSha256: H('1'),
      role: 'meaning-source-package',
    },
    {
      path: 'evals/clip_composition/presentation_segmenter_boundary_evidence_v001.mjs',
      fileSha256: H('2'),
      role: 'gate-a-core',
    },
    {
      path: 'evals/clip_composition/run_presentation_segmenter_boundary_preflight_v001.mjs',
      fileSha256: H('3'),
      role: 'gate-a-preflight',
    },
    {...strictBinding, role: 'strict-json'},
  ];
  const atomRefs = ['atom-001', 'atom-002', 'atom-003'].map(atomId => ({
    timelineSegmentId,
    sourceMediaId,
    atomId,
  }));
  const boundaryCandidates = atomRefs.map((atomRef, index) => ({
    boundaryCandidateId: `segmenter-boundary-${String(index + 1).padStart(6, '0')}`,
    ordinal: index + 1,
    atomRefs: [atomRef],
    text: ['甲', '乙', '丙'][index],
    startAnchor: {atomRef, edge: 'start'},
    endAnchor: {atomRef, edge: 'end'},
    sourceStartMs: 100 + index * 100,
    sourceEndMs: 180 + index * 100,
    isWordLike: true,
  }));
  const value = {
    schemaVersion: 'presentation-meaning-boundary-source-package-v001',
    packageId: 'meaning-boundary-api-fixture-v001',
    timelineCompositionDecisionBinding: dummyJsonBinding(
      'zev-timeline-composition-decision-v001',
      'fixtures/meaning-boundary/timeline.json',
      'c',
    ),
    runtimeBinding: {
      segmenterSources: [{
        sourceMediaId,
        preflightReportBinding: dummyJsonBinding(
          'presentation-segmenter-boundary-preflight-report-v001',
          'fixtures/meaning-boundary/preflight.json',
          'd',
        ),
        evidenceBinding: dummyJsonBinding(
          'presentation-segmenter-boundary-evidence-v001',
          'fixtures/meaning-boundary/evidence.json',
          'e',
        ),
        runtimeProjection: {
          nodeBinarySha256: H('9'),
          nodeVersion: 'v20.19.6',
          icuVersion: '75.1',
          resolvedLocale: 'ja',
          resolvedGranularity: 'word',
        },
      }],
      strictJsonImplementationBinding: implementationBindings[3],
    },
    containers: [{
      containerId: 'segmenter-container-000001',
      ordinal: 1,
      sourceMediaId,
      timelineSegmentId,
      boundaryCandidates,
    }],
    candidateOccurrenceMap: boundaryCandidates.map((candidate, index) => ({
      boundaryCandidateId: candidate.boundaryCandidateId,
      timelineSegmentId,
      sourceMediaId,
      sourceGateAContainerId: 'segmenter-container-000001',
      sourceGateABoundaryCandidateId:
        `segmenter-boundary-${String(index + 1).padStart(6, '0')}`,
      atomRefs: candidate.atomRefs,
    })),
    taskDescription: PRESENTATION_MEANING_BOUNDARY_TASK_DESCRIPTION_V001,
    provenance: {
      sourcePackageJobBinding: dummyJsonBinding(
        'presentation-meaning-boundary-source-package-job-v001',
        'fixtures/meaning-boundary/source-package-job.json',
        'f',
      ),
      timelineCompositionDecisionBinding: null,
      implementationBindings,
    },
  };
  value.provenance.timelineCompositionDecisionBinding =
    value.timelineCompositionDecisionBinding;
  assert.equal(validatePresentationMeaningBoundarySourcePackageV001(value), true);
  return value;
};

const OFFICIAL_SOURCES = Object.freeze([
  ['pricing', 'https://ai.google.dev/gemini-api/docs/pricing'],
  ['tokens-guide', 'https://ai.google.dev/gemini-api/docs/tokens'],
  ['count-tokens-api', 'https://ai.google.dev/api/tokens'],
  ['billing', 'https://ai.google.dev/gemini-api/docs/billing'],
  ['thinking', 'https://ai.google.dev/gemini-api/docs/generate-content/thinking'],
  ['latest-model', 'https://ai.google.dev/gemini-api/docs/latest-model'],
]);
const makeOfficialSnapshot = ({jobId = null} = {}) => {
  const sources = OFFICIAL_SOURCES.map(([sourceId, url], index) => ({
    sourceId,
    url,
    observedAt: '2026-08-03T00:00:00.000Z',
    snapshotPath: jobId === null
      ? `fixtures/meaning-boundary/official/${sourceId}.html`
      : `evals/clip_composition/inputs/presentation/`
        + `gemini-api-official-snapshots/${jobId}/`
        + PRESENTATION_CAPTION_API_OFFICIAL_SOURCE_SPECS_V001[index].basename,
    snapshotFileSha256: String(index + 1).repeat(64),
    snapshotByteLength: index + 1,
  }));
  const sourceById = new Map(sources.map(source => [source.sourceId, source]));
  const evidence = sourceId => {
    const source = sourceById.get(sourceId);
    return [{
      sourceId,
      utf8ByteOffset: 0,
      utf8ByteLength: source.snapshotByteLength,
      excerptSha256: source.snapshotFileSha256,
      locatorLabel: `whole-snapshot:${sourceId}`,
    }];
  };
  const claimSpecs = [
    ['model-exists', 'verified', 'latest-model'],
    ['input-limit', 'verified', 'latest-model'],
    ['output-limit', 'verified', 'latest-model'],
    ['standard-input-price', 'verified', 'pricing'],
    ['standard-output-price', 'verified', 'pricing'],
    ['service-tier-omission-standard', 'verified', 'pricing'],
    ['count-tokens-unbilled', 'unverified', null],
    ['count-tokens-upper-bounds-prompt-billing', 'contradicted', 'tokens-guide'],
    ['max-output-upper-bounds-candidate-plus-thinking', 'unverified', null],
  ];
  return {
    modelId: 'gemini-3.6-flash',
    modelResource: 'models/gemini-3.6-flash',
    observedAt: '2026-08-03T00:00:00.000Z',
    inputLimit: 1_048_576,
    outputLimit: 65_536,
    tier: 'PAID_STANDARD_DEFAULT_BY_OMISSION',
    inputPriceNanoUsdPerToken: 1_500,
    outputPriceNanoUsdPerToken: 7_500,
    sources,
    claims: claimSpecs.map(([claimId, verdict, sourceId]) => ({
      claimId,
      verdict,
      evidence: sourceId === null ? [] : evidence(sourceId),
    })),
  };
};

const deriveFixturePreSendCost = () => {
  const projection = derivePresentationApiPreSendCostV001({
    probeInputTokens: 1_000,
    finalInputTokens: 1_010,
    policy: {
      modelOutputTokenLimit: 65_536,
      inputPriceNanoUsdPerToken: 1_500,
      outputPriceNanoUsdPerToken: 7_500,
      maximumNanoUsd: 500_000_000,
    },
  });
  if (projection.status !== 'passed') {
    throw new Error('fixture pre-send cost must be derivable by the production policy');
  }
  return projection;
};

const makeJobs = sourcePackage => {
  const sourceBinding = jsonBinding(
    sourcePackage.schemaVersion,
    'fixtures/meaning-boundary/source-package.json',
    sourcePackage,
  );
  const officialVerification = makeOfficialSnapshot({
    jobId: 'meaning-boundary-b5-fixture-v001',
  });
  const b5Job = {
    schemaVersion: 'presentation-meaning-boundary-b5-job-v001',
    jobId: 'meaning-boundary-b5-fixture-v001',
    attemptId: 'attempt-v001',
    action: 'measure-only',
    sourcePackageBinding: sourceBinding,
    outputRoot:
      'evals/clip_composition/outputs/presentation/meaning-boundary-b5-attempts/'
      + 'meaning-boundary-b5-fixture-v001/attempt-v001',
    executionConfiguration: {
      product: 'Gemini Developer API',
      apiVersion: 'v1beta',
      endpointClass: 'synchronous',
      configuredModelId: 'gemini-3.6-flash',
      modelResource: 'models/gemini-3.6-flash',
      thinkingLevel: 'medium',
      responseMimeType: 'application/json',
      modelOutputTokenLimit: 65_536,
      serviceTierPolicy: 'omit-field-use-paid-standard-default',
      clientTimeoutMilliseconds: 600_000,
      automaticRetries: 0,
    },
    officialVerification,
    spendingAuthorization: {
      currency: 'USD',
      maximumNanoUsd: 500_000_000,
      inputPriceNanoUsdPerToken: 1_500,
      outputPriceNanoUsdPerToken: 7_500,
      status: 'approved-for-measurement',
    },
    implementationBindings: B5_IMPLEMENTATION_BINDINGS,
    approvedContractBindings: CONTRACT_BINDINGS,
  };
  const generateRequestBinding = mediaBinding(
    `${b5Job.outputRoot}/generate-content-request.json`,
    '6',
  );
  const preSendCost = deriveFixturePreSendCost();
  const b6Job = {
    schemaVersion: 'presentation-meaning-boundary-b6-job-v001',
    jobId: 'meaning-boundary-b6-fixture-v001',
    attemptId: 'attempt-v001',
    action: 'generate-once',
    b5ManifestBinding: dummyJsonBinding(
      'presentation-meaning-boundary-b5-manifest-v001',
      `${b5Job.outputRoot}/b5-manifest.json`,
      '7',
    ),
    generateRequestBinding,
    outputRoot:
      'evals/clip_composition/outputs/presentation/meaning-boundary-b6-attempts/'
      + 'meaning-boundary-b6-fixture-v001/attempt-v001',
    executionPolicy: {
      oneShot: true,
      allowRetry: false,
      timeoutMilliseconds: 600_000,
      rawResponseMustPrecedeParsing: true,
      allowRepair: false,
    },
    sendAuthorization: {
      decisionLineBinding: null,
      status: 'approved-for-single-send',
      currency: 'USD',
      maximumNanoUsd: 500_000_000,
      inputPriceNanoUsdPerToken: 1_500,
      outputPriceNanoUsdPerToken: 7_500,
      finalInputTokens: 1_010,
      maxOutputTokens: preSendCost.derivedMaxOutputTokens,
      preSendEstimateNanoUsd: preSendCost.preSendEstimateNanoUsd,
    },
    implementationBindings: B6_IMPLEMENTATION_BINDINGS,
    approvedContractBindings: CONTRACT_BINDINGS,
  };
  const authorizationLine = projectPresentationMeaningBoundaryB6AuthorizationLineV001(
    b6Job,
  );
  b6Job.sendAuthorization.decisionLineBinding = {
    path: 'DECISIONS.md',
    lineText: authorizationLine,
    lineSha256: sha256(Buffer.from(authorizationLine, 'utf8')),
  };
  return {b5Job, b6Job, sourceBinding, officialVerification};
};

const makeB5Manifest = ({sourceBinding, officialVerification}) => {
  const preSendCost = deriveFixturePreSendCost();
  const b5JobBinding = dummyJsonBinding(
    'presentation-meaning-boundary-b5-job-v001',
    'fixtures/meaning-boundary/b5-job.json',
    'a',
  );
  const decisionLine = 'B5_MEANING_BOUNDARY_MEASUREMENT_AUTHORIZATION_V001';
  const manifest = {
    schemaVersion: 'presentation-meaning-boundary-b5-manifest-v001',
    manifestId:
      `presentation-meaning-boundary-b5-manifest-${b5JobBinding.fileSha256.slice(0, 32)}`,
    status: 'passed',
    b5JobBinding,
    sourcePackageBinding: sourceBinding,
    generateRequestBinding: mediaBinding('fixtures/meaning-boundary/request.json', '1'),
    tokenCountBindings: {
      probeRequest: mediaBinding('fixtures/meaning-boundary/probe-request.json', '2'),
      probeResponse: mediaBinding('fixtures/meaning-boundary/probe-response.json', '3'),
      finalRequest: mediaBinding('fixtures/meaning-boundary/final-request.json', '4'),
      finalResponse: mediaBinding('fixtures/meaning-boundary/final-response.json', '5'),
      maximumResponseStructure:
        mediaBinding('fixtures/meaning-boundary/maximum-response.json', '6'),
    },
    officialSnapshot: officialVerification,
    tokenProjection: {
      probeInputTokenCount: 1_000,
      finalInputTokenCount: 1_010,
      modelOutputTokenLimit: 65_536,
      derivedMaxOutputTokens: preSendCost.derivedMaxOutputTokens,
      maximumValidResponseCanonicalByteLength: 256,
    },
    costProjection: {
      currency: 'USD',
      maximumNanoUsd: 500_000_000,
      preSendEstimateNanoUsd: preSendCost.preSendEstimateNanoUsd,
      verdict: 'within-approved-limit',
      residualRiskDecisionLineBinding: {
        path: 'DECISIONS.md',
        lineText: decisionLine,
        lineSha256: sha256(Buffer.from(decisionLine, 'utf8')),
      },
    },
    checks: {
      sourceBinding: 'passed',
      visibleInput: 'passed',
      requestByte: 'passed',
      responseSchema: 'passed',
      officialSnapshot: 'passed',
      probeTokenCount: 'passed',
      finalTokenCount: 'passed',
      maximumResponseDiagnosis: 'passed',
      costLimit: 'passed',
      secretAbsence: 'passed',
      artifactHashGraph: 'passed',
    },
  };
  assert.equal(validatePresentationMeaningBoundaryB5ManifestV001(manifest).status, 'passed');
  return manifest;
};

const makeBoundB5Manifest = b5Job => {
  const manifest = makeB5Manifest({
    sourceBinding: b5Job.sourcePackageBinding,
    officialVerification: b5Job.officialVerification,
  });
  manifest.b5JobBinding = jsonBinding(
    b5Job.schemaVersion,
    `evals/clip_composition/outputs/presentation/meaning-boundary-b5-jobs/`
      + `${b5Job.jobId}.json`,
    b5Job,
  );
  manifest.manifestId = `presentation-meaning-boundary-b5-manifest-`
    + manifest.b5JobBinding.fileSha256.slice(0, 32);
  manifest.generateRequestBinding = mediaBinding(
    `${b5Job.outputRoot}/generate-content-request.json`,
    '1',
  );
  const tokenFileByKey = {
    probeRequest: 'probe-count-tokens-request.json',
    probeResponse: 'probe-count-tokens-response.raw.json',
    finalRequest: 'final-count-tokens-request.json',
    finalResponse: 'final-count-tokens-response.raw.json',
    maximumResponseStructure: 'maximum-response-structure.json',
  };
  for (const [key, basename] of Object.entries(tokenFileByKey)) {
    manifest.tokenCountBindings[key].path = `${b5Job.outputRoot}/${basename}`;
  }
  manifest.officialSnapshot = {
    ...b5Job.officialVerification,
    sources: b5Job.officialVerification.sources.map((source, index) => ({
      ...source,
      snapshotPath: `${b5Job.outputRoot}/official/`
        + PRESENTATION_CAPTION_API_OFFICIAL_SOURCE_SPECS_V001[index].basename,
    })),
  };
  const riskLine = projectPresentationMeaningBoundaryB5AuthorizationLineV001(b5Job);
  manifest.costProjection.residualRiskDecisionLineBinding = {
    path: 'DECISIONS.md',
    lineText: riskLine,
    lineSha256: sha256(Buffer.from(riskLine, 'utf8')),
  };
  assert.equal(validatePresentationMeaningBoundaryB5ManifestV001(manifest).status, 'passed');
  return manifest;
};

const assertCodeAt = (index, code) => {
  assert.equal(PRESENTATION_MEANING_BOUNDARY_VIOLATION_CODES_V001[index], code);
};
const observedApiViolationCodes = new Set();

const providerBytes = ({
  modelVersion = 'gemini-3.6-flash',
  usageMetadata,
  candidates = [{
    content: {role: 'model', parts: [{text: '{"status":"abstained"}\n'}]},
  }],
} = {}) =>
  formalBytes({
    candidates,
    modelVersion,
    usageMetadata: usageMetadata ?? {
      promptTokenCount: 10,
      candidatesTokenCount: 2,
      thoughtsTokenCount: 1,
      totalTokenCount: 13,
    },
  });

const inspectProviderBytes = rawBytes =>
  inspectPresentationCaptionGateB6ProviderResponseV001({
    rawBytes,
    httpStatus: 200,
    contentType: 'application/json; charset=UTF-8',
    expectedModelId: 'gemini-3.6-flash',
  });

const makeProductionAttemptProjection = ({
  rawBytes = providerBytes(),
  httpStatus = 200,
  contentType = 'application/json; charset=UTF-8',
} = {}) => {
  const sourcePackage = makeSourcePackage();
  const {b5Job, b6Job} = makeJobs(sourcePackage);
  const b5Manifest = makeBoundB5Manifest(b5Job);
  b6Job.b5ManifestBinding = jsonBinding(
    b5Manifest.schemaVersion,
    `${b5Job.outputRoot}/b5-manifest.json`,
    b5Manifest,
  );
  b6Job.generateRequestBinding = b5Manifest.generateRequestBinding;
  const authorizationLine = projectPresentationMeaningBoundaryB6AuthorizationLineV001(
    b6Job,
  );
  b6Job.sendAuthorization.decisionLineBinding = {
    path: 'DECISIONS.md',
    lineText: authorizationLine,
    lineSha256: sha256(Buffer.from(authorizationLine, 'utf8')),
  };
  const b6JobBinding = jsonBinding(
    b6Job.schemaVersion,
    `evals/clip_composition/outputs/presentation/meaning-boundary-b6-jobs/`
      + `${b6Job.jobId}.json`,
    b6Job,
  );
  const observation = inspectPresentationCaptionGateB6ProviderResponseV001({
    rawBytes,
    httpStatus,
    contentType,
    expectedModelId: 'gemini-3.6-flash',
  });
  const cost = observation.checks.model === 'passed'
    && observation.checks.usage === 'passed'
    ? derivePresentationApiPostSendCostProjectionV001({
      usageMetadata: observation.usageMetadata,
      finalInputTokens: b6Job.sendAuthorization.finalInputTokens,
      derivedMaxOutputTokens: b6Job.sendAuthorization.maxOutputTokens,
      preSendEstimateNanoUsd: b6Job.sendAuthorization.preSendEstimateNanoUsd,
      policy: {
        modelOutputTokenLimit: b5Manifest.tokenProjection.modelOutputTokenLimit,
        inputPriceNanoUsdPerToken:
          b6Job.sendAuthorization.inputPriceNanoUsdPerToken,
        outputPriceNanoUsdPerToken:
          b6Job.sendAuthorization.outputPriceNanoUsdPerToken,
        maximumNanoUsd: b6Job.sendAuthorization.maximumNanoUsd,
      },
    })
    : null;
  const rawResponseBinding = mediaBinding(
    `${b6Job.outputRoot}/generate-content-response.raw.json`,
    '8',
  );
  const attempt = buildPresentationMeaningBoundaryB6AttemptProjectionV001({
    b6JobBinding,
    b6Job,
    observation,
    cost,
    rawResponseBinding,
    transportEndpoint:
      'https://generativelanguage.googleapis.com/v1beta/'
        + 'models/gemini-3.6-flash:generateContent',
  });
  return {sourcePackage, b5Job, b5Manifest, b6Job, observation, cost, ...attempt};
};

const observeGenerateTransport = async ({
  requestBytes = Buffer.from('{"request":"exact"}\n', 'utf8'),
  rawBytes = providerBytes(),
} = {}) => {
  const events = [];
  let fetchOptions = null;
  let timeoutMilliseconds = null;
  const result = await executePresentationCaptionGateB6ObservationTransportV001({
    requestBytes,
    apiKey: 'fixture-secret',
    fetchImplementation: async (_endpoint, options) => {
      events.push('fetch');
      fetchOptions = options;
      return {
        status: 200,
        headers: {
          get: name => name === 'content-type'
            ? 'application/json; charset=UTF-8' : null,
        },
        arrayBuffer: async () => {
          events.push('response-read');
          return rawBytes;
        },
      };
    },
    timeoutSignalFactory: (milliseconds) => {
      timeoutMilliseconds = milliseconds;
      return Object.freeze({fixtureSignal: true});
    },
    rawResponseWriter: async (bytes) => {
      events.push('raw-write');
      assert.equal(bytes.equals(rawBytes), true);
    },
    expectedModelId: 'gemini-3.6-flash',
  });
  events.push('returned');
  return {events, fetchOptions, requestBytes, result, timeoutMilliseconds};
};

const executeV002AdapterFixture = async ({
  rawBytes,
  httpStatus = 200,
  contentType = 'application/json; charset=UTF-8',
}) => executePresentationCaptionGateB6TransportV002({
  requestBytes: Buffer.from('{"request":"exact"}\n', 'utf8'),
  apiKey: 'fixture-secret',
  fetchImplementation: async () => ({
    status: httpStatus,
    headers: {get: name => name === 'content-type' ? contentType : null},
    arrayBuffer: async () => rawBytes,
  }),
  timeoutSignalFactory: () => Object.freeze({fixtureSignal: true}),
  rawResponseWriter: async bytes => {
    assert.equal(bytes.equals(rawBytes), true);
  },
});

const observeCountTokensTransport = async () => {
  const requestBytes = Buffer.from('{"count":"exact"}\n', 'utf8');
  const responseBytes = Buffer.from(
    '{"totalTokens":13,"promptTokensDetails":[{"modality":"TEXT","tokenCount":13}]}\n',
    'utf8',
  );
  let fetchOptions = null;
  let timeoutMilliseconds = null;
  const events = [];
  const result = await performPresentationMeaningBoundaryCountTokensV001({
    requestBytes,
    responseAbsolutePath: '/unused/fixture-response.json',
    apiKey: 'fixture-secret',
    fetchImplementation: async (_endpoint, options) => {
      events.push('fetch');
      fetchOptions = options;
      return {
        status: 200,
        headers: {
          get: name => name === 'content-type'
            ? 'application/json; charset=UTF-8' : null,
        },
        arrayBuffer: async () => {
          events.push('response-read');
          return responseBytes;
        },
      };
    },
    timeoutSignalFactory: (milliseconds) => {
      timeoutMilliseconds = milliseconds;
      return Object.freeze({fixtureSignal: true});
    },
    rawResponseWriter: async (bytes) => {
      events.push('raw-write');
      assert.equal(bytes.equals(responseBytes), true);
    },
    endpoint: 'https://example.invalid/countTokens',
    timeoutMilliseconds: 600_000,
  });
  events.push('returned');
  return {events, fetchOptions, requestBytes, result, timeoutMilliseconds};
};

test('MBA001 probe countTokens request exact happy path', () => {
  const sourceBytes = formalBytes(makeSourcePackage());
  const built = buildPresentationMeaningBoundaryB5RequestSetV001({
    sourcePackageBytes: sourceBytes,
    modelOutputTokenLimit: 65_536,
  });
  assert.deepEqual(Object.keys(built.countTokensRequest), ['generateContentRequest']);
  assert.equal(built.countTokensRequest.generateContentRequest.model,
    'models/gemini-3.6-flash');
  assert.equal(
    built.countTokensRequest.generateContentRequest.generationConfig.maxOutputTokens,
    65_536,
  );
});

test('MBA002 final countTokens request uses budget-derived output limit', () => {
  const sourceBytes = formalBytes(makeSourcePackage());
  const built = buildPresentationMeaningBoundaryB5RequestSetV001({
    sourcePackageBytes: sourceBytes,
    modelOutputTokenLimit: 65_536,
    derivedMaxOutputTokens: 12_345,
  });
  assert.equal(built.generateRequest.generationConfig.maxOutputTokens, 12_345);
  assert.equal(
    built.countTokensRequest.generateContentRequest.generationConfig.maxOutputTokens,
    12_345,
  );
});

test('MBA003 request invalid owns code 8', () => {
  let observedError = null;
  assert.throws(
    () => buildPresentationMeaningBoundaryGenerateRequestV001({
      sourcePackageBytes: Buffer.from('{}\n'),
      maxOutputTokens: 0,
    }),
    error => {
      observedError = error;
      return error.code === 'MEANING_BOUNDARY_REQUEST_INVALID';
    },
  );
  assertCodeAt(7, 'MEANING_BOUNDARY_REQUEST_INVALID');
  observedApiViolationCodes.add(observedError.code);
});

test('MBA004 model mismatch owns code 16', () => {
  assertCodeAt(15, 'MEANING_BOUNDARY_MODEL_MISMATCH');
  const observation = inspectProviderBytes(providerBytes({modelVersion: 'gemini-other'}));
  assert.equal(observation.status, 'rejected');
  assert.equal(observation.primaryRejectionCode, 'B6_V002_RESPONSE_MODEL_INVALID');
  const projected = projectPresentationMeaningBoundaryProviderRejectionV001(
    observation.primaryRejectionCode,
  );
  assert.deepEqual(projected, {
    status: 'rejected', code: 'MEANING_BOUNDARY_MODEL_MISMATCH',
  });
  observedApiViolationCodes.add(projected.code);
});

test('MBA005 usage invalid owns code 17', () => {
  assertCodeAt(16, 'MEANING_BOUNDARY_USAGE_INVALID');
  const observation = inspectProviderBytes(providerBytes({
    usageMetadata: {
      promptTokenCount: 10,
      candidatesTokenCount: 2,
      thoughtsTokenCount: 1,
      totalTokenCount: 99,
    },
  }));
  assert.equal(observation.status, 'rejected');
  assert.equal(observation.primaryRejectionCode, 'B6_V002_USAGE_INVALID');
  const projected = projectPresentationMeaningBoundaryProviderRejectionV001(
    observation.primaryRejectionCode,
  );
  assert.deepEqual(projected, {
    status: 'rejected', code: 'MEANING_BOUNDARY_USAGE_INVALID',
  });
  observedApiViolationCodes.add(projected.code);
});

test('MBA006 cost limit exceeded owns code 18', () => {
  assertCodeAt(17, 'MEANING_BOUNDARY_COST_LIMIT_EXCEEDED');
  const cost = derivePresentationApiPostSendCostProjectionV001({
    usageMetadata: {
      promptTokenCount: 100,
      candidatesTokenCount: 100,
      thoughtsTokenCount: 0,
      totalTokenCount: 200,
    },
    finalInputTokens: 100,
    derivedMaxOutputTokens: 100,
    preSendEstimateNanoUsd: 1,
    policy: {
      modelOutputTokenLimit: 100,
      inputPriceNanoUsdPerToken: 1_500,
      outputPriceNanoUsdPerToken: 7_500,
      maximumNanoUsd: 1,
    },
  });
  assert.equal(cost.status, 'rejected');
  assert.equal(cost.code, 'API_USAGE_BUDGET_VIOLATION');
  const projected = inspectPresentationMeaningBoundaryPreSendCostV001(cost);
  assert.deepEqual(projected, {
    status: 'rejected', code: 'MEANING_BOUNDARY_COST_LIMIT_EXCEEDED',
  });
  observedApiViolationCodes.add(projected.code);
});

test('MBA007 raw response unavailable owns code 19', async () => {
  assertCodeAt(18, 'MEANING_BOUNDARY_RAW_RESPONSE_UNAVAILABLE');
  let fetchCalls = 0;
  let observedError = null;
  await assert.rejects(
    executePresentationCaptionGateB6ObservationTransportV001({
      requestBytes: Buffer.from('{}\n', 'utf8'),
      apiKey: 'mba007-secret',
      fetchImplementation: async () => {
        fetchCalls += 1;
        throw new Error('fixture transport failure');
      },
      timeoutSignalFactory: () => null,
      rawResponseWriter: async () => {},
      expectedModelId: 'gemini-3.6-flash',
    }),
    error => {
      observedError = error;
      return error.reason === 'GENERATE_CONTENT_REQUEST_FAILED';
    },
  );
  assert.equal(fetchCalls, 1);
  const projected = projectPresentationMeaningBoundaryTransportFailureV001({
    upstreamCode: observedError.reason,
    capturedRaw: null,
  });
  assert.deepEqual(projected, {
    code: 'MEANING_BOUNDARY_RAW_RESPONSE_UNAVAILABLE', exitCode: 2,
  });
  observedApiViolationCodes.add(projected.code);
});

test('MBA008 secret exposure owns code 20', async () => {
  assertCodeAt(19, 'MEANING_BOUNDARY_SECRET_EXPOSED');
  const secret = 'mba008-secret';
  const requestBytes = Buffer.from(`{"leaked":"${secret}"}\n`, 'utf8');
  assert.equal(presentationCaptionApiBytesContainSecretV001(requestBytes, secret), true);
  const inspection = inspectPresentationMeaningBoundarySecretAbsenceV001(
    secret,
    [['request', requestBytes]],
  );
  assert.equal(inspection.status, 'rejected');
  let fetchCalls = 0;
  let observedError = null;
  await assert.rejects(
    executePresentationCaptionGateB6ObservationTransportV001({
      requestBytes,
      apiKey: secret,
      fetchImplementation: async () => {
        fetchCalls += 1;
        throw new Error('must not send');
      },
      timeoutSignalFactory: () => null,
      rawResponseWriter: async () => {},
      expectedModelId: 'gemini-3.6-flash',
    }),
    error => {
      observedError = error;
      return error.reason === 'SECRET_PRESENT_IN_FORMAL_BYTES';
    },
  );
  assert.equal(fetchCalls, 0);
  const projected = projectPresentationMeaningBoundaryTransportFailureV001({
    upstreamCode: observedError.reason,
    capturedRaw: null,
  });
  assert.deepEqual(projected, {
    code: 'MEANING_BOUNDARY_SECRET_EXPOSED', exitCode: 2,
  });
  observedApiViolationCodes.add(projected.code);
});

test('MBA009 publication failure owns code 21 through the production publication inspector', async () => {
  assertCodeAt(20, 'MEANING_BOUNDARY_PUBLICATION_FAILED');
  const workspaceRoot = await mkdtemp(path.join(os.tmpdir(), 'zev-mba009-'));
  try {
    const staging = 'fixture-output.staging';
    await mkdir(path.join(workspaceRoot, staging));
    await writeFile(path.join(workspaceRoot, staging, 'formal.json'), '{}\n');
    await writeFile(path.join(workspaceRoot, staging, 'unexpected.json'), '{}\n');
    const inspection = await inspectPresentationMeaningBoundaryPublicationLayoutV001({
      workspaceRoot,
      relativeRoot: staging,
      expectedRelativeFiles: ['formal.json'],
    });
    assert.deepEqual(inspection, {
      status: 'rejected',
      code: 'MEANING_BOUNDARY_PUBLICATION_FAILED',
      errorCode: null,
    });
    observedApiViolationCodes.add(inspection.code);
  } finally {
    await rm(workspaceRoot, {recursive: true, force: true});
  }
});

test('MBA010 saved generate request bytes are the bytes sent', async () => {
  const observed = await observeGenerateTransport();
  assert.equal(observed.fetchOptions.body, observed.requestBytes);
  assert.equal(observed.result.rawBytes.equals(providerBytes()), true);
});

test('MBA011 generate is one shot with retry zero and timeout 600 seconds', async () => {
  const sourcePackage = makeSourcePackage();
  const {b5Job, b6Job} = makeJobs(sourcePackage);
  const badB5 = clone(b5Job);
  badB5.executionConfiguration.clientTimeoutMilliseconds = 600_001;
  const badB6 = clone(b6Job);
  badB6.executionPolicy.timeoutMilliseconds = 600_001;
  assert.throws(() => validatePresentationMeaningBoundaryB5JobV001(badB5));
  assert.throws(() => validatePresentationMeaningBoundaryB6JobV001(badB6));
  const observed = await observeGenerateTransport();
  assert.equal(observed.events.filter(event => event === 'fetch').length, 1);
  assert.equal(observed.timeoutMilliseconds, 600_000);
});

test('MBA012 secret scan and raw wx publication precede provider interpretation', async () => {
  const invalidRaw = Buffer.from('{"not":"a provider envelope"}\n', 'utf8');
  const observed = await observeGenerateTransport({rawBytes: invalidRaw});
  assert.deepEqual(observed.events, ['fetch', 'response-read', 'raw-write', 'returned']);
  assert.equal(observed.result.status, 'rejected');
  assert.equal(inspectPresentationMeaningBoundarySecretAbsenceV001(
    'fixture-secret',
    [['request', observed.requestBytes], ['raw', invalidRaw]],
  ).status, 'passed');

  const workspaceRoot = await mkdtemp(path.join(os.tmpdir(), 'zev-meaning-raw-fatal-v001-'));
  try {
    for (const fixture of [
      {
        name: 'raw-secret',
        rawBytes: Buffer.from('fixture-secret', 'utf8'),
        writerFails: false,
        expectedCode: 'MEANING_BOUNDARY_SECRET_EXPOSED',
      },
      {
        name: 'raw-save-failure',
        rawBytes: providerBytes(),
        writerFails: true,
        expectedCode: 'MEANING_BOUNDARY_PUBLICATION_FAILED',
      },
    ]) {
      const formalRoot = path.join(workspaceRoot, fixture.name);
      let capturedRaw = null;
      let transportError = null;
      await assert.rejects(
        executePresentationCaptionGateB6ObservationTransportV001({
          requestBytes: Buffer.from('{"request":"exact"}\n', 'utf8'),
          apiKey: 'fixture-secret',
          fetchImplementation: async () => ({
            status: 200,
            headers: {get: () => 'application/json; charset=UTF-8'},
            arrayBuffer: async () => fixture.rawBytes,
          }),
          timeoutSignalFactory: () => Object.freeze({fixtureSignal: true}),
          rawResponseWriter: async (bytes) => {
            capturedRaw = Buffer.from(bytes);
            if (fixture.writerFails) throw Object.assign(new Error('fixture write failure'), {
              code: 'EIO',
            });
            await mkdir(formalRoot, {recursive: true});
            await writeFile(path.join(formalRoot, 'generate-content-response.raw.json'), bytes, {
              flag: 'wx',
            });
          },
          expectedModelId: 'gemini-3.6-flash',
        }),
        error => {
          transportError = error;
          return true;
        },
      );
      const failure = projectPresentationMeaningBoundaryTransportFailureV001({
        upstreamCode: transportError?.reason ?? transportError?.code ?? null,
        capturedRaw,
      });
      assert.equal(failure.exitCode, 2);
      assert.equal(failure.code, fixture.expectedCode);
      await assert.rejects(readdir(formalRoot), error => error.code === 'ENOENT');
    }
  } finally {
    await rm(workspaceRoot, {recursive: true, force: true});
  }
});

test('MBA013 B5 and B6 jobs have exact 11-key schemas and distinct authorization', () => {
  const sourcePackage = makeSourcePackage();
  const {b5Job, b6Job} = makeJobs(sourcePackage);
  assert.equal(Object.keys(b5Job).length, 11);
  assert.equal(Object.keys(b6Job).length, 11);
  assert.equal(validatePresentationMeaningBoundaryB5JobV001(b5Job), b5Job);
  assert.equal(validatePresentationMeaningBoundaryB6JobV001(b6Job), b6Job);
  assert.notEqual(b5Job.action, b6Job.action);
  assert.notEqual(b5Job.outputRoot, b6Job.outputRoot);
  const b5Line = projectPresentationMeaningBoundaryB5AuthorizationLineV001(b5Job);
  const b6Line = projectPresentationMeaningBoundaryB6AuthorizationLineV001(b6Job);
  for (const line of [b5Line, b6Line]) {
    const inspected = inspectPresentationMeaningBoundaryDecisionLineV001({
      documentBytes: Buffer.from(`${line}\n`, 'ascii'),
      expectedLine: line,
    });
    assert.equal(inspected.status, 'passed');
    assert.equal(inspected.binding.path, 'DECISIONS.md');
    assert.equal(inspected.binding.lineSha256, sha256(Buffer.from(line, 'utf8')));
  }
  assert.notEqual(b5Line, b6Line);
  assert.equal(b6Job.sendAuthorization.decisionLineBinding.lineText, b6Line);
  const badOfficialPath = clone(b5Job);
  badOfficialPath.officialVerification.sources[0].snapshotPath =
    'fixtures/meaning-boundary/wrong-pricing.html';
  assert.throws(() => validatePresentationMeaningBoundaryB5JobV001(badOfficialPath));
  const badAuthorizationLine = clone(b6Job);
  badAuthorizationLine.sendAuthorization.decisionLineBinding.lineText += '-changed';
  badAuthorizationLine.sendAuthorization.decisionLineBinding.lineSha256 = sha256(
    Buffer.from(
      badAuthorizationLine.sendAuthorization.decisionLineBinding.lineText,
      'utf8',
    ),
  );
  assert.throws(() => validatePresentationMeaningBoundaryB6JobV001(
    badAuthorizationLine,
  ));
});

test('MBA014 B5 11-key and B6 13-key manifests accept exact artifact unions', () => {
  const passed = makeProductionAttemptProjection();
  assert.equal(Object.keys(passed.b5Manifest).length, 11);
  assert.equal(Object.keys(passed.manifest).length, 13);
  assert.equal(
    validatePresentationMeaningBoundaryB5ManifestV001(passed.b5Manifest).status,
    'passed',
  );
  assert.equal(
    validatePresentationMeaningBoundaryB6ManifestV001(passed.manifest).status,
    'passed',
  );
  assert.equal(
    passed.manifest.manifestId.endsWith(
      passed.manifest.b6JobBinding.fileSha256.slice(0, 32),
    ),
    true,
  );
  assert.deepEqual(passed.publication.formalArtifactNames, [
    'generate-content-response.raw.json',
    'provider-response-envelope.json',
    'b6-manifest.json',
  ]);
  assert.equal(passed.publication.validationDispatch, 'eligible');
  assert.equal(inspectPresentationMeaningBoundaryB5ArtifactPathsV001({
    manifest: passed.b5Manifest,
    b5Job: passed.b5Job,
  }).status, 'passed');
  assert.equal(inspectPresentationMeaningBoundaryB6ArtifactPathsV001({
    b5Job: passed.b5Job,
    b6Manifest: passed.manifest,
    b6Job: passed.b6Job,
    providerEnvelope: passed.providerEnvelope,
  }).status, 'passed');
  const rejected = makeProductionAttemptProjection({
    rawBytes: Buffer.from([0xff]),
  });
  assert.deepEqual(rejected.publication.formalArtifactNames, [
    'generate-content-response.raw.json',
    'b6-manifest.json',
  ]);
  assert.equal(rejected.publication.validationDispatch, 'blocked');
});

test('MBA015 maximum valid response uses every candidate exactly once', () => {
  const sourcePackage = makeSourcePackage();
  const built = buildPresentationMeaningBoundaryB5RequestSetV001({
    sourcePackageBytes: formalBytes(sourcePackage),
    modelOutputTokenLimit: 65_536,
  });
  const selected = built.maximumResponse.containers.flatMap(container =>
    container.meaningGroups.map(group => group.meaningGroupEndBoundaryCandidateId));
  const expected = sourcePackage.containers.flatMap(container =>
    container.boundaryCandidates.map(candidate => candidate.boundaryCandidateId));
  assert.deepEqual(selected, expected);
  assert.equal(new Set(selected).size, expected.length);
  const canonical = canonicalizePresentationCaptionB1JsonV001(built.maximumResponse);
  assert.equal(canonical.status, 'canonicalized');
  assert.equal(built.maximumValidResponseCanonicalByteLength, canonical.bytes.length);
});

test('MBA016 provider envelope has nine keys and keeps thought signature raw-only', () => {
  const raw = formalBytes({
    candidates: [{
      content: {
        role: 'model',
        parts: [{text: '{"status":"abstained"}\n', thoughtSignature: 'opaque'}],
      },
    }],
    modelVersion: 'gemini-3.6-flash',
    usageMetadata: {
      promptTokenCount: 10, candidatesTokenCount: 2,
      thoughtsTokenCount: 1, totalTokenCount: 13,
    },
  });
  const observation = inspectProviderBytes(raw);
  assert.equal(observation.status, 'passed');
  const providerEnvelope = buildPresentationMeaningBoundaryProviderEnvelopeV001({
    observation,
    rawBinding: mediaBinding('fixtures/meaning-boundary/raw.json', 'a'),
    jobFileSha256: H('b'),
  });
  assert.equal(Object.keys(providerEnvelope).length, 9);
  assert.equal(validatePresentationMeaningBoundaryProviderEnvelopeV001(providerEnvelope).status,
    'passed');
  assert.equal(Object.hasOwn(providerEnvelope, 'thoughtSignature'), false);
});

test('MBA017 B5 stops after measurement and never advances automatically to B6', () => {
  const sourcePackage = makeSourcePackage();
  const {b5Job, b6Job} = makeJobs(sourcePackage);
  assert.equal(selectPresentationMeaningBoundaryJobActionV001(b5Job), 'measure-only');
  assert.equal(selectPresentationMeaningBoundaryJobActionV001(b6Job), 'generate-once');
  assert.equal(selectPresentationMeaningBoundaryJobActionV001({...b5Job, action: 'generate-once'}),
    null);
});

test('MBA018 six official inputs are copied with byte and SHA claims intact', () => {
  const snapshot = makeOfficialSnapshot();
  assert.equal(snapshot.sources.length, 6);
  assert.equal(snapshot.claims.length, 9);
  for (const [index, source] of snapshot.sources.entries()) {
    const bytes = Buffer.from(`official-${source.sourceId}`, 'utf8');
    const boundSource = {
      ...source,
      snapshotFileSha256: sha256(bytes),
      snapshotByteLength: bytes.length,
    };
    assert.equal(inspectPresentationMeaningBoundaryOfficialSnapshotCopyV001({
      source: boundSource,
      inputBytes: bytes,
      outputBytes: Buffer.from(bytes),
    }).status, 'passed');
    assert.equal(inspectPresentationMeaningBoundaryOfficialSnapshotCopyV001({
      source: boundSource,
      inputBytes: bytes,
      outputBytes: Buffer.from('changed', 'utf8'),
    }).status, 'rejected');
    const outputRoot = 'evals/clip_composition/outputs/presentation/meaning-boundary-b5/fixture';
    const publishedSource = {
      ...boundSource,
      snapshotPath:
        `${outputRoot}/official/`
        + PRESENTATION_CAPTION_API_OFFICIAL_SOURCE_SPECS_V001[index].basename,
    };
    assert.equal(inspectPresentationMeaningBoundaryOfficialSnapshotPathV001({
      outputRoot,
      source: publishedSource,
      index,
    }).status, 'passed');
    assert.equal(inspectPresentationMeaningBoundaryOfficialSnapshotPathV001({
      outputRoot,
      source: {...publishedSource, snapshotPath: `${outputRoot}/official/other.html`},
      index,
    }).status, 'rejected');
  }
  const bound = makeProductionAttemptProjection();
  assert.equal(inspectPresentationMeaningBoundaryB5ArtifactPathsV001({
    manifest: bound.b5Manifest,
    b5Job: bound.b5Job,
  }).status, 'passed');
  const wrongTokenPath = clone(bound.b5Manifest);
  wrongTokenPath.tokenCountBindings.finalResponse.path =
    `${bound.b5Job.outputRoot}/arbitrary-response.json`;
  assert.equal(inspectPresentationMeaningBoundaryB5ArtifactPathsV001({
    manifest: wrongTokenPath,
    b5Job: bound.b5Job,
  }).status, 'rejected');
  const wrongRequestPath = clone(bound.b5Manifest);
  wrongRequestPath.generateRequestBinding.path =
    `${bound.b5Job.outputRoot}/arbitrary-request.json`;
  assert.equal(inspectPresentationMeaningBoundaryB5ArtifactPathsV001({
    manifest: wrongRequestPath,
    b5Job: bound.b5Job,
  }).status, 'rejected');
});

test('MBA019 both endpoints use exactly two headers and a 600-second signal', async () => {
  const {manifest} = makeProductionAttemptProjection();
  const badManifest = clone(manifest);
  badManifest.transport.clientTimeoutMilliseconds = 600_001;
  assert.equal(validatePresentationMeaningBoundaryB6ManifestV001(badManifest).status,
    'rejected');
  const count = await observeCountTokensTransport();
  const generate = await observeGenerateTransport();
  for (const observed of [count, generate]) {
    assert.deepEqual(Object.keys(observed.fetchOptions.headers), [
      'content-type', 'x-goog-api-key',
    ]);
    assert.equal(observed.timeoutMilliseconds, 600_000);
  }
});

test('MBA020 old fixed cost adapter and new parameterized entry share the same result', () => {
  const legacy = derivePresentationCaptionPreSendCostV001({
    probeInputTokens: 1_000,
    finalInputTokens: 1_010,
  });
  const parameterized = derivePresentationApiPreSendCostV001({
    probeInputTokens: 1_000,
    finalInputTokens: 1_010,
    policy: {
      modelOutputTokenLimit: 65_536,
      inputPriceNanoUsdPerToken: 1_500,
      outputPriceNanoUsdPerToken: 7_500,
      maximumNanoUsd: 500_000_000,
    },
  });
  assert.deepEqual(legacy, {
    status: parameterized.status,
    maxOutputTokens: parameterized.derivedMaxOutputTokens,
    preSendEstimateNanoUsd: parameterized.preSendEstimateNanoUsd,
  });
  const startCommitPostSendCases = [
    {
      input: {
        usageMetadata: {
          promptTokenCount: 10, candidatesTokenCount: 2,
          thoughtsTokenCount: 1, totalTokenCount: 13,
        },
        finalInputTokens: 1_010,
        maxOutputTokens: 65_536,
        preSendEstimateNanoUsd: 493_035_000,
      },
      expected: {
        status: 'passed', code: null, observedUsageCostNanoUsd: 37_500,
        estimateComparison: {
          promptTokensExceededFinalInputTokens: false,
          outputTokensExceededDerivedMaxOutputTokens: false,
          usageCostExceededPreSendEstimate: false,
        },
      },
    },
    {
      input: {
        usageMetadata: {
          promptTokenCount: 100_000, candidatesTokenCount: 50_000,
          thoughtsTokenCount: 20_000, totalTokenCount: 170_000,
        },
        finalInputTokens: 1_010,
        maxOutputTokens: 65_536,
        preSendEstimateNanoUsd: 493_035_000,
      },
      expected: {
        status: 'rejected', code: 'API_USAGE_BUDGET_VIOLATION',
        observedUsageCostNanoUsd: 675_000_000,
        estimateComparison: {
          promptTokensExceededFinalInputTokens: true,
          outputTokensExceededDerivedMaxOutputTokens: true,
          usageCostExceededPreSendEstimate: true,
        },
      },
    },
    {
      input: {
        usageMetadata: {
          promptTokenCount: 10, candidatesTokenCount: 2,
          thoughtsTokenCount: 1, totalTokenCount: 99,
        },
        finalInputTokens: 1_010,
        maxOutputTokens: 65_536,
        preSendEstimateNanoUsd: 493_035_000,
      },
      expected: {
        status: 'rejected', code: 'API_USAGE_ACCOUNTING_INVALID',
        relatedPaths: ['$.usageMetadata'], facts: {},
      },
    },
    {
      input: {
        usageMetadata: {
          promptTokenCount: Number.MAX_SAFE_INTEGER, candidatesTokenCount: 0,
          thoughtsTokenCount: 0, totalTokenCount: Number.MAX_SAFE_INTEGER,
        },
        finalInputTokens: 1_010,
        maxOutputTokens: 65_536,
        preSendEstimateNanoUsd: 493_035_000,
      },
      expected: {
        status: 'rejected', code: 'API_USAGE_BUDGET_VIOLATION',
        observedUsageCostNanoUsd: 13_510_798_882_111_486_000,
        estimateComparison: {
          promptTokensExceededFinalInputTokens: true,
          outputTokensExceededDerivedMaxOutputTokens: false,
          usageCostExceededPreSendEstimate: true,
        },
      },
    },
  ];
  for (const fixture of startCommitPostSendCases) {
    assert.deepEqual(
      derivePresentationCaptionPostSendCostV001(fixture.input),
      fixture.expected,
    );
  }
  assert.equal(derivePresentationApiPostSendCostProjectionV001({
    usageMetadata: startCommitPostSendCases[3].input.usageMetadata,
    finalInputTokens: 1_010,
    derivedMaxOutputTokens: 65_536,
    preSendEstimateNanoUsd: 493_035_000,
    policy: {
      modelOutputTokenLimit: 65_536,
      inputPriceNanoUsdPerToken: 1_500,
      outputPriceNanoUsdPerToken: 7_500,
      maximumNanoUsd: 500_000_000,
    },
  }).code, 'API_USAGE_ACCOUNTING_INVALID');
  const bound = makeProductionAttemptProjection();
  assert.equal(validatePresentationMeaningBoundaryB6ArtifactGraphV001({
    b5Manifest: bound.b5Manifest,
    b5Job: bound.b5Job,
    b6Manifest: bound.manifest,
    b6Job: bound.b6Job,
    providerEnvelope: bound.providerEnvelope,
  }).status, 'passed');
  const changedCost = clone(bound.manifest);
  changedCost.usageListPriceEstimate.promptCostNanoUsd += 1;
  changedCost.usageListPriceEstimate.totalCostNanoUsd += 1;
  assert.equal(validatePresentationMeaningBoundaryB6ArtifactGraphV001({
    b5Manifest: bound.b5Manifest,
    b5Job: bound.b5Job,
    b6Manifest: changedCost,
    b6Job: bound.b6Job,
    providerEnvelope: bound.providerEnvelope,
  }).status, 'rejected');
  const changedRawPath = clone(bound.manifest);
  changedRawPath.rawResponseBinding.path = `${bound.b6Job.outputRoot}/other.raw.json`;
  assert.equal(validatePresentationMeaningBoundaryB6ArtifactGraphV001({
    b5Manifest: bound.b5Manifest,
    b5Job: bound.b5Job,
    b6Manifest: changedRawPath,
    b6Job: bound.b6Job,
    providerEnvelope: bound.providerEnvelope,
  }).status, 'rejected');
});

test('MBA021 post-send budget excess is rejected-cost and does not start B1', () => {
  const attempt = makeProductionAttemptProjection({
    rawBytes: providerBytes({
      usageMetadata: {
        promptTokenCount: 1_010,
        candidatesTokenCount: 70_000,
        thoughtsTokenCount: 0,
        totalTokenCount: 71_010,
      },
    }),
  });
  const {manifest} = attempt;
  assert.equal(validatePresentationMeaningBoundaryB6ManifestV001(manifest).status, 'passed');
  assert.equal(manifest.status, 'rejected-cost');
  assert.equal(manifest.checks.cost, 'failed');
  assert.equal(manifest.usageListPriceEstimate.withinApprovedLimit, false);
  assert.equal(attempt.publication.validationDispatch, 'blocked');
  assert.deepEqual(attempt.publication.formalArtifactNames, [
    'generate-content-response.raw.json',
    'provider-response-envelope.json',
    'b6-manifest.json',
  ]);
});

test('MBA022 transport extraction preserves V002 success and failure precedence', async () => {
  const success = await executeV002AdapterFixture({rawBytes: providerBytes()});
  assert.deepEqual(Object.keys(success), [
    'status', 'httpStatus', 'contentType', 'rawBytes', 'semanticBytes',
    'responseModelVersion', 'observedServiceTier', 'candidateCount',
    'usageMetadata',
  ]);
  assert.equal(success.status, 'passed');
  assert.equal(Object.hasOwn(success, 'parserInvocationCount'), false);

  const baseEnvelope = () => ({
    candidates: [{
      content: {role: 'model', parts: [{text: '{"status":"abstained"}\n'}]},
    }],
    modelVersion: 'gemini-3.6-flash',
    usageMetadata: {
      promptTokenCount: 10,
      candidatesTokenCount: 2,
      thoughtsTokenCount: 1,
      totalTokenCount: 13,
    },
  });
  const missingModel = baseEnvelope();
  delete missingModel.modelVersion;
  const missingUsage = baseEnvelope();
  delete missingUsage.usageMetadata;
  const mismatchedModel = baseEnvelope();
  mismatchedModel.modelVersion = 'gemini-other';
  const invalidUsage = baseEnvelope();
  invalidUsage.usageMetadata.totalTokenCount = 99;
  const invalidTier = baseEnvelope();
  invalidTier.usageMetadata.serviceTier = 'batch';
  const invalidCount = baseEnvelope();
  invalidCount.candidates = [];
  const invalidContent = baseEnvelope();
  invalidContent.candidates[0].content.parts[0].text = '';
  const invalidTextUtf8 = Buffer.from(
    JSON.stringify({
      ...baseEnvelope(),
      candidates: [{content: {role: 'model', parts: [{text: '\ud800'}]}}],
    }) + '\n',
    'utf8',
  );
  const priorityCases = [
    ['B6_V002_HTTP_ENVELOPE_INVALID', providerBytes(), 500, 'text/plain'],
    ['HTTP_RESPONSE_UTF8_INVALID', Buffer.from([0xff]), 200,
      'application/json; charset=UTF-8'],
    ['HTTP_RESPONSE_JSON_INVALID', Buffer.from('{', 'utf8'), 200,
      'application/json; charset=UTF-8'],
    ['HTTP_RESPONSE_SHAPE_INVALID', formalBytes([]), 200,
      'application/json; charset=UTF-8'],
    ['HTTP_RESPONSE_MODEL_VERSION_MISSING', formalBytes(missingModel), 200,
      'application/json; charset=UTF-8'],
    ['HTTP_RESPONSE_USAGE_INVALID', formalBytes(missingUsage), 200,
      'application/json; charset=UTF-8'],
    ['B6_V002_RESPONSE_MODEL_INVALID', formalBytes(mismatchedModel), 200,
      'application/json; charset=UTF-8'],
    ['B6_V002_USAGE_INVALID', formalBytes(invalidUsage), 200,
      'application/json; charset=UTF-8'],
    ['B6_V002_RESPONSE_TIER_INVALID', formalBytes(invalidTier), 200,
      'application/json; charset=UTF-8'],
    ['B6_V002_CANDIDATE_COUNT_INVALID', formalBytes(invalidCount), 200,
      'application/json; charset=UTF-8'],
    ['B6_V002_CANDIDATE_CONTENT_INVALID', formalBytes(invalidContent), 200,
      'application/json; charset=UTF-8'],
    ['HTTP_RESPONSE_CANDIDATE_TEXT_UTF8_INVALID', invalidTextUtf8, 200,
      'application/json; charset=UTF-8'],
  ];
  for (const [code, rawBytes, httpStatus, contentType] of priorityCases) {
    await assert.rejects(
      () => executeV002AdapterFixture({rawBytes, httpStatus, contentType}),
      error => error?.reason === code,
    );
  }
  const observation = inspectProviderBytes(providerBytes());
  assert.equal(observation.parserInvocationCount, 1);
  assert.equal(normalizePresentationMeaningBoundaryTransportObservationV001({
    observation,
  }), observation);
  assert.equal(normalizePresentationMeaningBoundaryTransportObservationV001(observation),
    observation);
});

test('MBA023 invalid candidate count keeps raw usage and cost but no envelope', () => {
  const attempt = makeProductionAttemptProjection({
    rawBytes: providerBytes({candidates: []}),
  });
  const {manifest} = attempt;
  assert.equal(validatePresentationMeaningBoundaryB6ManifestV001(manifest).status, 'passed');
  assert.equal(manifest.providerEnvelopeBinding, null);
  assert.notEqual(manifest.usageListPriceEstimate, null);
  assert.equal(manifest.checks.responseCandidateCount, 'failed');
  assert.equal(attempt.publication.validationDispatch, 'blocked');
  assert.deepEqual(attempt.publication.formalArtifactNames, [
    'generate-content-response.raw.json', 'b6-manifest.json',
  ]);
});

test('MBA024 invalid candidate content keeps raw usage and cost but no envelope', () => {
  const attempt = makeProductionAttemptProjection({
    rawBytes: providerBytes({
      candidates: [{content: {role: 'model', parts: [{text: ''}]}}],
    }),
  });
  const {manifest} = attempt;
  assert.equal(validatePresentationMeaningBoundaryB6ManifestV001(manifest).status, 'passed');
  assert.equal(manifest.providerEnvelopeBinding, null);
  assert.notEqual(manifest.usageListPriceEstimate, null);
  assert.equal(manifest.checks.candidateContent, 'failed');
  assert.equal(attempt.publication.validationDispatch, 'blocked');
});

test('MBA025 HTTP or model rejection is parsed once and cost requires model plus usage', () => {
  const invalidBytesAttempt = makeProductionAttemptProjection({
    rawBytes: Buffer.from([0xff]),
  });
  assert.equal(validatePresentationMeaningBoundaryB6ManifestV001(
    invalidBytesAttempt.manifest,
  ).status, 'passed');
  assert.equal(invalidBytesAttempt.manifest.usageListPriceEstimate, null);

  const httpRejectedAttempt = makeProductionAttemptProjection({
    rawBytes: providerBytes(),
    httpStatus: 500,
  });
  assert.equal(httpRejectedAttempt.observation.parserInvocationCount, 1);
  assert.equal(httpRejectedAttempt.observation.primaryRejectionCode,
    'B6_V002_HTTP_ENVELOPE_INVALID');
  assert.equal(httpRejectedAttempt.observation.checks.model, 'passed');
  assert.equal(httpRejectedAttempt.observation.checks.usage, 'passed');
  assert.notEqual(httpRejectedAttempt.manifest.usageListPriceEstimate, null);
  assert.equal(httpRejectedAttempt.manifest.providerEnvelopeBinding, null);

  const modelRejectedAttempt = makeProductionAttemptProjection({
    rawBytes: providerBytes({modelVersion: 'gemini-other'}),
  });
  assert.equal(modelRejectedAttempt.observation.parserInvocationCount, 1);
  assert.equal(modelRejectedAttempt.observation.checks.model, 'failed');
  assert.equal(modelRejectedAttempt.observation.checks.usage, 'passed');
  assert.equal(modelRejectedAttempt.manifest.usageListPriceEstimate, null);
  assert.equal(modelRejectedAttempt.manifest.providerEnvelopeBinding, null);
});

test('MBA026 usage invalid blocks cost and never reparses raw bytes', () => {
  const rawBytes = providerBytes({
    usageMetadata: {
      promptTokenCount: 10,
      candidatesTokenCount: 2,
      thoughtsTokenCount: 1,
      totalTokenCount: 99,
    },
  });
  const attempt = makeProductionAttemptProjection({rawBytes});
  const {manifest, observation} = attempt;
  assert.equal(validatePresentationMeaningBoundaryB6ManifestV001(manifest).status, 'passed');
  assert.equal(manifest.checks.usage, 'failed');
  assert.equal(manifest.checks.cost, 'blocked');
  assert.equal(manifest.usageListPriceEstimate, null);
  assert.equal(observation.parserInvocationCount, 1);
  assert.equal(observation.checks.usage, 'failed');
  assert.equal(attempt.publication.validationDispatch, 'blocked');
  assert.deepEqual(
    [...observedApiViolationCodes],
    [...PRESENTATION_MEANING_BOUNDARY_API_OWNED_VIOLATION_CODES_V001],
  );
});
