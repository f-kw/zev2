import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {mkdir, mkdtemp, readFile, readdir, rm, writeFile} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import {fileURLToPath, pathToFileURL} from 'node:url';

import {
  canonicalizePresentationCaptionB1JsonV001,
  serializePresentationCaptionB1FormalJsonV001,
} from './presentation_caption_semantic_source_package_v001.mjs';
import {
  PRESENTATION_MEANING_BOUNDARY_TASK_DESCRIPTION_V001,
  PRESENTATION_MEANING_BOUNDARY_SOURCE_OWNED_VIOLATION_CODES_V001,
  validatePresentationMeaningBoundarySourcePackageV001,
} from './presentation_meaning_boundary_source_package_v001.mjs';
import {
  derivePresentationMeaningCaptionProjectionV001,
  derivePresentationMeaningSelectionProjectionV001,
} from './presentation_meaning_information_package_v001.mjs';
import {
  PRESENTATION_MEANING_BOUNDARY_API_OWNED_VIOLATION_CODES_V001,
  validatePresentationMeaningBoundaryB5ManifestV001,
  validatePresentationMeaningBoundaryB6ManifestV001,
} from './run_presentation_meaning_boundary_b5_b6_v001.mjs';
import {
  PRESENTATION_MEANING_BOUNDARY_SELECTION_SCHEMA_V001,
  PRESENTATION_MEANING_BOUNDARY_SELECTION_OWNED_VIOLATION_CODES_V001,
  PRESENTATION_MEANING_BOUNDARY_VALIDATION_REPORT_SCHEMA_V001,
  PRESENTATION_MEANING_BOUNDARY_VIOLATION_CODES_V001,
  buildPresentationMeaningBoundaryValidationReportV001,
  assertPresentationMeaningBoundaryAtomPostconditionV001,
  assertPresentationMeaningBoundaryReportPostconditionV001,
  decodePresentationMeaningBoundaryResponseV001,
  evaluatePresentationMeaningBoundarySelectionV001,
  inspectPresentationMeaningBoundaryCandidateCoverageV001,
  inspectPresentationMeaningBoundaryInputObservationStabilityV001,
  inspectPresentationMeaningBoundarySelectionInputsBeforePublicationV001,
  makePresentationMeaningBoundaryFatalCliResultV001,
  validatePresentationMeaningBoundarySelectionV001,
  validatePresentationMeaningBoundaryValidationReportV001,
} from './presentation_meaning_boundary_selection_v001.mjs';

const H = character => character.repeat(64);
const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPOSITORY_ROOT = path.resolve(HERE, '../..');
const SELECTION_CLI_PATH = path.join(
  REPOSITORY_ROOT,
  'evals/clip_composition/presentation_meaning_boundary_selection_v001.mjs',
);
const SOURCE_SPEAKER_REGISTRY_PATH =
  'evals/clip_composition/registries/presentation/'
  + 'presentation-source-speaker-non-identity-registry-v001/registry.json';
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
    fileSha256: 'a38ef995c5c838f742c1de6c18acd5a7fd166ea57fb7537e51cf9a89abd4c0de',
    role: 'meaning-package-contract',
  }),
  Object.freeze({
    path: 'evals/clip_composition/reports/presentation/presentation-output-side-acceptance-contract-design-20260803-v001.md',
    fileSha256: 'c349d544e9cc954d2f5b9e5e05334801e6a11cdce383f57829c04ae301b678de',
    role: 'output-side-contract',
  }),
]);
const SOURCE_IMPLEMENTATION_BINDINGS = Object.freeze([
  Object.freeze({
    path: 'evals/clip_composition/presentation_meaning_boundary_source_package_v001.mjs',
    fileSha256: H('1'),
    role: 'meaning-source-package',
  }),
  Object.freeze({
    path: 'evals/clip_composition/presentation_segmenter_boundary_evidence_v001.mjs',
    fileSha256: H('2'),
    role: 'gate-a-core',
  }),
  Object.freeze({
    path: 'evals/clip_composition/run_presentation_segmenter_boundary_preflight_v001.mjs',
    fileSha256: H('3'),
    role: 'gate-a-preflight',
  }),
  Object.freeze({
    path: 'evals/clip_composition/presentation_caption_semantic_source_package_v001.mjs',
    fileSha256: H('4'),
    role: 'strict-json',
  }),
]);
const SELECTION_IMPLEMENTATION_BINDINGS = Object.freeze([
  Object.freeze({
    path: 'evals/clip_composition/presentation_meaning_boundary_selection_v001.mjs',
    fileSha256: H('5'),
    role: 'meaning-selection',
  }),
  Object.freeze({
    path: 'evals/clip_composition/presentation_meaning_boundary_source_package_v001.mjs',
    fileSha256: H('1'),
    role: 'meaning-source-package',
  }),
  Object.freeze({
    path: 'evals/clip_composition/presentation_caption_semantic_source_package_v001.mjs',
    fileSha256: H('4'),
    role: 'strict-json-codec',
  }),
  Object.freeze({
    path: 'evals/clip_composition/presentation_fatal_observation_v002.mjs',
    fileSha256: H('5'),
    role: 'fatal-observation',
  }),
]);
const B6_IMPLEMENTATION_BINDINGS = Object.freeze([
  Object.freeze({
    path: 'evals/clip_composition/run_presentation_meaning_boundary_b5_b6_v001.mjs',
    fileSha256: H('6'),
    role: 'meaning-boundary-api-runner',
  }),
  Object.freeze({
    path: 'evals/clip_composition/run_presentation_caption_gate_b6_v001.mjs',
    fileSha256: H('7'),
    role: 'api-transport',
  }),
  Object.freeze({
    path: 'evals/clip_composition/presentation_caption_api_cost_guard_v001.mjs',
    fileSha256: H('8'),
    role: 'api-cost-policy',
  }),
  Object.freeze({
    path: 'evals/clip_composition/presentation_caption_semantic_source_package_v001.mjs',
    fileSha256: H('4'),
    role: 'strict-json-codec',
  }),
]);

