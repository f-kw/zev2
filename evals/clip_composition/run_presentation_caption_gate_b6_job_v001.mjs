#!/usr/bin/env node

import {
  constants,
} from 'node:fs';
import {
  lstat,
  open,
} from 'node:fs/promises';
import {dirname, resolve, sep} from 'node:path';
import process from 'node:process';
import {fileURLToPath, pathToFileURL} from 'node:url';

import {
  canonicalizePresentationCaptionB1JsonV001,
  decodePresentationCaptionB1StrictJsonV001,
  serializePresentationCaptionB1FormalJsonV001,
  sha256PresentationCaptionB1BytesV001,
} from './presentation_caption_semantic_source_package_v001.mjs';
import {
  continuePresentationCaptionGateB6ThroughB1B4V001,
  runPresentationCaptionGateB6ConfiguredFormalV001,
} from './run_presentation_caption_gate_b6_v001.mjs';

const WORKSPACE_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const JOB_ROOT =
  'evals/clip_composition/outputs/presentation/caption-gate-b6-jobs/';
const OUTPUT_ROOT =
  'evals/clip_composition/outputs/presentation/caption-gate-b6/';
const SEMANTIC_RAW_ROOT =
  'evals/clip_composition/outputs/presentation/caption-semantic-raw-outputs/';
const B1_JOB_ROOT =
  'evals/clip_composition/outputs/presentation/caption-semantic-output-check-jobs/';
const B4_JOB_ROOT =
  'evals/clip_composition/outputs/presentation/caption-display-pair-generation-jobs/';
const B4_OUTPUT_ROOT =
  'evals/clip_composition/outputs/presentation/caption-display-pairs/';
const B6_CORE_PATH =
  'evals/clip_composition/run_presentation_caption_gate_b6_v001.mjs';
const B6_JOB_RUNNER_PATH =
  'evals/clip_composition/run_presentation_caption_gate_b6_job_v001.mjs';
const SHA256_PATTERN = /^[0-9a-f]{64}$/u;
const FORMAL_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]*$/u;
const DATE_PATTERN = /^[0-9]{4}-[0-9]{2}-[0-9]{2}$/u;

class B6JobStop extends Error {
  constructor(reason, facts = {}) {
    super(reason);
    this.name = 'B6JobStop';
    this.reason = reason;
    this.facts = facts;
  }
}

const stop = (reason, facts = {}) => {
  throw new B6JobStop(reason, facts);
};

const safeFacts = (facts) => {
  if (facts === null || typeof facts !== 'object' || Array.isArray(facts)) return {};
  return Object.fromEntries(Object.entries(facts).filter(([, value]) =>
    value === null
      || typeof value === 'string'
      || typeof value === 'number'
      || typeof value === 'boolean'));
};

const formalBytes = (value) => {
  const result = serializePresentationCaptionB1FormalJsonV001(value);
  if (result?.status !== 'serialized') stop('B6_JOB_RESULT_SERIALIZATION_FAILED');
  return result.bytes;
};

const sha256 = (bytes) => {
  const result = sha256PresentationCaptionB1BytesV001(bytes);
  if (result?.status !== 'hashed') stop('B6_JOB_SHA256_FAILED');
  return result.sha256;
};

const canonicalSha256 = (value) => {
  const result = canonicalizePresentationCaptionB1JsonV001(value);
  if (result?.status !== 'canonicalized') stop('B6_JOB_CANONICAL_JSON_FAILED');
  return sha256(result.bytes);
};

const strictDecode = (bytes, reason) => {
  const result = decodePresentationCaptionB1StrictJsonV001(bytes);
  if (result?.status !== 'decoded') {
    stop(reason, {decodeReason: result?.reason ?? null});
  }
  return result.value;
};

const repositoryAbsolute = (pathValue) => {
  if (typeof pathValue !== 'string' || pathValue.length === 0) {
    stop('B6_JOB_PATH_INVALID');
  }
  const absolute = resolve(WORKSPACE_ROOT, pathValue);
  if (absolute !== `${WORKSPACE_ROOT}${sep}${pathValue}`) {
    stop('B6_JOB_PATH_INVALID', {path: pathValue});
  }
  return absolute;
};

const stableRead = async (pathValue) => {
  const absolute = repositoryAbsolute(pathValue);
  const before = await lstat(absolute, {bigint: true});
  if (!before.isFile() || before.isSymbolicLink() || before.nlink !== 1n) {
    stop('B6_JOB_INPUT_FILE_UNSAFE', {path: pathValue});
  }
  const handle = await open(absolute, constants.O_RDONLY | constants.O_NOFOLLOW);
  try {
    const opened = await handle.stat({bigint: true});
    const bytes = await handle.readFile();
    const after = await handle.stat({bigint: true});
    const projection = (stats) => [
      stats.dev,
      stats.ino,
      stats.size,
      stats.mtimeNs,
      stats.ctimeNs,
      stats.nlink,
    ].map((entry) => entry.toString());
    if (JSON.stringify(projection(before)) !== JSON.stringify(projection(opened))
      || JSON.stringify(projection(opened)) !== JSON.stringify(projection(after))
      || BigInt(bytes.length) !== after.size) {
      stop('B6_JOB_INPUT_CHANGED_DURING_READ', {path: pathValue});
    }
    return Object.freeze({
      path: pathValue,
      bytes,
      fileSha256: sha256(bytes),
    });
  } finally {
    await handle.close();
  }
};

const pathExists = async (pathValue) => {
  try {
    await lstat(repositoryAbsolute(pathValue));
    return true;
  } catch (error) {
    if (error?.code === 'ENOENT') return false;
    throw error;
  }
};

const isPlainObject = (value) =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

const exactKeys = (value, expected, reason) => {
  if (!isPlainObject(value)
    || JSON.stringify(Object.keys(value).sort())
      !== JSON.stringify([...expected].sort())) {
    stop(reason);
  }
};

const assertString = (value, reason) => {
  if (typeof value !== 'string' || value.length === 0) stop(reason);
};

const assertFormalId = (value, reason) => {
  if (typeof value !== 'string' || !FORMAL_ID_PATTERN.test(value)) stop(reason);
};

const assertSha256 = (value, reason) => {
  if (typeof value !== 'string' || !SHA256_PATTERN.test(value)) stop(reason);
};

const assertNonNegativeInteger = (value, reason) => {
  if (!Number.isSafeInteger(value) || value < 0) stop(reason);
};

const assertPositiveInteger = (value, reason) => {
  if (!Number.isSafeInteger(value) || value <= 0) stop(reason);
};

const assertBoundFile = (value, reason, {canonical = false} = {}) => {
  exactKeys(
    value,
    canonical
      ? ['path', 'fileSha256', 'canonicalSha256']
      : ['path', 'fileSha256'],
    reason,
  );
  repositoryAbsolute(value.path);
  assertSha256(value.fileSha256, reason);
  if (canonical) assertSha256(value.canonicalSha256, reason);
};

const assertRequestBinding = (value, reason) => {
  exactKeys(value, ['path', 'fileSha256', 'byteLength'], reason);
  repositoryAbsolute(value.path);
  assertSha256(value.fileSha256, reason);
  assertPositiveInteger(value.byteLength, reason);
};

const assertMeasurement = (value, reason) => {
  exactKeys(
    value,
    ['status', 'countTokensCallsInThisAttempt', 'responsePath', 'responseSha256'],
    reason,
  );
  if (value.status !== 'measured-in-this-attempt'
    || value.countTokensCallsInThisAttempt !== 1) {
    stop(reason);
  }
  repositoryAbsolute(value.responsePath);
  assertSha256(value.responseSha256, reason);
};