const makeSourcePackage = () => {
  const containerSpecs = [
    {
      sourceMediaId: 'source-media-000001',
      timelineSegmentId: 'segment-000001',
      atomIds: ['source-1-atom-a', 'source-1-atom-b'],
      texts: ['甲', '乙'],
      starts: [100, 200],
    },
    {
      sourceMediaId: 'source-media-000002',
      timelineSegmentId: 'segment-000002',
      atomIds: ['source-2-atom-a', 'source-2-atom-b'],
      texts: ['丙', '丁'],
      starts: [500, 600],
    },
    {
      sourceMediaId: 'source-media-000001',
      timelineSegmentId: 'segment-000003',
      atomIds: ['source-1-atom-a', 'source-1-atom-b'],
      texts: ['甲', '乙'],
      starts: [100, 200],
    },
  ];
  let globalCandidateOrdinal = 0;
  const candidateOccurrenceMap = [];
  const containers = containerSpecs.map((spec, containerIndex) => {
    const boundaryCandidates = spec.atomIds.map((atomId, index) => {
      globalCandidateOrdinal += 1;
      const atomRef = {
        timelineSegmentId: spec.timelineSegmentId,
        sourceMediaId: spec.sourceMediaId,
        atomId,
      };
      const boundaryCandidateId =
        `segmenter-boundary-${String(globalCandidateOrdinal).padStart(6, '0')}`;
      candidateOccurrenceMap.push({
        boundaryCandidateId,
        timelineSegmentId: spec.timelineSegmentId,
        sourceMediaId: spec.sourceMediaId,
        sourceGateAContainerId:
          `segmenter-container-${spec.sourceMediaId.endsWith('1') ? '000001' : '000002'}`,
        sourceGateABoundaryCandidateId:
          `segmenter-boundary-${String(index + 1).padStart(6, '0')}`,
        atomRefs: [atomRef],
      });
      return {
        boundaryCandidateId,
        ordinal: index + 1,
        atomRefs: [atomRef],
        text: spec.texts[index],
        startAnchor: {atomRef, edge: 'start'},
        endAnchor: {atomRef, edge: 'end'},
        sourceStartMs: spec.starts[index],
        sourceEndMs: spec.starts[index] + 80,
        isWordLike: true,
      };
    });
    return {
      containerId: `segmenter-container-${String(containerIndex + 1).padStart(6, '0')}`,
      ordinal: containerIndex + 1,
      sourceMediaId: spec.sourceMediaId,
      timelineSegmentId: spec.timelineSegmentId,
      boundaryCandidates,
    };
  });
  const timelineBinding = dummyJsonBinding(
    'zev-timeline-composition-decision-v001',
    'fixtures/meaning-selection/timeline.json',
    'a',
  );
  const sourceRuntime = sourceMediaId => ({
    sourceMediaId,
    preflightReportBinding: dummyJsonBinding(
      'presentation-segmenter-boundary-preflight-report-v001',
      `fixtures/meaning-selection/${sourceMediaId}-preflight.json`,
      sourceMediaId.endsWith('1') ? 'b' : 'c',
    ),
    evidenceBinding: dummyJsonBinding(
      'presentation-segmenter-boundary-evidence-v001',
      `fixtures/meaning-selection/${sourceMediaId}-evidence.json`,
      sourceMediaId.endsWith('1') ? 'd' : 'e',
    ),
    runtimeProjection: {
      nodeBinarySha256: H('9'),
      nodeVersion: 'v20.19.6',
      icuVersion: '75.1',
      resolvedLocale: 'ja',
      resolvedGranularity: 'word',
    },
  });
  const value = {
    schemaVersion: 'presentation-meaning-boundary-source-package-v001',
    packageId: 'meaning-selection-two-source-reuse-v001',
    timelineCompositionDecisionBinding: timelineBinding,
    runtimeBinding: {
      segmenterSources: [
        sourceRuntime('source-media-000001'),
        sourceRuntime('source-media-000002'),
      ],
      strictJsonImplementationBinding: SOURCE_IMPLEMENTATION_BINDINGS[3],
    },
    containers,
    candidateOccurrenceMap,
    taskDescription: PRESENTATION_MEANING_BOUNDARY_TASK_DESCRIPTION_V001,
    provenance: {
      sourcePackageJobBinding: dummyJsonBinding(
        'presentation-meaning-boundary-source-package-job-v001',
        'fixtures/meaning-selection/source-package-job.json',
        'f',
      ),
      timelineCompositionDecisionBinding: timelineBinding,
      implementationBindings: SOURCE_IMPLEMENTATION_BINDINGS,
    },
  };
  assert.equal(validatePresentationMeaningBoundarySourcePackageV001(value), true);
  return value;
};

const makeOfficialSnapshot = () => {
  const sourceSpecs = [
    ['pricing', 'https://ai.google.dev/gemini-api/docs/pricing'],
    ['tokens-guide', 'https://ai.google.dev/gemini-api/docs/tokens'],
    ['count-tokens-api', 'https://ai.google.dev/api/tokens'],
    ['billing', 'https://ai.google.dev/gemini-api/docs/billing'],
    ['thinking', 'https://ai.google.dev/gemini-api/docs/generate-content/thinking'],
    ['latest-model', 'https://ai.google.dev/gemini-api/docs/latest-model'],
  ];
  const sources = sourceSpecs.map(([sourceId, url], index) => ({
    sourceId,
    url,
    observedAt: '2026-08-03T00:00:00.000Z',
    snapshotPath: `fixtures/meaning-selection/official/${sourceId}.html`,
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
  const claims = [
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
  }));
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
    claims,
  };
};

const makeCompleteResponse = sourcePackage => ({
  status: 'complete',
  containers: sourcePackage.containers.map(container => ({
    containerId: container.containerId,
    meaningGroups: [{
      meaningGroupEndBoundaryCandidateId:
        container.boundaryCandidates.at(-1).boundaryCandidateId,
    }],
  })),
});