const safeJobPath = (value) => typeof value === 'string'
  && value.startsWith(JOB_ROOT)
  && value.endsWith('.json')
  && value.slice(JOB_ROOT.length).length > 5
  && !value.slice(JOB_ROOT.length).includes('/')
  && !value.includes('..')
  && !value.includes('\\');

const decodeBoundJson = async (binding, reason) => {
  const snapshot = await stableRead(binding.path);
  if (snapshot.fileSha256 !== binding.fileSha256) {
    stop(reason, {
      path: binding.path,
      expected: binding.fileSha256,
      observed: snapshot.fileSha256,
    });
  }
  return {
    ...snapshot,
    value: strictDecode(snapshot.bytes, reason),
  };
};

const readBoundFile = async (binding, reason) => {
  const snapshot = await stableRead(binding.path);
  if (snapshot.fileSha256 !== binding.fileSha256) {
    stop(reason, {
      path: binding.path,
      expected: binding.fileSha256,
      observed: snapshot.fileSha256,
    });
  }
  return snapshot;
};

const validateJob = (job) => {
  exactKeys(job, [
    'schemaVersion',
    'jobId',
    'mode',
    'attemptId',
    'runDirectoryId',
    'implementationBinding',
    'b5',
    'sourcePackage',
    'b4StaticTemplate',
    'publication',
  ], 'B6_JOB_SHAPE_INVALID');
  if (job.schemaVersion !== 'presentation-caption-gate-b6-execution-job-v001'
    || job.mode !== 'formal-one-shot') {
    stop('B6_JOB_SCHEMA_INVALID');
  }
  assertFormalId(job.jobId, 'B6_JOB_ID_INVALID');
  assertFormalId(job.attemptId, 'B6_JOB_ATTEMPT_ID_INVALID');
  assertFormalId(job.runDirectoryId, 'B6_JOB_RUN_DIRECTORY_ID_INVALID');

  exactKeys(
    job.implementationBinding,
    ['b6Core', 'b6JobRunner'],
    'B6_JOB_IMPLEMENTATION_BINDING_INVALID',
  );
  assertBoundFile(
    job.implementationBinding.b6Core,
    'B6_JOB_IMPLEMENTATION_BINDING_INVALID',
  );
  assertBoundFile(
    job.implementationBinding.b6JobRunner,
    'B6_JOB_IMPLEMENTATION_BINDING_INVALID',
  );
  if (job.implementationBinding.b6Core.path !== B6_CORE_PATH
    || job.implementationBinding.b6JobRunner.path !== B6_JOB_RUNNER_PATH) {
    stop('B6_JOB_IMPLEMENTATION_PATH_INVALID');
  }

  exactKeys(job.b5, ['initialManifest', 'fixedRequest'], 'B6_JOB_B5_BINDING_INVALID');
  assertBoundFile(job.b5.initialManifest, 'B6_JOB_B5_BINDING_INVALID');
  assertBoundFile(job.b5.fixedRequest, 'B6_JOB_B5_BINDING_INVALID');

  exactKeys(
    job.sourcePackage,
    ['rootPath', 'manifest', 'validationReport'],
    'B6_JOB_SOURCE_PACKAGE_BINDING_INVALID',
  );
  repositoryAbsolute(job.sourcePackage.rootPath);
  assertBoundFile(
    job.sourcePackage.manifest,
    'B6_JOB_SOURCE_PACKAGE_BINDING_INVALID',
  );
  assertBoundFile(
    job.sourcePackage.validationReport,
    'B6_JOB_SOURCE_PACKAGE_BINDING_INVALID',
  );
  if (job.sourcePackage.manifest.path
      !== `${job.sourcePackage.rootPath}/package-manifest.json`
    || job.sourcePackage.validationReport.path
      !== `${job.sourcePackage.rootPath}/package-validation-report.json`) {
    stop('B6_JOB_SOURCE_PACKAGE_PATH_RELATION_INVALID');
  }

  assertBoundFile(job.b4StaticTemplate, 'B6_JOB_B4_TEMPLATE_BINDING_INVALID');

  exactKeys(job.publication, [
    'outputRoot',
    'semanticRawPath',
    'b1JobPath',
    'b1ReportPath',
    'b4JobPath',
    'b4PairId',
    'b4OutputRoot',
    'b4RunnerOutputPath',
    'b4DisplayPlanPath',
  ], 'B6_JOB_PUBLICATION_INVALID');
  for (const [key, value] of Object.entries(job.publication)) {
    if (key === 'b4PairId') assertFormalId(value, 'B6_JOB_PUBLICATION_INVALID');
    else repositoryAbsolute(value);
  }
  if (job.publication.b4PairId !== job.attemptId
    || job.publication.outputRoot !== `${OUTPUT_ROOT}${job.runDirectoryId}`
    || job.publication.semanticRawPath
      !== `${SEMANTIC_RAW_ROOT}${job.attemptId}.json`
    || job.publication.b1JobPath !== `${B1_JOB_ROOT}${job.attemptId}.json`
    || job.publication.b1ReportPath
      !== `${job.publication.outputRoot}/semantic-output-validation-report.json`
    || job.publication.b4JobPath !== `${B4_JOB_ROOT}${job.attemptId}.json`
    || job.publication.b4OutputRoot
      !== `${B4_OUTPUT_ROOT}${job.publication.b4PairId}`
    || job.publication.b4RunnerOutputPath
      !== `${job.publication.outputRoot}/b4-runner-output.raw.json`
    || job.publication.b4DisplayPlanPath
      !== `${job.publication.b4OutputRoot}/display-plan.json`) {
    stop('B6_JOB_PUBLICATION_RELATION_INVALID');
  }
  const publicationPaths = Object.entries(job.publication)
    .filter(([key]) => key !== 'b4PairId')
    .map(([, value]) => value);
  if (new Set(publicationPaths).size !== publicationPaths.length) {
    stop('B6_JOB_PUBLICATION_PATH_DUPLICATED');
  }
};