const makeFixture = (responseFactory = makeCompleteResponse) => {
  const sourcePackage = makeSourcePackage();
  const sourcePackageBinding = jsonBinding(
    sourcePackage.schemaVersion,
    'fixtures/meaning-selection/source-package.json',
    sourcePackage,
  );
  const requestBinding = mediaBinding('fixtures/meaning-selection/request.json', '1');
  const b5JobBinding = dummyJsonBinding(
    'presentation-meaning-boundary-b5-job-v001',
    'fixtures/meaning-selection/b5-job.json',
    '2',
  );
  const decisionLine = 'B5_MEANING_BOUNDARY_MEASUREMENT_AUTHORIZATION_V001';
  const b5Manifest = {
    schemaVersion: 'presentation-meaning-boundary-b5-manifest-v001',
    manifestId:
      `presentation-meaning-boundary-b5-manifest-${b5JobBinding.fileSha256.slice(0, 32)}`,
    status: 'passed',
    b5JobBinding,
    sourcePackageBinding,
    generateRequestBinding: requestBinding,
    tokenCountBindings: {
      probeRequest: mediaBinding('fixtures/meaning-selection/probe-request.json', '3'),
      probeResponse: mediaBinding('fixtures/meaning-selection/probe-response.json', '4'),
      finalRequest: mediaBinding('fixtures/meaning-selection/final-request.json', '5'),
      finalResponse: mediaBinding('fixtures/meaning-selection/final-response.json', '6'),
      maximumResponseStructure:
        mediaBinding('fixtures/meaning-selection/maximum-response.json', '7'),
    },
    officialSnapshot: makeOfficialSnapshot(),
    tokenProjection: {
      probeInputTokenCount: 1_000,
      finalInputTokenCount: 1_010,
      modelOutputTokenLimit: 65_536,
      derivedMaxOutputTokens: 10_000,
      maximumValidResponseCanonicalByteLength: 512,
    },
    costProjection: {
      currency: 'USD',
      maximumNanoUsd: 500_000_000,
      preSendEstimateNanoUsd: 76_515_000,
      verdict: 'within-approved-limit',
      residualRiskDecisionLineBinding: {
        path: 'DECISIONS.md',
        lineText: decisionLine,
        lineSha256: sha256(Buffer.from(decisionLine, 'utf8')),
      },
    },
    checks: {
      sourceBinding: 'passed', visibleInput: 'passed', requestByte: 'passed',
      responseSchema: 'passed', officialSnapshot: 'passed',
      probeTokenCount: 'passed', finalTokenCount: 'passed',
      maximumResponseDiagnosis: 'passed', costLimit: 'passed',
      secretAbsence: 'passed', artifactHashGraph: 'passed',
    },
  };
  const b5ManifestBinding = jsonBinding(
    b5Manifest.schemaVersion,
    'fixtures/meaning-selection/b5-manifest.json',
    b5Manifest,
  );
  const b6JobBinding = dummyJsonBinding(
    'presentation-meaning-boundary-b6-job-v001',
    'fixtures/meaning-selection/b6-job.json',
    '8',
  );
  const rawResponseBinding = mediaBinding('fixtures/meaning-selection/raw.json', '9');
  const response = responseFactory(sourcePackage);
  const providerEnvelope = {
    schemaVersion: 'presentation-meaning-boundary-provider-response-envelope-v001',
    envelopeId:
      `presentation-meaning-boundary-provider-envelope-${b6JobBinding.fileSha256.slice(0, 32)}`,
    rawResponseBinding,
    httpStatus: 200,
    contentType: 'application/json; charset=UTF-8',
    responseModelVersion: 'gemini-3.6-flash',
    observedServiceTier: 'standard',
    usageMetadata: {
      promptTokenCount: 1_010,
      candidatesTokenCount: 50,
      thoughtsTokenCount: 25,
      totalTokenCount: 1_085,
    },
    semanticText: formalBytes(response).toString('utf8'),
  };
  const providerEnvelopeBinding = jsonBinding(
    providerEnvelope.schemaVersion,
    'fixtures/meaning-selection/provider-envelope.json',
    providerEnvelope,
  );
  const b6Manifest = {
    schemaVersion: 'presentation-meaning-boundary-b6-manifest-v001',
    manifestId:
      `presentation-meaning-boundary-b6-manifest-${b6JobBinding.fileSha256.slice(0, 32)}`,
    status: 'passed-transport',
    b6JobBinding,
    b5ManifestBinding,
    generateRequestBinding: requestBinding,
    rawResponseBinding,
    providerEnvelopeBinding,
    usageListPriceEstimate: {
      currency: 'USD', promptCostNanoUsd: 1_515_000,
      outputCostNanoUsd: 562_500, totalCostNanoUsd: 2_077_500,
      withinApprovedLimit: true, exceededPreSendEstimate: false,
      billingObservation: 'usage-metadata-list-price-estimate-invoice-not-observed',
    },
    primaryRejectionCode: null,
    transport: {
      endpoint:
        'https://generativelanguage.googleapis.com/v1beta/'
        + 'models/gemini-3.6-flash:generateContent',
      method: 'POST', clientTimeoutMilliseconds: 600_000,
      automaticRetries: 0, generateContentCalls: 1,
      authorizationHeader: '<redacted>',
    },
    checks: {
      requestByte: 'passed', rawFirst: 'passed', httpEnvelope: 'passed',
      model: 'passed', usage: 'passed', cost: 'passed',
      responseCandidateCount: 'passed', candidateContent: 'passed',
      secretAbsence: 'passed',
    },
    implementationBindings: B6_IMPLEMENTATION_BINDINGS,
  };
  const b6ManifestBinding = jsonBinding(
    b6Manifest.schemaVersion,
    'fixtures/meaning-selection/b6-manifest.json',
    b6Manifest,
  );
  const job = {
    schemaVersion: 'presentation-meaning-boundary-validation-job-v001',
    jobId: 'meaning-selection-fixture-v001',
    attemptId: 'attempt-v001',
    sourcePackageBinding,
    b6ManifestBinding,
    providerEnvelopeBinding,
    outputRoot:
      'evals/clip_composition/outputs/presentation/meaning-boundary-validations/'
      + 'meaning-selection-fixture-v001/attempt-v001',
    implementationBindings: SELECTION_IMPLEMENTATION_BINDINGS,
    approvedContractBindings: CONTRACT_BINDINGS,
  };
  return {
    sourcePackage,
    sourcePackageBinding,
    response,
    b5Manifest,
    b6Manifest,
    providerEnvelope,
    job,
    jobFileSha256: H('f'),
    rawResponseBinding,
  };
};

const copyProductionModuleGraph = async ({workspaceRoot, relativePath, copied}) => {
  if (copied.has(relativePath)) return;
  copied.add(relativePath);
  const sourcePath = path.join(REPOSITORY_ROOT, relativePath);
  const bytes = await readFile(sourcePath);
  const targetPath = path.join(workspaceRoot, relativePath);
  await mkdir(path.dirname(targetPath), {recursive: true});
  await writeFile(targetPath, bytes);
  const source = bytes.toString('utf8');
  const specifiers = new Set();
  for (const expression of [
    /\bfrom\s+['"](\.{1,2}\/[^'"]+)['"]/gu,
    /\bimport\s+['"](\.{1,2}\/[^'"]+)['"]/gu,
    /\bimport\(\s*['"](\.{1,2}\/[^'"]+)['"]\s*\)/gu,
  ]) {
    for (const match of source.matchAll(expression)) specifiers.add(match[1]);
  }
  for (const specifier of specifiers) {
    const dependency = path.relative(
      REPOSITORY_ROOT,
      path.resolve(path.dirname(sourcePath), specifier),
    ).split(path.sep).join('/');
    await copyProductionModuleGraph({workspaceRoot, relativePath: dependency, copied});
  }
};

const writeWorkspaceBytes = async (workspaceRoot, relativePath, bytes) => {
  const absolutePath = path.join(workspaceRoot, relativePath);
  await mkdir(path.dirname(absolutePath), {recursive: true});
  await writeFile(absolutePath, bytes);
};

const listWorkspaceFiles = async (workspaceRoot) => {
  const files = [];
  const visit = async (absoluteDirectory, relativeDirectory = '') => {
    const entries = await readdir(absoluteDirectory, {withFileTypes: true});
    for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name))) {
      const relativePath = relativeDirectory === ''
        ? entry.name
        : `${relativeDirectory}/${entry.name}`;
      const absolutePath = path.join(absoluteDirectory, entry.name);
      if (entry.isDirectory()) await visit(absolutePath, relativePath);
      else files.push(relativePath);
    }
  };
  await visit(workspaceRoot);
  return files;
};

const implementationBindingsFor = async (workspaceRoot, specs) => Promise.all(
  specs.map(async ({path: implementationPath, role}) => ({
    path: implementationPath,
    fileSha256: sha256(await readFile(path.join(workspaceRoot, implementationPath))),
    role,
  })),
);