const validateB5InitialManifest = (manifest) => {
  exactKeys(manifest, [
    'schemaVersion',
    'status',
    'stage',
    'jobBinding',
    'requestBuilderBinding',
    'upstreamProjection',
    'sourceBinding',
    'requestBindings',
    'officialVerification',
    'transport',
    'tokenDiagnosis',
    'cost',
    'artifacts',
    'checks',
    'nextStage',
  ], 'B6_JOB_B5_MANIFEST_SCHEMA_INVALID');
  if (manifest.schemaVersion !== 'presentation-caption-gate-b5-initial-manifest-v001'
    || manifest.status !== 'passed'
    || manifest.stage !== 'b5-initial-token-diagnosis-only') {
    stop('B6_JOB_B5_MANIFEST_SCHEMA_INVALID');
  }
  exactKeys(
    manifest.jobBinding,
    ['path', 'fileSha256', 'jobId'],
    'B6_JOB_B5_MANIFEST_SCHEMA_INVALID',
  );
  repositoryAbsolute(manifest.jobBinding.path);
  assertSha256(manifest.jobBinding.fileSha256, 'B6_JOB_B5_MANIFEST_SCHEMA_INVALID');
  assertFormalId(manifest.jobBinding.jobId, 'B6_JOB_B5_MANIFEST_SCHEMA_INVALID');
  assertBoundFile(
    manifest.requestBuilderBinding,
    'B6_JOB_B5_MANIFEST_SCHEMA_INVALID',
  );
  exactKeys(
    manifest.upstreamProjection,
    ['sentinelPath', 'expectedCanonicalSha256'],
    'B6_JOB_B5_MANIFEST_SCHEMA_INVALID',
  );
  repositoryAbsolute(manifest.upstreamProjection.sentinelPath);
  assertSha256(
    manifest.upstreamProjection.expectedCanonicalSha256,
    'B6_JOB_B5_MANIFEST_SCHEMA_INVALID',
  );
  exactKeys(
    manifest.sourceBinding,
    ['path', 'fileSha256', 'characterCount', 'containerCount', 'boundaryCandidateCount'],
    'B6_JOB_B5_SOURCE_BINDING_INVALID',
  );
  repositoryAbsolute(manifest.sourceBinding.path);
  assertSha256(
    manifest.sourceBinding.fileSha256,
    'B6_JOB_B5_SOURCE_BINDING_INVALID',
  );
  assertPositiveInteger(
    manifest.sourceBinding.characterCount,
    'B6_JOB_B5_SOURCE_BINDING_INVALID',
  );
  assertPositiveInteger(
    manifest.sourceBinding.containerCount,
    'B6_JOB_B5_SOURCE_BINDING_INVALID',
  );
  assertPositiveInteger(
    manifest.sourceBinding.boundaryCandidateCount,
    'B6_JOB_B5_SOURCE_BINDING_INVALID',
  );

  exactKeys(
    manifest.requestBindings,
    ['generateContent', 'inputTokenCount', 'maximumResponseTokenCount'],
    'B6_JOB_B5_REQUEST_BINDINGS_INVALID',
  );
  for (const value of Object.values(manifest.requestBindings)) {
    assertRequestBinding(value, 'B6_JOB_B5_REQUEST_BINDINGS_INVALID');
  }

  exactKeys(manifest.officialVerification, [
    'observedAt',
    'sources',
    'modelId',
    'modelResource',
    'inputLimit',
    'outputLimit',
    'tier',
    'inputPriceUsdPerMillion',
    'outputPriceUsdPerMillion',
  ], 'B6_JOB_B5_OFFICIAL_VERIFICATION_INVALID');
  if (!DATE_PATTERN.test(manifest.officialVerification.observedAt)
    || !Array.isArray(manifest.officialVerification.sources)
    || manifest.officialVerification.sources.length === 0
    || !manifest.officialVerification.sources.every(
      (value) => typeof value === 'string' && value.startsWith('https://'),
    )
    || !FORMAL_ID_PATTERN.test(manifest.officialVerification.modelId)
    || manifest.officialVerification.modelResource
      !== `models/${manifest.officialVerification.modelId}`
    || manifest.officialVerification.tier !== 'PAID_STANDARD_DEFAULT_BY_OMISSION') {
    stop('B6_JOB_B5_OFFICIAL_VERIFICATION_INVALID');
  }
  assertPositiveInteger(
    manifest.officialVerification.inputLimit,
    'B6_JOB_B5_OFFICIAL_VERIFICATION_INVALID',
  );
  assertPositiveInteger(
    manifest.officialVerification.outputLimit,
    'B6_JOB_B5_OFFICIAL_VERIFICATION_INVALID',
  );
  for (const price of [
    manifest.officialVerification.inputPriceUsdPerMillion,
    manifest.officialVerification.outputPriceUsdPerMillion,
  ]) {
    if (!/^(0|[1-9][0-9]*)\.[0-9]{2}$/u.test(price)) {
      stop('B6_JOB_B5_OFFICIAL_VERIFICATION_INVALID');
    }
  }

  exactKeys(manifest.transport, [
    'product',
    'apiVersion',
    'endpoint',
    'method',
    'headers',
    'clientTimeoutMilliseconds',
    'automaticRetries',
    'countTokensCalls',
    'generateContentCalls',
  ], 'B6_JOB_B5_TRANSPORT_INVALID');
  exactKeys(
    manifest.transport.headers,
    ['Content-Type', 'X-Server-Timeout', 'x-goog-api-key'],
    'B6_JOB_B5_TRANSPORT_INVALID',
  );
  if (manifest.transport.product !== 'Gemini Developer API'
    || manifest.transport.apiVersion !== 'v1beta'
    || manifest.transport.endpoint
      !== `https://generativelanguage.googleapis.com/v1beta/models/`
        + `${manifest.officialVerification.modelId}:countTokens`
    || manifest.transport.method !== 'POST'
    || manifest.transport.headers['Content-Type'] !== 'application/json'
    || manifest.transport.headers['X-Server-Timeout'] !== '600'
    || manifest.transport.headers['x-goog-api-key'] !== '<redacted>'
    || manifest.transport.clientTimeoutMilliseconds !== 600_000
    || manifest.transport.automaticRetries !== 0
    || manifest.transport.countTokensCalls !== 2
    || manifest.transport.generateContentCalls !== 0) {
    stop('B6_JOB_B5_TRANSPORT_INVALID');
  }

  exactKeys(manifest.tokenDiagnosis, [
    'inputTokens',
    'maximumResponseStructureTokens',
    'maximumResponseStructureWithinOfficialOutputLimit',
    'inputMeasurement',
    'maximumResponseStructureMeasurement',
  ], 'B6_JOB_B5_TOKEN_DIAGNOSIS_INVALID');
  assertNonNegativeInteger(
    manifest.tokenDiagnosis.inputTokens,
    'B6_JOB_B5_TOKEN_DIAGNOSIS_INVALID',
  );
  assertNonNegativeInteger(
    manifest.tokenDiagnosis.maximumResponseStructureTokens,
    'B6_JOB_B5_TOKEN_DIAGNOSIS_INVALID',
  );
  assertMeasurement(
    manifest.tokenDiagnosis.inputMeasurement,
    'B6_JOB_B5_TOKEN_DIAGNOSIS_INVALID',
  );
  assertMeasurement(
    manifest.tokenDiagnosis.maximumResponseStructureMeasurement,
    'B6_JOB_B5_TOKEN_DIAGNOSIS_INVALID',
  );
  if (manifest.tokenDiagnosis.maximumResponseStructureWithinOfficialOutputLimit
      !== true
    || manifest.tokenDiagnosis.inputTokens
      > manifest.officialVerification.inputLimit
    || manifest.tokenDiagnosis.maximumResponseStructureTokens
      > manifest.officialVerification.outputLimit) {
    stop('B6_JOB_B5_TOKEN_DIAGNOSIS_INVALID');
  }
  exactKeys(
    manifest.nextStage,
    ['b6AutomaticallyStarted'],
    'B6_JOB_B5_NEXT_STAGE_INVALID',
  );
  if (manifest.nextStage.b6AutomaticallyStarted !== false) {
    stop('B6_JOB_B5_NEXT_STAGE_INVALID');
  }
  if (!isPlainObject(manifest.cost)
    || !Array.isArray(manifest.artifacts)
    || manifest.artifacts.length !== 5
    || !manifest.artifacts.every((entry) => {
      try {
        assertRequestBinding(entry, 'B6_JOB_B5_ARTIFACTS_INVALID');
        return true;
      } catch {
        return false;
      }
    })
    || !Array.isArray(manifest.checks)
    || manifest.checks.length !== 10
    || !manifest.checks.every(
      (entry, index) => isPlainObject(entry)
        && entry.id === index + 1
        && entry.status === 'passed',
    )) {
    stop('B6_JOB_B5_COMPLETION_EVIDENCE_INVALID');
  }
};