const makeSelectionCliArtifactGraph = async () => {
  const workspaceRoot = await mkdtemp(path.join(os.tmpdir(), 'zev-msl-cli-v001-'));
  try {
    const apiRunnerPath =
      'evals/clip_composition/run_presentation_meaning_boundary_b5_b6_v001.mjs';
    const copied = new Set();
    await copyProductionModuleGraph({workspaceRoot, relativePath: apiRunnerPath, copied});
    await copyProductionModuleGraph({
      workspaceRoot,
      relativePath:
        'evals/clip_composition/presentation_meaning_boundary_selection_v001.mjs',
      copied,
    });
    for (const binding of CONTRACT_BINDINGS) {
      const bytes = await readFile(path.join(REPOSITORY_ROOT, binding.path));
      assert.equal(sha256(bytes), binding.fileSha256);
      await writeWorkspaceBytes(workspaceRoot, binding.path, bytes);
    }
    await writeWorkspaceBytes(
      workspaceRoot,
      SOURCE_SPEAKER_REGISTRY_PATH,
      await readFile(path.join(REPOSITORY_ROOT, SOURCE_SPEAKER_REGISTRY_PATH)),
    );

    const apiModule = await import(
      `${pathToFileURL(path.join(workspaceRoot, apiRunnerPath)).href}`
    );
    const sourcePackage = makeSourcePackage();
    const sourcePackagePath = 'fixtures/meaning-selection/cli/source-package.json';
    const sourcePackageBytes = formalBytes(sourcePackage);
    const sourcePackageBinding = jsonBinding(
      sourcePackage.schemaVersion,
      sourcePackagePath,
      sourcePackage,
    );
    await writeWorkspaceBytes(workspaceRoot, sourcePackagePath, sourcePackageBytes);

    const priorB5JobPath =
      'evals/clip_composition/jobs/presentation/caption-gate-b5-initial/'
      + 'qdczJpv8RCc-candidate-59-vertical-caption-b5-v001.json';
    const priorB5Job = JSON.parse(
      (await readFile(path.join(REPOSITORY_ROOT, priorB5JobPath))).toString('utf8'),
    );
    const b5JobId = 'msl-cli-b5-v001';
    const attemptId = 'attempt-v001';
    const officialVerification = clone(priorB5Job.officialVerification);
    for (const source of officialVerification.sources) {
      const inputBytes = await readFile(path.join(REPOSITORY_ROOT, source.snapshotPath));
      const inputPath =
        `evals/clip_composition/inputs/presentation/gemini-api-official-snapshots/`
        + `${b5JobId}/${path.basename(source.snapshotPath)}`;
      source.snapshotPath = inputPath;
      assert.equal(source.snapshotFileSha256, sha256(inputBytes));
      assert.equal(source.snapshotByteLength, inputBytes.length);
      await writeWorkspaceBytes(workspaceRoot, inputPath, inputBytes);
    }
    const b5ImplementationSpecs = [
      {role: 'meaning-source-package', path:
        'evals/clip_composition/presentation_meaning_boundary_source_package_v001.mjs'},
      {role: 'meaning-boundary-api-runner', path: apiRunnerPath},
      {role: 'strict-json-codec', path:
        'evals/clip_composition/presentation_caption_semantic_source_package_v001.mjs'},
      {role: 'api-cost-policy', path:
        'evals/clip_composition/presentation_caption_api_cost_guard_v001.mjs'},
    ];
    const b5Job = {
      schemaVersion: 'presentation-meaning-boundary-b5-job-v001',
      jobId: b5JobId,
      attemptId,
      action: 'measure-only',
      sourcePackageBinding,
      outputRoot:
        `evals/clip_composition/outputs/presentation/meaning-boundary-b5-attempts/`
        + `${b5JobId}/${attemptId}`,
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
        clientTimeoutMilliseconds: 600_000,
        automaticRetries: 0,
      },
      officialVerification,
      spendingAuthorization: {
        currency: 'USD',
        maximumNanoUsd: 500_000_000,
        inputPriceNanoUsdPerToken: officialVerification.inputPriceNanoUsdPerToken,
        outputPriceNanoUsdPerToken: officialVerification.outputPriceNanoUsdPerToken,
        status: 'approved-for-measurement',
      },
      implementationBindings: await implementationBindingsFor(
        workspaceRoot,
        b5ImplementationSpecs,
      ),
      approvedContractBindings: clone(CONTRACT_BINDINGS),
    };
    const b5JobPath =
      `evals/clip_composition/outputs/presentation/meaning-boundary-b5-jobs/`
      + `${b5JobId}.json`;
    await writeWorkspaceBytes(workspaceRoot, b5JobPath, formalBytes(b5Job));
    const b5Authorization =
      apiModule.projectPresentationMeaningBoundaryB5AuthorizationLineV001(b5Job);
    await writeWorkspaceBytes(
      workspaceRoot,
      'DECISIONS.md',
      Buffer.from(`${b5Authorization}\n`, 'utf8'),
    );
    const countResponseBytes = Buffer.from(
      '{"totalTokens":13,"promptTokensDetails":[{"modality":"TEXT","tokenCount":13}]}\n',
      'utf8',
    );
    const countFetch = async () => ({
      status: 200,
      headers: {get: name => name === 'content-type'
        ? 'application/json; charset=UTF-8' : null},
      arrayBuffer: async () => countResponseBytes,
    });
    const b5Result = await apiModule.executePresentationMeaningBoundaryB5V001({
      jobPath: b5JobPath,
      apiKey: 'msl-cli-test-key',
      fetchImplementation: countFetch,
      timeoutSignalFactory: () => Object.freeze({fixtureSignal: true}),
    });
    assert.equal(b5Result.status, 'passed');
    assert.equal(b5Result.countTokensCalls, 2);
    const b5ManifestPath = `${b5Job.outputRoot}/b5-manifest.json`;
    const b5ManifestBytes = await readFile(path.join(workspaceRoot, b5ManifestPath));
    const b5Manifest = JSON.parse(b5ManifestBytes.toString('utf8'));
    assert.equal(validatePresentationMeaningBoundaryB5ManifestV001(b5Manifest).status,
      'passed');

    const b6JobId = 'msl-cli-b6-v001';
    const b6ImplementationSpecs = [
      {role: 'meaning-boundary-api-runner', path: apiRunnerPath},
      {role: 'api-transport', path:
        'evals/clip_composition/run_presentation_caption_gate_b6_v001.mjs'},
      {role: 'api-cost-policy', path:
        'evals/clip_composition/presentation_caption_api_cost_guard_v001.mjs'},
      {role: 'strict-json-codec', path:
        'evals/clip_composition/presentation_caption_semantic_source_package_v001.mjs'},
    ];
    const b6Job = {
      schemaVersion: 'presentation-meaning-boundary-b6-job-v001',
      jobId: b6JobId,
      attemptId,
      action: 'generate-once',
      b5ManifestBinding: jsonBinding(
        b5Manifest.schemaVersion,
        b5ManifestPath,
        b5Manifest,
      ),
      generateRequestBinding: b5Manifest.generateRequestBinding,
      outputRoot:
        `evals/clip_composition/outputs/presentation/meaning-boundary-b6-attempts/`
        + `${b6JobId}/${attemptId}`,
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
        maximumNanoUsd: b5Manifest.costProjection.maximumNanoUsd,
        inputPriceNanoUsdPerToken:
          b5Manifest.officialSnapshot.inputPriceNanoUsdPerToken,
        outputPriceNanoUsdPerToken:
          b5Manifest.officialSnapshot.outputPriceNanoUsdPerToken,
        finalInputTokens: b5Manifest.tokenProjection.finalInputTokenCount,
        maxOutputTokens: b5Manifest.tokenProjection.derivedMaxOutputTokens,
        preSendEstimateNanoUsd: b5Manifest.costProjection.preSendEstimateNanoUsd,
      },
      implementationBindings: await implementationBindingsFor(
        workspaceRoot,
        b6ImplementationSpecs,
      ),
      approvedContractBindings: clone(CONTRACT_BINDINGS),
    };
    const b6Authorization =
      apiModule.projectPresentationMeaningBoundaryB6AuthorizationLineV001(b6Job);
    b6Job.sendAuthorization.decisionLineBinding = {
      path: 'DECISIONS.md',
      lineText: b6Authorization,
      lineSha256: sha256(Buffer.from(b6Authorization, 'utf8')),
    };
    await writeWorkspaceBytes(
      workspaceRoot,
      'DECISIONS.md',
      Buffer.from(`${b5Authorization}\n${b6Authorization}\n`, 'utf8'),
    );
    const b6JobPath =
      `evals/clip_composition/outputs/presentation/meaning-boundary-b6-jobs/`
      + `${b6JobId}.json`;
    await writeWorkspaceBytes(workspaceRoot, b6JobPath, formalBytes(b6Job));
    const semanticResponse = makeCompleteResponse(sourcePackage);
    const providerBytes = formalBytes({
      candidates: [{
        content: {
          role: 'model',
          parts: [{text: formalBytes(semanticResponse).toString('utf8')}],
        },
      }],
      modelVersion: officialVerification.modelId,
      usageMetadata: {
        promptTokenCount: 13,
        candidatesTokenCount: 2,
        thoughtsTokenCount: 1,
        totalTokenCount: 16,
      },
    });
    const generateFetch = async () => ({
      status: 200,
      headers: {get: name => name === 'content-type'
        ? 'application/json; charset=UTF-8' : null},
      arrayBuffer: async () => providerBytes,
    });
    const b6Result = await apiModule.executePresentationMeaningBoundaryB6V001({
      jobPath: b6JobPath,
      apiKey: 'msl-cli-test-key',
      fetchImplementation: generateFetch,
      timeoutSignalFactory: () => Object.freeze({fixtureSignal: true}),
    });
    assert.equal(b6Result.status, 'passed-transport');
    assert.equal(b6Result.generateContentCalls, 1);
    const b6ManifestPath = `${b6Job.outputRoot}/b6-manifest.json`;
    const providerEnvelopePath = `${b6Job.outputRoot}/provider-response-envelope.json`;
    const b6ManifestBytes = await readFile(path.join(workspaceRoot, b6ManifestPath));
    const providerEnvelopeBytes = await readFile(
      path.join(workspaceRoot, providerEnvelopePath),
    );
    const b6Manifest = JSON.parse(b6ManifestBytes.toString('utf8'));
    const providerEnvelope = JSON.parse(providerEnvelopeBytes.toString('utf8'));
    assert.equal(validatePresentationMeaningBoundaryB6ManifestV001(b6Manifest).status,
      'passed');

    const selectionImplementationSpecs = [
      {role: 'meaning-selection', path:
        'evals/clip_composition/presentation_meaning_boundary_selection_v001.mjs'},
      {role: 'meaning-source-package', path:
        'evals/clip_composition/presentation_meaning_boundary_source_package_v001.mjs'},
      {role: 'strict-json-codec', path:
        'evals/clip_composition/presentation_caption_semantic_source_package_v001.mjs'},
      {role: 'fatal-observation', path:
        'evals/clip_composition/presentation_fatal_observation_v002.mjs'},
    ];
    const makeSelectionJob = async ({jobId, sourceBinding}) => ({
      schemaVersion: 'presentation-meaning-boundary-validation-job-v001',
      jobId,
      attemptId,
      sourcePackageBinding: sourceBinding,
      b6ManifestBinding: jsonBinding(
        b6Manifest.schemaVersion,
        b6ManifestPath,
        b6Manifest,
      ),
      providerEnvelopeBinding: jsonBinding(
        providerEnvelope.schemaVersion,
        providerEnvelopePath,
        providerEnvelope,
      ),
      outputRoot:
        `evals/clip_composition/outputs/presentation/meaning-boundary-validations/`
        + `${jobId}/${attemptId}`,
      implementationBindings: await implementationBindingsFor(
        workspaceRoot,
        selectionImplementationSpecs,
      ),
      approvedContractBindings: clone(CONTRACT_BINDINGS),
    });
    const passedJob = await makeSelectionJob({
      jobId: 'msl-cli-passed-v001',
      sourceBinding: sourcePackageBinding,
    });
    const rejectedJob = await makeSelectionJob({
      jobId: 'msl-cli-rejected-v001',
      sourceBinding: {...sourcePackageBinding, fileSha256: H('f')},
    });
    const passedJobPath =
      `evals/clip_composition/outputs/presentation/meaning-boundary-validation-jobs/`
      + `${passedJob.jobId}.json`;
    const rejectedJobPath =
      `evals/clip_composition/outputs/presentation/meaning-boundary-validation-jobs/`
      + `${rejectedJob.jobId}.json`;
    await writeWorkspaceBytes(workspaceRoot, passedJobPath, formalBytes(passedJob));
    await writeWorkspaceBytes(workspaceRoot, rejectedJobPath, formalBytes(rejectedJob));
    return {
      workspaceRoot,
      passedJobPath,
      rejectedJobPath,
      cleanup: () => rm(workspaceRoot, {recursive: true, force: true}),
    };
  } catch (error) {
    await rm(workspaceRoot, {recursive: true, force: true});
    throw error;
  }
};