const inspectInputs = async ({job, jobBinding}) => {
  const [core, runner, b5, request, packageManifest, packageReport, b4Template] =
    await Promise.all([
      readBoundFile(
        job.implementationBinding.b6Core,
        'B6_JOB_IMPLEMENTATION_BINDING_MISMATCH',
      ),
      readBoundFile(
        job.implementationBinding.b6JobRunner,
        'B6_JOB_IMPLEMENTATION_BINDING_MISMATCH',
      ),
      decodeBoundJson(job.b5.initialManifest, 'B6_JOB_B5_MANIFEST_BINDING_MISMATCH'),
      stableRead(job.b5.fixedRequest.path),
      decodeBoundJson(
        job.sourcePackage.manifest,
        'B6_JOB_SOURCE_PACKAGE_MANIFEST_BINDING_MISMATCH',
      ),
      decodeBoundJson(
        job.sourcePackage.validationReport,
        'B6_JOB_SOURCE_PACKAGE_REPORT_BINDING_MISMATCH',
      ),
      decodeBoundJson(job.b4StaticTemplate, 'B6_JOB_B4_TEMPLATE_BINDING_MISMATCH'),
    ]);
  void core;
  void runner;
  validateB5InitialManifest(b5.value);
  if (request.fileSha256 !== job.b5.fixedRequest.fileSha256
    || request.fileSha256
      !== b5.value.requestBindings.generateContent.fileSha256
    || request.path !== b5.value.requestBindings.generateContent.path
    || request.bytes.length
      !== b5.value.requestBindings.generateContent.byteLength) {
    stop('B6_JOB_FIXED_REQUEST_BINDING_MISMATCH');
  }

  const semanticSourcePath = `${job.sourcePackage.rootPath}/semantic-source-input.json`;
  if (b5.value.sourceBinding.path !== semanticSourcePath) {
    stop('B6_JOB_B5_B3_SOURCE_PATH_MISMATCH');
  }
  const semanticSource = await stableRead(semanticSourcePath);
  const semanticArtifact = packageManifest.value?.contentArtifacts?.find(
    (entry) => entry?.role === 'semanticSourceInput',
  );
  if (semanticSource.fileSha256 !== b5.value.sourceBinding.fileSha256
    || semanticArtifact?.fileName !== 'semantic-source-input.json'
    || semanticArtifact?.fileSha256 !== semanticSource.fileSha256
    || packageManifest.value?.formalOutputPath !== job.sourcePackage.rootPath
    || packageReport.value?.status !== 'passed'
    || packageReport.value?.package?.formalOutputPath !== job.sourcePackage.rootPath) {
    stop('B6_JOB_B5_B3_SOURCE_BINDING_MISMATCH');
  }
  const projection = packageReport.value?.observedProjection;
  if (projection?.sourceAtomCount !== b5.value.sourceBinding.characterCount
    || projection?.containerCount !== b5.value.sourceBinding.containerCount
    || projection?.boundaryCandidateCount
      !== b5.value.sourceBinding.boundaryCandidateCount) {
    stop('B6_JOB_B5_B3_PROJECTION_MISMATCH');
  }

  const templateSource = b4Template.value?.sourcePackageBinding;
  if (templateSource?.rootPath !== job.sourcePackage.rootPath
    || templateSource?.manifest?.path !== job.sourcePackage.manifest.path
    || templateSource?.manifest?.fileSha256 !== packageManifest.fileSha256
    || templateSource?.manifest?.canonicalSha256
      !== canonicalSha256(packageManifest.value)
    || templateSource?.validationReport?.path
      !== job.sourcePackage.validationReport.path
    || templateSource?.validationReport?.fileSha256 !== packageReport.fileSha256
    || templateSource?.validationReport?.canonicalSha256
      !== canonicalSha256(packageReport.value)) {
    stop('B6_JOB_B3_B4_SOURCE_BINDING_MISMATCH');
  }

  const outputPaths = [
    job.publication.outputRoot,
    `${job.publication.outputRoot}/generate-content-response.raw.json`,
    job.publication.semanticRawPath,
    job.publication.b1JobPath,
    job.publication.b1ReportPath,
    job.publication.b4JobPath,
    job.publication.b4OutputRoot,
    `${job.publication.b4OutputRoot}.lock`,
    `${job.publication.b4OutputRoot}.work`,
    job.publication.b4RunnerOutputPath,
    job.publication.b4DisplayPlanPath,
  ];
  for (const pathValue of outputPaths) {
    if (await pathExists(pathValue)) {
      stop('B6_JOB_OUTPUT_PATH_ALREADY_EXISTS', {path: pathValue});
    }
  }

  const modelId = b5.value.officialVerification.modelId;
  return {
    jobBinding,
    config: {
      attemptId: job.attemptId,
      requestPath: request.path,
      expectedRequestSha256: request.fileSha256,
      b5ManifestPath: b5.path,
      outputRoot: job.publication.outputRoot,
      rawResponsePath:
        `${job.publication.outputRoot}/generate-content-response.raw.json`,
      semanticRawPath: job.publication.semanticRawPath,
      b1JobPath: job.publication.b1JobPath,
      b1ReportPath: job.publication.b1ReportPath,
      b4JobPath: job.publication.b4JobPath,
      b4PairId: job.publication.b4PairId,
      b4OutputRoot: job.publication.b4OutputRoot,
      b4RunnerOutputPath: job.publication.b4RunnerOutputPath,
      b4DisplayPlanPath: job.publication.b4DisplayPlanPath,
      b4StaticTemplatePath: b4Template.path,
      sourcePackageRoot: job.sourcePackage.rootPath,
      modelId,
      endpoint:
        `https://generativelanguage.googleapis.com/v1beta/models/${modelId}`
        + ':generateContent',
      inputPriceUsdPerMillion:
        b5.value.officialVerification.inputPriceUsdPerMillion,
      outputPriceUsdPerMillion:
        b5.value.officialVerification.outputPriceUsdPerMillion,
    },
  };
};