const evaluate = fixture => evaluatePresentationMeaningBoundarySelectionV001({
  job: fixture.job,
  jobFileSha256: fixture.jobFileSha256,
  sourcePackage: fixture.sourcePackage,
  b5Manifest: fixture.b5Manifest,
  b6Manifest: fixture.b6Manifest,
  providerEnvelope: fixture.providerEnvelope,
  provenanceArtifactsVerified: true,
});
const firstViolation = evaluation => evaluation.violations[0]?.code ?? null;
const observedSelectionViolationCodes = new Set();
const makeReport = (fixture, evaluation) =>
  buildPresentationMeaningBoundaryValidationReportV001({
    job: fixture.job,
    jobFileSha256: fixture.jobFileSha256,
    evaluation,
    selectionPath: `${fixture.job.outputRoot}/meaning-boundary-selection.json`,
    rawResponseBinding: fixture.rawResponseBinding,
  });

test('MSL001 complete exact union is accepted', async () => {
  const fixture = makeFixture();
  const evaluation = evaluate(fixture);
  assert.equal(evaluation.status, 'passed');
  assert.equal(validatePresentationMeaningBoundarySelectionV001(evaluation.selection), true);
  const report = makeReport(fixture, evaluation);
  assert.equal(validatePresentationMeaningBoundaryValidationReportV001(report), true);

  const cliFixture = await makeSelectionCliArtifactGraph();
  try {
    const beforeImport = await listWorkspaceFiles(cliFixture.workspaceRoot);
    await import(`${pathToFileURL(SELECTION_CLI_PATH).href}?msl-import-guard=${Date.now()}`);
    assert.deepEqual(await listWorkspaceFiles(cliFixture.workspaceRoot), beforeImport);

    const passed = spawnSync(process.execPath, [SELECTION_CLI_PATH, cliFixture.passedJobPath], {
      cwd: cliFixture.workspaceRoot,
      encoding: null,
    });
    assert.equal(passed.status, 0);
    assert.equal(passed.stderr.length, 0);
    const passedReportPath =
      'evals/clip_composition/outputs/presentation/meaning-boundary-validations/'
      + 'msl-cli-passed-v001/attempt-v001/meaning-boundary-validation-report.json';
    assert.deepEqual(passed.stdout,
      await readFile(path.join(cliFixture.workspaceRoot, passedReportPath)));
    const passedReport = JSON.parse(passed.stdout.toString('utf8'));
    assert.equal(validatePresentationMeaningBoundaryValidationReportV001(passedReport), true);
    assert.equal(passedReport.status, 'passed');

    const rejected = spawnSync(
      process.execPath,
      [SELECTION_CLI_PATH, cliFixture.rejectedJobPath],
      {cwd: cliFixture.workspaceRoot, encoding: null},
    );
    assert.equal(rejected.status, 1);
    assert.equal(rejected.stderr.length, 0);
    const rejectedReportPath =
      'evals/clip_composition/outputs/presentation/meaning-boundary-validations/'
      + 'msl-cli-rejected-v001/attempt-v001/meaning-boundary-validation-report.json';
    assert.deepEqual(rejected.stdout,
      await readFile(path.join(cliFixture.workspaceRoot, rejectedReportPath)));
    const rejectedReport = JSON.parse(rejected.stdout.toString('utf8'));
    assert.equal(validatePresentationMeaningBoundaryValidationReportV001(rejectedReport), true);
    assert.equal(rejectedReport.status, 'rejected');
    assert.equal(rejectedReport.violations[0].code,
      'MEANING_BOUNDARY_SOURCE_PACKAGE_INVALID');
  } finally {
    await cliFixture.cleanup();
  }
});

test('MSL002 abstained exact union stops as inspected abstention', () => {
  const fixture = makeFixture(() => ({status: 'abstained'}));
  const evaluation = evaluate(fixture);
  assert.equal(evaluation.status, 'abstained');
  assert.equal(firstViolation(evaluation), 'MEANING_BOUNDARY_RESPONSE_ABSTAINED');
  observedSelectionViolationCodes.add(firstViolation(evaluation));
  assert.equal(validatePresentationMeaningBoundaryValidationReportV001(
    makeReport(fixture, evaluation)), true);
});

test('MSL003 invalid response owns code 22 at response schema', () => {
  const fixture = makeFixture(() => ({status: 'complete'}));
  const evaluation = evaluate(fixture);
  assert.equal(evaluation.status, 'rejected');
  assert.equal(firstViolation(evaluation), 'MEANING_BOUNDARY_RESPONSE_SCHEMA_INVALID');
  observedSelectionViolationCodes.add(firstViolation(evaluation));
  assert.equal(evaluation.violations[0].path, '/response');
});

test('MSL004 invalid envelope owns code 9', () => {
  const fixture = makeFixture();
  fixture.b6Manifest.status = 'rejected-cost';
  fixture.b6Manifest.primaryRejectionCode = 'API_USAGE_BUDGET_VIOLATION';
  fixture.b6Manifest.checks.cost = 'failed';
  fixture.b6Manifest.usageListPriceEstimate.withinApprovedLimit = false;
  const evaluation = evaluate(fixture);
  assert.equal(firstViolation(evaluation), 'MEANING_BOUNDARY_RESPONSE_INVALID');
  observedSelectionViolationCodes.add(firstViolation(evaluation));
});

test('MSL005 container set mismatch owns code 11', () => {
  const fixture = makeFixture(sourcePackage => {
    const response = makeCompleteResponse(sourcePackage);
    response.containers.reverse();
    return response;
  });
  const code = firstViolation(evaluate(fixture));
  assert.equal(code, 'MEANING_BOUNDARY_CONTAINER_SET_MISMATCH');
  observedSelectionViolationCodes.add(code);
});

test('MSL006 unknown candidate owns code 12', () => {
  const fixture = makeFixture(sourcePackage => {
    const response = makeCompleteResponse(sourcePackage);
    response.containers[0].meaningGroups[0].meaningGroupEndBoundaryCandidateId =
      'segmenter-boundary-999999';
    return response;
  });
  const code = firstViolation(evaluate(fixture));
  assert.equal(code, 'MEANING_BOUNDARY_CANDIDATE_UNKNOWN');
  observedSelectionViolationCodes.add(code);
});

test('MSL007 non-monotonic end order owns code 13', () => {
  const fixture = makeFixture(sourcePackage => {
    const response = makeCompleteResponse(sourcePackage);
    const candidates = sourcePackage.containers[0].boundaryCandidates;
    response.containers[0].meaningGroups = [
      {meaningGroupEndBoundaryCandidateId: candidates[1].boundaryCandidateId},
      {meaningGroupEndBoundaryCandidateId: candidates[0].boundaryCandidateId},
    ];
    return response;
  });
  const code = firstViolation(evaluate(fixture));
  assert.equal(code, 'MEANING_BOUNDARY_END_ORDER_INVALID');
  observedSelectionViolationCodes.add(code);
});

test('MSL008 non-final container end owns code 14', () => {
  const fixture = makeFixture(sourcePackage => {
    const response = makeCompleteResponse(sourcePackage);
    response.containers[0].meaningGroups[0].meaningGroupEndBoundaryCandidateId =
      sourcePackage.containers[0].boundaryCandidates[0].boundaryCandidateId;
    return response;
  });
  const code = firstViolation(evaluate(fixture));
  assert.equal(code, 'MEANING_BOUNDARY_FINAL_END_MISMATCH');
  observedSelectionViolationCodes.add(code);
});

test('MSL009 discontinuous candidate coverage owns code 15', () => {
  const result = inspectPresentationMeaningBoundaryCandidateCoverageV001({
    candidateCount: 3,
    selectedOrdinalRanges: [
      {startOrdinal: 0, endOrdinal: 0},
      {startOrdinal: 2, endOrdinal: 2},
    ],
    containerIndex: 0,
  });
  assert.equal(result.status, 'rejected');
  assert.equal(result.violation.code, 'MEANING_BOUNDARY_COVERAGE_MISMATCH');
  observedSelectionViolationCodes.add(result.violation.code);
});

test('MSL010 two sources and a reused selection preserve timeline occurrences', () => {
  const fixture = makeFixture();
  const evaluation = evaluate(fixture);
  assert.equal(new Set(fixture.sourcePackage.containers.map(
    container => container.sourceMediaId)).size, 2);
  assert.equal(fixture.sourcePackage.containers.filter(
    container => container.sourceMediaId === 'source-media-000001').length, 2);
  assert.deepEqual(evaluation.captions.map(caption => caption.timelineSegmentId),
    ['segment-000001', 'segment-000002', 'segment-000003']);
  assert.notDeepEqual(evaluation.captions[0].atomRefs, evaluation.captions[2].atomRefs);
  assert.deepEqual(
    evaluation.captions.map(caption => caption.timelineSegmentId),
    fixture.sourcePackage.containers.map(container => container.timelineSegmentId),
  );
  assert.deepEqual(
    evaluation.captions.flatMap(caption => caption.atomRefs),
    fixture.sourcePackage.containers.flatMap(container =>
      container.boundaryCandidates.flatMap(candidate => candidate.atomRefs)),
  );
});

test('MSL011 caption text timing and AtomRef are mechanically restored from B3', () => {
  const fixture = makeFixture();
  const evaluation = evaluate(fixture);
  const expected = fixture.sourcePackage.containers.map((container, index) => ({
    captionId: `caption-${String(index + 1).padStart(6, '0')}`,
    ordinal: index + 1,
    timelineSegmentId: container.timelineSegmentId,
    text: container.boundaryCandidates.map(candidate => candidate.text).join(''),
    atomRefs: container.boundaryCandidates.flatMap(candidate => candidate.atomRefs),
    startAnchor: container.boundaryCandidates[0].startAnchor,
    endAnchor: container.boundaryCandidates.at(-1).endAnchor,
    sourceStartMs: container.boundaryCandidates[0].sourceStartMs,
    sourceEndMs: container.boundaryCandidates.at(-1).sourceEndMs,
  }));
  assert.deepEqual(evaluation.captions, expected);
});