export async function runPresentationCaptionGateB6JobV001(
  jobPath,
  {
    apiKey = process.env.GEMINI_API_KEY,
    fetchImplementation = globalThis.fetch,
    timeoutSignalFactory = (milliseconds) => AbortSignal.timeout(milliseconds),
    continuePipeline = continuePresentationCaptionGateB6ThroughB1B4V001,
    currentDate = new Date(),
  } = {},
) {
  let jobBinding = null;
  try {
    if (!safeJobPath(jobPath)) stop('B6_JOB_PATH_NOT_ALLOWED');
    const jobSnapshot = await stableRead(jobPath);
    jobBinding = {
      path: jobPath,
      fileSha256: jobSnapshot.fileSha256,
    };
    const job = strictDecode(jobSnapshot.bytes, 'B6_JOB_JSON_INVALID');
    validateJob(job);
    const inspected = await inspectInputs({job, jobBinding});
    const result = await runPresentationCaptionGateB6ConfiguredFormalV001({
      config: inspected.config,
      apiKey,
      fetchImplementation,
      timeoutSignalFactory,
      continuePipeline,
      currentDate,
    });
    return {
      schemaVersion: 'presentation-caption-gate-b6-job-result-v001',
      status: result.status,
      jobBinding,
      b6Result: result,
    };
  } catch (error) {
    return {
      schemaVersion: 'presentation-caption-gate-b6-job-result-v001',
      status: 'stopped',
      jobBinding,
      b6Result: {
        status: 'stopped',
        reason: error instanceof B6JobStop
          ? error.reason
          : 'B6_JOB_INTERNAL_FAILURE',
        facts: error instanceof B6JobStop ? safeFacts(error.facts) : {},
        generateContentCalls: 0,
        automaticRetries: 0,
        manifestBinding: null,
      },
    };
  }
}

const main = async () => {
  const result = await runPresentationCaptionGateB6JobV001(process.argv[2]);
  process.stdout.write(formalBytes(result));
  process.exitCode = result.status === 'display-plan-ready' ? 0 : 1;
};

if (typeof process.argv[1] === 'string'
  && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(() => {
    process.stdout.write(formalBytes({
      schemaVersion: 'presentation-caption-gate-b6-job-result-v001',
      status: 'stopped',
      jobBinding: null,
      b6Result: {
        status: 'stopped',
        reason: 'B6_JOB_FATAL_REPORT_UNAVAILABLE',
        generateContentCalls: 0,
        automaticRetries: 0,
        manifestBinding: null,
      },
    }));
    process.exitCode = 2;
  });
}