test('MSL012 identical response yields byte-identical B1 report', () => {
  const fixture = makeFixture();
  const first = makeReport(fixture, evaluate(fixture));
  const second = makeReport(fixture, evaluate(fixture));
  assert.deepEqual(formalBytes(first), formalBytes(second));
});

test('MSL013 job report selection triad and three caption projections are bound', () => {
  const fixture = makeFixture();
  const evaluation = evaluate(fixture);
  const report = makeReport(fixture, evaluation);
  assert.deepEqual(evaluation.selection.sourcePackageBinding,
    fixture.job.sourcePackageBinding);
  assert.deepEqual(evaluation.selection.b6ManifestBinding,
    fixture.job.b6ManifestBinding);
  assert.deepEqual(evaluation.selection.providerEnvelopeBinding,
    fixture.job.providerEnvelopeBinding);
  assert.equal(report.selectionBinding.canonicalSha256,
    canonicalSha256(evaluation.selection));
  const expectedSelectionProjection = derivePresentationMeaningSelectionProjectionV001(
    evaluation.selection.response,
  );
  const expectedCaptionProjection = derivePresentationMeaningCaptionProjectionV001(
    evaluation.captions,
  );
  assert.deepEqual(evaluation.selectionProjection, expectedSelectionProjection);
  assert.deepEqual(evaluation.captionProjection, expectedCaptionProjection);
  assert.deepEqual(report.selectionProjection, expectedSelectionProjection);
  assert.deepEqual(report.captionProjection, expectedCaptionProjection);
  assert.deepEqual([
    evaluation.captionProjection.captionTextSequenceCanonicalSha256,
    evaluation.captionProjection.captionTimingSequenceCanonicalSha256,
    evaluation.captionProjection.captionAtomRefSequenceCanonicalSha256,
  ], [
    canonicalSha256(evaluation.captions.map(caption => ({
      captionId: caption.captionId, text: caption.text,
    }))),
    canonicalSha256(evaluation.captions.map(caption => ({
      captionId: caption.captionId,
      startAnchor: caption.startAnchor,
      endAnchor: caption.endAnchor,
      sourceStartMs: caption.sourceStartMs,
      sourceEndMs: caption.sourceEndMs,
    }))),
    canonicalSha256(evaluation.captions.map(caption => ({
      captionId: caption.captionId, atomRefs: caption.atomRefs,
    }))),
  ]);
});

test('MSL014 provider JSON accepts optional terminal LF while trim fence and repair stay rejected', () => {
  const valid = makeCompleteResponse(makeSourcePackage());
  const validWithLf = formalBytes(valid);
  const validWithoutLf = validWithLf.subarray(0, validWithLf.length - 1);
  assert.equal(validWithLf.at(-1), 0x0a);
  assert.equal(validWithoutLf.at(-1), 0x7d);
  assert.deepEqual([
    decodePresentationMeaningBoundaryResponseV001(validWithLf).status,
    decodePresentationMeaningBoundaryResponseV001(validWithoutLf).status,
  ], ['complete', 'complete']);
  const old = clone(valid);
  old.containers[0].meaningGroups[0] = {
    lineEndBoundaryCandidateId:
      old.containers[0].meaningGroups[0].meaningGroupEndBoundaryCandidateId,
  };
  const cases = [
    formalBytes(old),
    Buffer.from(`\`\`\`json\n${formalBytes(valid).toString('utf8')}\`\`\`\n`, 'utf8'),
    Buffer.from('{"status":"abstained",}\n', 'utf8'),
    Buffer.concat([Buffer.from(' ', 'utf8'), formalBytes(valid)]),
    validWithoutLf.subarray(0, validWithoutLf.length - 1),
    Buffer.concat([formalBytes(valid), Buffer.from(' ', 'utf8')]),
    Buffer.concat([validWithoutLf, Buffer.from('\n\n', 'utf8')]),
    Buffer.concat([validWithoutLf, Buffer.from('\r\n', 'utf8')]),
  ];
  assert.deepEqual(cases.map(bytes => decodePresentationMeaningBoundaryResponseV001(bytes).status),
    ['invalid', 'invalid', 'invalid', 'invalid', 'invalid', 'invalid', 'invalid', 'invalid']);
});

test('MSL015 exported 22-code set equals the three production owner sets', () => {
  assert.deepEqual(
    PRESENTATION_MEANING_BOUNDARY_SELECTION_OWNED_VIOLATION_CODES_V001.filter(
      code => observedSelectionViolationCodes.has(code),
    ),
    PRESENTATION_MEANING_BOUNDARY_SELECTION_OWNED_VIOLATION_CODES_V001,
  );
  const observed = [
    ...PRESENTATION_MEANING_BOUNDARY_SOURCE_OWNED_VIOLATION_CODES_V001,
    ...PRESENTATION_MEANING_BOUNDARY_API_OWNED_VIOLATION_CODES_V001,
    ...PRESENTATION_MEANING_BOUNDARY_SELECTION_OWNED_VIOLATION_CODES_V001,
  ];
  assert.equal(new Set(observed).size, 22);
  assert.deepEqual(
    [...PRESENTATION_MEANING_BOUNDARY_VIOLATION_CODES_V001].sort(),
    [...observed].sort(),
  );
});

test('MSL016 missing invalid B5 B6 and provider rejection stop at responseEnvelope', () => {
  for (const [kind, mutation] of [
    ['missing-b5', fixture => { fixture.b5Manifest = null; }],
    ['missing-b6', fixture => { fixture.b6Manifest = null; }],
    ['invalid-b5-schema', fixture => { delete fixture.b5Manifest.tokenProjection; }],
    ['invalid-b6-schema', fixture => { delete fixture.b6Manifest.checks; }],
    ['cost-rejection', fixture => {
      fixture.b6Manifest.status = 'rejected-cost';
      fixture.b6Manifest.primaryRejectionCode = 'API_USAGE_BUDGET_VIOLATION';
      fixture.b6Manifest.checks.cost = 'failed';
      fixture.b6Manifest.usageListPriceEstimate.withinApprovedLimit = false;
    }],
    ['provider-rejection', fixture => {
      fixture.providerEnvelope = null;
      fixture.b6Manifest.status = 'rejected-provider-response';
      fixture.b6Manifest.providerEnvelopeBinding = null;
      fixture.b6Manifest.usageListPriceEstimate = null;
      fixture.b6Manifest.primaryRejectionCode = 'HTTP_RESPONSE_UTF8_INVALID';
      fixture.b6Manifest.checks = {
        requestByte: 'passed', rawFirst: 'passed', httpEnvelope: 'failed',
        model: 'blocked', usage: 'blocked', cost: 'blocked',
        responseCandidateCount: 'blocked', candidateContent: 'blocked',
        secretAbsence: 'passed',
      };
    }],
  ]) {
    const fixture = makeFixture();
    mutation(fixture);
    if (kind === 'invalid-b5-schema') {
      assert.equal(validatePresentationMeaningBoundaryB5ManifestV001(
        fixture.b5Manifest,
      ).status, 'rejected');
    }
    if (kind === 'invalid-b6-schema') {
      assert.equal(validatePresentationMeaningBoundaryB6ManifestV001(
        fixture.b6Manifest,
      ).status, 'rejected');
    }
    if (kind === 'provider-rejection') {
      assert.equal(validatePresentationMeaningBoundaryB6ManifestV001(
        fixture.b6Manifest,
      ).status, 'passed');
    }
    assert.equal(firstViolation(evaluate(fixture)), 'MEANING_BOUNDARY_RESPONSE_INVALID');
  }
});

test('MSL017 swapped B5 source package is rejected before semantic text', () => {
  const fixture = makeFixture();
  fixture.b5Manifest.sourcePackageBinding = dummyJsonBinding(
    'presentation-meaning-boundary-source-package-v001',
    'fixtures/meaning-selection/other-source-package.json',
    'a',
  );
  assert.equal(firstViolation(evaluate(fixture)), 'MEANING_BOUNDARY_RESPONSE_INVALID');
});

test('MSL018 swapped B5 B6 generate request binding is rejected', () => {
  const fixture = makeFixture();
  fixture.b6Manifest.generateRequestBinding =
    mediaBinding('fixtures/meaning-selection/other-request.json', 'b');
  assert.equal(firstViolation(evaluate(fixture)), 'MEANING_BOUNDARY_RESPONSE_INVALID');
});

test('MSL019 swapped provider envelope raw binding is rejected', () => {
  const fixture = makeFixture();
  fixture.providerEnvelope.rawResponseBinding =
    mediaBinding('fixtures/meaning-selection/other-raw.json', 'c');
  assert.equal(firstViolation(evaluate(fixture)), 'MEANING_BOUNDARY_RESPONSE_INVALID');
});

test('MSL020 failed or blocked responseEnvelope never reports a trusted raw binding', () => {
  const failedFixture = makeFixture();
  failedFixture.b6Manifest = null;
  const failedEvaluation = evaluate(failedFixture);
  assert.equal(makeReport(failedFixture, failedEvaluation).rawResponseBinding, null);

  const blockedFixture = makeFixture();
  blockedFixture.sourcePackage = {};
  const blockedEvaluation = evaluate(blockedFixture);
  assert.equal(blockedEvaluation.checks[1].status, 'blocked');
  assert.equal(makeReport(blockedFixture, blockedEvaluation).rawResponseBinding, null);
});

test('MSL021 strict JSON invalid owns code 22 and internal postconditions are fatal', async () => {
  const fixture = makeFixture();
  fixture.providerEnvelope.semanticText =
    ` ${formalBytes(makeCompleteResponse(fixture.sourcePackage)).toString('utf8')}`;
  const evaluation = evaluate(fixture);
  assert.equal(evaluation.violations[0].code,
    'MEANING_BOUNDARY_RESPONSE_SCHEMA_INVALID');
  assert.equal(evaluation.violations[0].path, '/response');
  assert.throws(
    () => assertPresentationMeaningBoundaryAtomPostconditionV001(
      [{atomId: 'expected'}],
      [{atomId: 'observed'}],
    ),
    /atom occurrence postcondition failed/u,
  );
  assert.throws(
    () => assertPresentationMeaningBoundaryReportPostconditionV001({}),
    /report postcondition failed/u,
  );
  const missingObservation = {
    kind: 'json', state: 'missing', identity: null, bytes: null,
  };
  const invalidObservationA = {
    kind: 'json', state: 'invalid',
    identity: {dev: '1', ino: '2', size: '1', mtimeNs: '3', ctimeNs: '4',
      nlink: '1', mode: '33188'},
    bytes: Buffer.from('A', 'utf8'),
  };
  assert.equal(inspectPresentationMeaningBoundaryInputObservationStabilityV001({
    before: missingObservation,
    after: invalidObservationA,
  }).status, 'changed');
  assert.equal(inspectPresentationMeaningBoundaryInputObservationStabilityV001({
    before: invalidObservationA,
    after: {...invalidObservationA, bytes: Buffer.from('B', 'utf8')},
  }).status, 'changed');

  const formalWorkspace = await mkdtemp(path.join(os.tmpdir(), 'zev-msl-postcondition-v001-'));
  try {
    assert.throws(
      () => assertPresentationMeaningBoundaryAtomPostconditionV001(
        [{atomId: 'expected'}],
        [{atomId: 'observed'}],
      ),
      /atom occurrence postcondition failed/u,
    );
    await assert.rejects(
      readdir(path.join(formalWorkspace, 'formal-root')),
      error => error.code === 'ENOENT',
    );
    const trackedJobPath = 'tracked/job.json';
    const trackedJobBytes = Buffer.from('{"fixture":true}\n', 'utf8');
    await writeWorkspaceBytes(formalWorkspace, trackedJobPath, trackedJobBytes);
    const rereadInput = {
      workspaceRoot: formalWorkspace,
      jobPath: trackedJobPath,
      jobBytes: trackedJobBytes,
      jobBindings: [],
      inputObservations: [],
      graphSnapshots: [],
    };
    assert.deepEqual(
      await inspectPresentationMeaningBoundarySelectionInputsBeforePublicationV001(
        rereadInput,
      ),
      {status: 'passed'},
    );
    await writeWorkspaceBytes(
      formalWorkspace,
      trackedJobPath,
      Buffer.from('{"fixture":false}\n', 'utf8'),
    );
    assert.deepEqual(
      await inspectPresentationMeaningBoundarySelectionInputsBeforePublicationV001(
        rereadInput,
      ),
      {
        status: 'fatal',
        stage: 'input-read',
        fatalObservation: {
          schemaVersion: 'presentation-fatal-observation-v002',
          innerStage: 'input-read',
          targetFile: null,
          innerCode: 'FILE_CHANGED_DURING_READ',
        },
      },
    );
    await rm(path.join(formalWorkspace, trackedJobPath));
    assert.deepEqual(
      await inspectPresentationMeaningBoundarySelectionInputsBeforePublicationV001(
        rereadInput,
      ),
      {
        status: 'fatal',
        stage: 'input-read',
        fatalObservation: {
          schemaVersion: 'presentation-fatal-observation-v002',
          innerStage: 'unknown',
          targetFile: null,
          innerCode: 'UNCLASSIFIED',
        },
      },
    );
  } finally {
    await rm(formalWorkspace, {recursive: true, force: true});
  }

  const cliPath = fileURLToPath(new URL(
    './presentation_meaning_boundary_selection_v001.mjs',
    import.meta.url,
  ));
  const cliFatal = spawnSync(process.execPath, [cliPath], {encoding: null});
  assert.equal(cliFatal.status, 2);
  const fatalValue = {
    schemaVersion: 'presentation-caption-meaning-boundary-runner-fatal-v002',
    status: 'fatal',
    violations: [],
    fatalObservation: {
      schemaVersion: 'presentation-fatal-observation-v002',
      innerStage: 'unknown',
      targetFile: null,
      innerCode: 'UNCLASSIFIED',
    },
  };
  assert.deepEqual(cliFatal.stdout, formalBytes(fatalValue));
  assert.deepEqual(makePresentationMeaningBoundaryFatalCliResultV001(), {
    exitCode: 2,
    bytes: formalBytes(fatalValue),
  });
  assert.equal(PRESENTATION_MEANING_BOUNDARY_SELECTION_SCHEMA_V001,
    'presentation-meaning-boundary-selection-v001');
  assert.equal(PRESENTATION_MEANING_BOUNDARY_VALIDATION_REPORT_SCHEMA_V001,
    'presentation-caption-meaning-boundary-validation-report-v001');
});
