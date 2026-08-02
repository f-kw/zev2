#!/usr/bin/env node

import {constants} from 'node:fs';
import {
  lstat,
  mkdir,
  open,
  readFile,
  realpath,
  rename,
  rm,
} from 'node:fs/promises';
import {dirname, resolve, sep} from 'node:path';
import process from 'node:process';
import {fileURLToPath, pathToFileURL} from 'node:url';

import {
  buildPresentationCaptionGateB5BoundRequestV002,
} from './run_presentation_caption_gate_b5_v004.mjs';
import {
  PRESENTATION_CAPTION_API_COST_POLICY_V001,
  buildPresentationCaptionCountTokensRequestV001,
  derivePresentationCaptionPreSendCostV001,
  parsePresentationCaptionCountTokensResponseV001,
  presentationCaptionApiBytesContainSecretV001,
  validatePresentationCaptionApiOfficialVerificationV001,
  validatePresentationCaptionResidualRiskAcceptanceV001,
} from './presentation_caption_api_cost_guard_v001.mjs';
import {
  buildPresentationCaptionSemanticSourcePackageV001,
  canonicalizePresentationCaptionB1JsonV001,
  decodePresentationCaptionB1StrictJsonV001,
  serializePresentationCaptionB1FormalJsonV001,
  sha256PresentationCaptionB1BytesV001,
} from './presentation_caption_semantic_source_package_v001.mjs';
import {
  inspectPresentationCaptionDisplayPairStaticPreflightProjectionV001,
} from './run_presentation_caption_display_pair_static_preflight_v001.mjs';

const WORKSPACE_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const JOB_SCHEMA = 'presentation-caption-gate-b5-initial-job-v002';
const OUTPUT_ROOT =
  'evals/clip_composition/outputs/presentation/caption-gate-b5';
const WORK_ROOT =
  'evals/clip_composition/outputs/presentation-caption-gate-b5-work';
const WATCHED_ROOT =
  'evals/clip_composition/outputs/presentation';
const SNAPSHOT_ROOT =
  'evals/clip_composition/inputs/presentation/gemini-api-official-snapshots';
const JOB_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/u;
const SHA_PATTERN = /^[0-9a-f]{64}$/u;

const CLOSURE = Object.freeze([
  ['sharedBuilder', 'evals/clip_composition/run_presentation_caption_gate_b5_v004.mjs'],
  ['sourcePackageCore', 'evals/clip_composition/presentation_caption_semantic_source_package_v001.mjs'],
  ['textLayoutImplementation', 'evals/clip_composition/presentation_renderer_text_layout_v001.mjs'],
  ['gateACore', 'evals/clip_composition/presentation_segmenter_boundary_evidence_v001.mjs'],
  ['gateARetainedSourceAtomsCore', 'evals/clip_composition/presentation_retained_source_atoms_v001.mjs'],
  ['gateARunner', 'evals/clip_composition/run_presentation_segmenter_boundary_preflight_v001.mjs'],
  ['staticPreflightRunner', 'evals/clip_composition/run_presentation_caption_display_pair_static_preflight_v001.mjs'],
  ['displayPairCoreV003', 'evals/clip_composition/presentation_caption_display_pair_v003.mjs'],
  ['semanticCore', 'evals/clip_composition/presentation_caption_semantic_output_v001.mjs'],
  ['instructionCoreV003', 'evals/clip_composition/presentation_instruction_contract_v003.mjs'],
  ['captionCoreV003', 'evals/clip_composition/presentation_caption_contract_v003.mjs'],
  ['timelineV002', 'evals/clip_composition/presentation_base_media_timeline_v002.mjs'],
  ['sourceSpeakerPolicy', 'evals/clip_composition/presentation_source_speaker_policy_v001.mjs'],
  ['sourceSpeakerRegistry', 'evals/clip_composition/registries/presentation/presentation-source-speaker-non-identity-registry-v001/registry.json'],
  ['apiCostGuard', 'evals/clip_composition/presentation_caption_api_cost_guard_v001.mjs'],
]);

const SOURCE_FILES = Object.freeze([
  ['pricing', 'pricing.snapshot.html'],
  ['tokens-guide', 'tokens-guide.snapshot.html'],
  ['count-tokens-api', 'count-tokens-api.snapshot.html'],
  ['billing', 'billing.snapshot.html'],
  ['thinking', 'thinking.snapshot.html'],
  ['latest-model', 'latest-model.snapshot.html'],
]);
const CHECK_KEYS = Object.freeze([
  'sourceBinding',
  'officialEvidence',
  'requestConstruction',
  'candidateCount',
  'tokenProbe',
  'finalRequest',
  'budget',
  'transport',
  'secret',
  'artifacts',
]);
const WORK_ARTIFACT_FILES = Object.freeze([
  ...SOURCE_FILES.map(([sourceId, basename]) => [
    `official-snapshot-${sourceId}`,
    `official/${basename}`,
  ]),
  ['probe-count-tokens-request', 'probe-count-tokens-request.json'],
  ['probe-count-tokens-response-raw', 'probe-count-tokens-response.raw.json'],
  ['final-count-tokens-request', 'final-count-tokens-request.json'],
  ['final-count-tokens-response-raw', 'final-count-tokens-response.raw.json'],
  ['maximum-response-structure', 'maximum-response-structure.json'],
  ['generate-content-request', 'generate-content-request.json'],
]);

class Stop extends Error {
  constructor(code, path = '$') {
    super(code);
    this.code = code;
    this.path = path;
  }
}
const stop = (code, path) => {
  throw new Stop(code, path);
};
const exactKeys = (value, keys) =>
  value !== null
  && typeof value === 'object'
  && !Array.isArray(value)
  && JSON.stringify(Object.keys(value)) === JSON.stringify(keys);
const formalBytes = (value) => {
  const result = serializePresentationCaptionB1FormalJsonV001(value);
  if (result?.status !== 'serialized') stop('API_BUDGET_BINDING_INVALID');
  return result.bytes;
};
const sha256 = (bytes) => {
  const result = sha256PresentationCaptionB1BytesV001(bytes);
  if (result?.status !== 'hashed') stop('API_BUDGET_BINDING_INVALID');
  return result.sha256;
};
const canonicalSha256 = (value) => {
  const result = canonicalizePresentationCaptionB1JsonV001(value);
  if (result?.status !== 'canonicalized') stop('API_BUDGET_BINDING_INVALID');
  return sha256(result.bytes);
};
const strictDecode = (bytes) => {
  const result = decodePresentationCaptionB1StrictJsonV001(bytes);
  if (result?.status !== 'decoded') stop('API_BUDGET_BINDING_INVALID');
  return result.value;
};
const absolute = (path) => {
  const value = resolve(WORKSPACE_ROOT, path);
  if (value !== `${WORKSPACE_ROOT}${sep}${path}`) {
    stop('API_BUDGET_BINDING_INVALID', path);
  }
  return value;
};
const exists = async (path) => {
  try {
    await lstat(absolute(path));
    return true;
  } catch (error) {
    if (error?.code === 'ENOENT') return false;
    throw error;
  }
};
const assertWorkTopology = async (outputDirectory) => {
  await mkdir(absolute(WORK_ROOT), {recursive: true});
  const formalParent = dirname(outputDirectory);
  const [
    workRootStats,
    formalParentStats,
    watchedRootStats,
    workRootRealPath,
    formalParentRealPath,
    watchedRootRealPath,
  ] = await Promise.all([
    lstat(absolute(WORK_ROOT)),
    lstat(absolute(formalParent)),
    lstat(absolute(WATCHED_ROOT)),
    realpath(absolute(WORK_ROOT)),
    realpath(absolute(formalParent)),
    realpath(absolute(WATCHED_ROOT)),
  ]);
  if (!workRootStats.isDirectory()
    || workRootStats.isSymbolicLink()
    || !formalParentStats.isDirectory()
    || formalParentStats.isSymbolicLink()
    || !watchedRootStats.isDirectory()
    || watchedRootStats.isSymbolicLink()
    || workRootRealPath !== absolute(WORK_ROOT)
    || formalParentRealPath !== absolute(formalParent)
    || watchedRootRealPath !== absolute(WATCHED_ROOT)
    || workRootRealPath === watchedRootRealPath
    || workRootRealPath.startsWith(`${watchedRootRealPath}${sep}`)
    || workRootStats.dev !== formalParentStats.dev) {
    stop('API_BUDGET_BINDING_INVALID', '$.outputDirectory');
  }
};
const publishWorkDirectory = async ({workDirectory, outputDirectory}) => {
  const formalParent = dirname(outputDirectory);
  const [
    workStats,
    formalParentStats,
    workRealPath,
    formalParentRealPath,
  ] = await Promise.all([
    lstat(absolute(workDirectory)),
    lstat(absolute(formalParent)),
    realpath(absolute(workDirectory)),
    realpath(absolute(formalParent)),
  ]);
  if (!workStats.isDirectory()
    || workStats.isSymbolicLink()
    || !formalParentStats.isDirectory()
    || formalParentStats.isSymbolicLink()
    || workRealPath !== absolute(workDirectory)
    || formalParentRealPath !== absolute(formalParent)
    || workStats.dev !== formalParentStats.dev
    || await exists(outputDirectory)) {
    stop('API_BUDGET_BINDING_INVALID', '$.outputDirectory');
  }
  await rename(absolute(workDirectory), absolute(outputDirectory));
  const outputStats = await lstat(absolute(outputDirectory));
  if (await exists(workDirectory)
    || !outputStats.isDirectory()
    || outputStats.isSymbolicLink()) {
    stop('API_BUDGET_BINDING_INVALID', '$.outputDirectory');
  }
};
const readStable = async (path) => {
  const pathValue = absolute(path);
  const before = await lstat(pathValue, {bigint: true});
  if (!before.isFile() || before.isSymbolicLink() || before.nlink !== 1n) {
    stop('API_BUDGET_BINDING_INVALID', path);
  }
  const handle = await open(pathValue, constants.O_RDONLY | constants.O_NOFOLLOW);
  try {
    const opened = await handle.stat({bigint: true});
    const bytes = await handle.readFile();
    const after = await handle.stat({bigint: true});
    const projection = (item) => [
      item.dev, item.ino, item.size, item.mtimeNs, item.ctimeNs, item.nlink,
    ].map(String).join(':');
    if (projection(before) !== projection(opened)
      || projection(opened) !== projection(after)
      || BigInt(bytes.length) !== after.size) {
      stop('API_BUDGET_BINDING_INVALID', path);
    }
    return {path, bytes, fileSha256: sha256(bytes)};
  } finally {
    await handle.close();
  }
};
const assertSnapshotBinding = async ({path, fileSha256}) => {
  const snapshot = await readStable(path);
  if (snapshot.fileSha256 !== fileSha256) {
    stop('API_BUDGET_BINDING_INVALID', path);
  }
  return snapshot;
};
const assertRequestBuilderGraph = async (job) => {
  const entry = await assertSnapshotBinding(
    job.requestBuilderBinding.entry,
  );
  const closureSnapshots = await Promise.all(
    job.requestBuilderBinding.localImportClosure.map(
      (bindingValue) => assertSnapshotBinding(bindingValue),
    ),
  );
  const implementationInputs = [{
    path: entry.path,
    bytes: entry.bytes,
  }];
  const dataBindingPaths = [];
  for (let index = 0; index < closureSnapshots.length; index += 1) {
    const snapshot = closureSnapshots[index];
    const path = job.requestBuilderBinding.localImportClosure[index].path;
    if (path.endsWith('.json')) dataBindingPaths.push(path);
    else implementationInputs.push({path, bytes: snapshot.bytes});
  }
  const graphValidator =
    buildPresentationCaptionSemanticSourcePackageV001
      .validatePresentationCaptionApiStaticImportGraphV001;
  if (typeof graphValidator !== 'function') {
    stop(
      'API_BUDGET_BINDING_INVALID',
      '$.requestBuilderBinding.graphValidator',
    );
  }
  const graph = graphValidator({
    entryPath: entry.path,
    implementationInputs,
    dataBindingPaths,
  });
  if (graph.status !== 'passed') {
    stop(
      graph.code,
      graph.relatedPaths?.[0] ?? '$.requestBuilderBinding',
    );
  }
};
const assertCommitBindings = async ({
  jobPath,
  context,
  workDirectory,
  inspectUpstreamProjection,
}) => {
  await assertSnapshotBinding({
    path: jobPath,
    fileSha256: context.jobSnapshot.fileSha256,
  });
  if (context.sourceBindingValidated) {
    await Promise.all([
      assertSnapshotBinding({
        path: context.job.sourceBinding.path,
        fileSha256: context.job.sourceBinding.fileSha256,
      }),
      assertSnapshotBinding({
        path: context.job.sourceBinding.packageManifestPath,
        fileSha256:
          context.job.sourceBinding.packageManifestFileSha256,
      }),
    ]);
  }
  if (context.requestBuilderBindingValidated) {
    await assertRequestBuilderGraph(context.job);
  }
  for (let index = 0; index < SOURCE_FILES.length; index += 1) {
    const [, basename] = SOURCE_FILES[index];
    const inputBinding = context.job.officialVerification.sources[index];
    const [input, copied] = await Promise.all([
      assertSnapshotBinding({
        path: inputBinding.snapshotPath,
        fileSha256: inputBinding.snapshotFileSha256,
      }),
      assertSnapshotBinding({
        path: `${workDirectory}/official/${basename}`,
        fileSha256: inputBinding.snapshotFileSha256,
      }),
    ]);
    if (input.bytes.length !== inputBinding.snapshotByteLength
      || !input.bytes.equals(copied.bytes)) {
      stop('API_BUDGET_BINDING_INVALID', inputBinding.snapshotPath);
    }
  }
  if (context.upstreamProjectionValidated) {
    const projection = await inspectUpstreamProjection(
      context.job.upstreamProjection.sentinelPath,
    );
    if (projection?.expectedBeforeCanonicalSha256
      !== context.job.upstreamProjection.expectedCanonicalSha256) {
      stop('API_BUDGET_BINDING_INVALID', '$.upstreamProjection');
    }
  }
};
const writeExclusive = async (path, bytes) => {
  await mkdir(dirname(absolute(path)), {recursive: true});
  const handle = await open(absolute(path), 'wx', 0o600);
  try {
    await handle.writeFile(bytes);
    await handle.sync();
  } finally {
    await handle.close();
  }
  if (!(await readFile(absolute(path))).equals(bytes)) {
    stop('API_BUDGET_BINDING_INVALID', path);
  }
};
const artifact = (role, path, bytes) => ({
  role,
  path,
  fileSha256: sha256(bytes),
  byteLength: bytes.length,
});
const dateInTokyo = (date) => {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const values = Object.fromEntries(
    parts.map(({type, value}) => [type, value]),
  );
  return `${values.year}-${values.month}-${values.day}`;
};

const validateJob = (job) => {
  if (!exactKeys(job, [
    'schemaVersion',
    'jobId',
    'sourceBinding',
    'requestBuilderBinding',
    'upstreamProjection',
    'outputDirectory',
    'officialVerification',
    'residualRiskAcceptance',
    'budgetPolicy',
  ])
    || job.schemaVersion !== JOB_SCHEMA
    || !JOB_ID_PATTERN.test(job.jobId)
    || job.outputDirectory !== `${OUTPUT_ROOT}/${job.jobId}`
    || !exactKeys(job.sourceBinding, [
      'path',
      'fileSha256',
      'canonicalSha256',
      'packageManifestPath',
      'packageManifestFileSha256',
      'packageManifestCanonicalSha256',
      'characterCount',
      'containerCount',
      'boundaryCandidateCount',
    ])
    || !exactKeys(job.requestBuilderBinding, ['entry', 'localImportClosure'])
    || !exactKeys(job.requestBuilderBinding.entry, ['path', 'fileSha256'])
    || job.requestBuilderBinding.entry?.path
      !== 'evals/clip_composition/run_presentation_caption_gate_b5_initial_v002.mjs'
    || !SHA_PATTERN.test(job.requestBuilderBinding.entry.fileSha256 ?? '')
    || !Array.isArray(job.requestBuilderBinding.localImportClosure)
    || job.requestBuilderBinding.localImportClosure.some(
      (entry) => !exactKeys(entry, ['role', 'path', 'fileSha256'])
        || !SHA_PATTERN.test(entry.fileSha256 ?? ''),
    )
    || JSON.stringify(job.requestBuilderBinding.localImportClosure.map(
      ({role, path}) => [role, path],
    )) !== JSON.stringify(CLOSURE)
    || !exactKeys(job.upstreamProjection, [
      'sentinelPath',
      'expectedCanonicalSha256',
    ])
    || !exactKeys(job.budgetPolicy, [
      'currency',
      'maximumNanoUsd',
      'chargeScope',
      'countTokensCalls',
      'generateContentCalls',
      'automaticRetries',
      'timeoutMilliseconds',
    ])) {
    stop('API_BUDGET_BINDING_INVALID', '$.job');
  }
  const policy = PRESENTATION_CAPTION_API_COST_POLICY_V001;
  if (job.budgetPolicy.currency !== 'USD'
    || job.budgetPolicy.maximumNanoUsd !== policy.maximumNanoUsd
    || job.budgetPolicy.countTokensCalls !== 2
    || job.budgetPolicy.generateContentCalls !== 1
    || job.budgetPolicy.automaticRetries !== 0
    || job.budgetPolicy.timeoutMilliseconds !== policy.timeoutMilliseconds) {
    stop('API_BUDGET_BINDING_INVALID', '$.budgetPolicy');
  }
};

const collectFormalArtifacts = async ({workDirectory, outputDirectory}) => {
  const values = [];
  for (const [role, relativePath] of WORK_ARTIFACT_FILES) {
    const workPath = `${workDirectory}/${relativePath}`;
    if (!(await exists(workPath))) continue;
    const snapshot = await readStable(workPath);
    values.push(artifact(
      role,
      `${outputDirectory}/${relativePath}`,
      snapshot.bytes,
    ));
  }
  return values;
};

const buildChecks = ({
  officialEvidence = 'passed',
  failedKey,
}) => {
  let failed = false;
  return Object.fromEntries(CHECK_KEYS.map((key) => {
    if (key === 'officialEvidence') {
      if (officialEvidence === 'failed') failed = true;
      return [key, officialEvidence];
    }
    if (failed) return [key, 'blocked'];
    if (key === failedKey) {
      failed = true;
      return [key, 'failed'];
    }
    return [key, 'passed'];
  }));
};

const failedCheckFor = (code, relatedPath) => {
  if (code === 'API_MODEL_OR_PRICE_UNVERIFIED') return 'officialEvidence';
  if ([
    'API_COUNT_TOKENS_BILLING_RISK_ACCEPTANCE_INVALID',
    'API_PROMPT_TOKEN_BOUND_RISK_ACCEPTANCE_INVALID',
    'API_OUTPUT_TOKEN_BOUND_RISK_ACCEPTANCE_INVALID',
    'API_BUDGET_EXCEEDED_BEFORE_SEND',
  ].includes(code)) return 'budget';
  if (code === 'API_COST_PROBE_INVALID') return 'tokenProbe';
  if (code === 'API_BUDGET_REQUEST_MISMATCH') return 'finalRequest';
  if (code === 'API_TRANSPORT_CONTRACT_VIOLATION') return 'transport';
  if (code === 'SECRET_LEAK_DETECTED') return 'secret';
  if (typeof relatedPath === 'string'
    && relatedPath.startsWith('$.sourceBinding')) return 'sourceBinding';
  return 'artifacts';
};

const measurementStageFor = ({code, calls}) => {
  if (calls === 0) return 'pre-measurement';
  if (calls === 1 && code === 'API_BUDGET_EXCEEDED_BEFORE_SEND') {
    return 'probe-budget';
  }
  if (calls === 1) return 'probe-response';
  if (code === 'API_BUDGET_EXCEEDED_BEFORE_SEND') return 'final-budget';
  return 'final-response';
};

const performCount = async ({
  apiKey,
  requestBytes,
  requestPath,
  rawPath,
  fetchImplementation,
}) => {
  if (presentationCaptionApiBytesContainSecretV001(requestBytes, apiKey)) {
    stop('SECRET_LEAK_DETECTED', requestPath);
  }
  await writeExclusive(requestPath, requestBytes);
  let response;
  try {
    response = await fetchImplementation(
      PRESENTATION_CAPTION_API_COST_POLICY_V001.countTokensEndpoint,
      {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-goog-api-key': apiKey,
        },
        body: requestBytes,
        redirect: 'error',
        signal: AbortSignal.timeout(600000),
      },
    );
  } catch {
    stop('API_COST_PROBE_INVALID', rawPath);
  }
  const rawBytes = Buffer.from(await response.arrayBuffer());
  if (presentationCaptionApiBytesContainSecretV001(rawBytes, apiKey)) {
    stop('SECRET_LEAK_DETECTED', rawPath);
  }
  await writeExclusive(rawPath, rawBytes);
  const parsed = parsePresentationCaptionCountTokensResponseV001({
    rawBytes,
    httpStatus: response.status,
    contentType: response.headers.get('content-type'),
  });
  if (parsed.status !== 'passed') stop(parsed.code, rawPath);
  return {rawBytes, totalTokens: parsed.totalTokens};
};

export async function executePresentationCaptionGateB5InitialV002({
  jobPath,
  apiKey = process.env.GEMINI_API_KEY,
  fetchImplementation = globalThis.fetch,
  inspectUpstreamProjection =
    inspectPresentationCaptionDisplayPairStaticPreflightProjectionV001,
  currentDate = new Date(),
}) {
  let calls = 0;
  let workDirectory = null;
  let workOwned = false;
  let context = null;
  let probeInputTokens = null;
  let finalInputTokens = null;
  let derivedMaxOutputTokens = null;
  let preSendEstimateNanoUsd = null;
  try {
    const jobSnapshot = await readStable(jobPath);
    const job = strictDecode(jobSnapshot.bytes);
    validateJob(job);
    if (await exists(job.outputDirectory)) {
      stop('API_BUDGET_BINDING_INVALID', '$.outputDirectory');
    }
    await assertWorkTopology(job.outputDirectory);
    workDirectory = `${WORK_ROOT}/${job.jobId}`;
    if (await exists(workDirectory)) {
      stop('API_BUDGET_BINDING_INVALID', '$.outputDirectory');
    }
    await mkdir(absolute(workDirectory), {recursive: false});
    workOwned = true;
    const copiedSources = [];
    for (let index = 0; index < SOURCE_FILES.length; index += 1) {
      const [sourceId, basename] = SOURCE_FILES[index];
      const binding = job.officialVerification?.sources?.[index];
      if (binding?.sourceId !== sourceId
        || binding.snapshotPath !== `${SNAPSHOT_ROOT}/${job.jobId}/${basename}`) {
        stop(
          'API_BUDGET_BINDING_INVALID',
          `$.officialVerification.sources[${index}]`,
        );
      }
      const snapshot = await readStable(binding.snapshotPath);
      if (snapshot.fileSha256 !== binding.snapshotFileSha256
        || snapshot.bytes.length !== binding.snapshotByteLength) {
        stop('API_BUDGET_BINDING_INVALID', binding.snapshotPath);
      }
      const outputPath = `${workDirectory}/official/${basename}`;
      await writeExclusive(outputPath, snapshot.bytes);
      copiedSources.push({
        ...binding,
        snapshotPath: `${job.outputDirectory}/official/${basename}`,
      });
    }
    const officialVerification = {
      ...job.officialVerification,
      sources: copiedSources,
    };
    context = {
      job,
      jobSnapshot,
      officialVerification,
      executionStartedAt: currentDate.toISOString(),
      sourceBindingValidated: false,
      requestBuilderBindingValidated: false,
      upstreamProjectionValidated: false,
    };
    const verification =
      validatePresentationCaptionApiOfficialVerificationV001(
        job.officialVerification,
      );
    if (verification.status !== 'passed') stop(
      verification.code,
      verification.relatedPaths?.[0] ?? '$.officialVerification',
    );
    const acceptance = validatePresentationCaptionResidualRiskAcceptanceV001({
      acceptance: job.residualRiskAcceptance,
      officialVerification: job.officialVerification,
    });
    if (acceptance.status !== 'passed') stop(
      acceptance.code,
      acceptance.relatedPaths?.[0] ?? '$.residualRiskAcceptance',
    );
    const executionDate = dateInTokyo(currentDate);
    if (job.officialVerification.sources.some(
      (source) => dateInTokyo(new Date(source.observedAt)) !== executionDate,
    )
      || dateInTokyo(new Date(job.officialVerification.observedAt))
        !== executionDate) {
      stop('API_MODEL_OR_PRICE_UNVERIFIED', '$.officialVerification.observedAt');
    }
    if (typeof apiKey !== 'string' || apiKey.length === 0
      || typeof fetchImplementation !== 'function') {
      stop('API_TRANSPORT_CONTRACT_VIOLATION');
    }
    const [sourceSnapshot, packageSnapshot] = await Promise.all([
      readStable(job.sourceBinding.path),
      readStable(job.sourceBinding.packageManifestPath),
    ]);
    const source = strictDecode(sourceSnapshot.bytes);
    const packageManifest = strictDecode(packageSnapshot.bytes);
    if (sourceSnapshot.fileSha256 !== job.sourceBinding.fileSha256
      || canonicalSha256(source) !== job.sourceBinding.canonicalSha256
      || packageSnapshot.fileSha256
        !== job.sourceBinding.packageManifestFileSha256
      || canonicalSha256(packageManifest)
        !== job.sourceBinding.packageManifestCanonicalSha256) {
      stop('API_BUDGET_BINDING_INVALID', '$.sourceBinding');
    }
    context.sourceBindingValidated = true;
    if (!exactKeys(source.displayConstraints, [
      'maxLogicalWidthPerLine',
      'maxLinesPerMeaningGroup',
    ])
      || !exactKeys(packageManifest.displayConstraintInput, [
        'maxLogicalWidthPerLine',
        'maxLinesPerMeaningGroup',
        'characterWidthRule',
      ])
      || source.displayConstraints.maxLogicalWidthPerLine
        !== packageManifest.displayConstraintInput.maxLogicalWidthPerLine
      || source.displayConstraints.maxLinesPerMeaningGroup
        !== packageManifest.displayConstraintInput.maxLinesPerMeaningGroup) {
      stop('API_BUDGET_BINDING_INVALID', '$.sourceBinding.displayConstraintInput');
    }
    await assertRequestBuilderGraph(job);
    context.requestBuilderBindingValidated = true;
    const projection = await inspectUpstreamProjection(
      job.upstreamProjection.sentinelPath,
    );
    if (projection?.kind !== 'trusted-projection'
      || projection.expectedBeforeCanonicalSha256
        !== job.upstreamProjection.expectedCanonicalSha256) {
      stop('API_BUDGET_BINDING_INVALID', '$.upstreamProjection');
    }
    context.upstreamProjectionValidated = true;
    const artifacts = [];
    for (const [sourceId, basename] of SOURCE_FILES) {
      const outputPath = `${workDirectory}/official/${basename}`;
      const snapshot = await readStable(outputPath);
      artifacts.push(artifact(
        `official-snapshot-${sourceId}`,
        outputPath,
        snapshot.bytes,
      ));
    }
    const config = {
      expectedSourceSha256: sourceSnapshot.fileSha256,
      expectedCharacterCount: job.sourceBinding.characterCount,
      expectedContainerCount: job.sourceBinding.containerCount,
      expectedBoundaryCandidateCount: job.sourceBinding.boundaryCandidateCount,
      modelId: PRESENTATION_CAPTION_API_COST_POLICY_V001.modelId,
      officialOutputLimit: PRESENTATION_CAPTION_API_COST_POLICY_V001.outputLimit,
    };
    const probeBuilt = buildPresentationCaptionGateB5BoundRequestV002({
      sourceBytes: sourceSnapshot.bytes,
      config,
      maxOutputTokens: PRESENTATION_CAPTION_API_COST_POLICY_V001.outputLimit,
    });
    const maximumBytes = formalBytes(probeBuilt.maximumResponse);
    const maximumPath = `${workDirectory}/maximum-response-structure.json`;
    await writeExclusive(maximumPath, maximumBytes);
    artifacts.push(artifact('maximum-response-structure', maximumPath, maximumBytes));
    const probeWrapper =
      buildPresentationCaptionCountTokensRequestV001(probeBuilt.generateRequest);
    if (probeWrapper.status !== 'built') stop(probeWrapper.code);
    const probeRequestPath = `${workDirectory}/probe-count-tokens-request.json`;
    const probeRawPath = `${workDirectory}/probe-count-tokens-response.raw.json`;
    calls += 1;
    const probe = await performCount({
      apiKey,
      requestBytes: probeWrapper.bytes,
      requestPath: probeRequestPath,
      rawPath: probeRawPath,
      fetchImplementation,
    });
    probeInputTokens = probe.totalTokens;
    artifacts.push(artifact('probe-count-tokens-request', probeRequestPath, probeWrapper.bytes));
    artifacts.push(artifact('probe-count-tokens-response-raw', probeRawPath, probe.rawBytes));
    const provisional = derivePresentationCaptionPreSendCostV001({
      probeInputTokens: probe.totalTokens,
      finalInputTokens: probe.totalTokens,
    });
    if (provisional.status !== 'passed') stop(provisional.code);
    derivedMaxOutputTokens = provisional.maxOutputTokens;
    const finalBuilt = buildPresentationCaptionGateB5BoundRequestV002({
      sourceBytes: sourceSnapshot.bytes,
      config,
      maxOutputTokens: provisional.maxOutputTokens,
    });
    const finalWrapper =
      buildPresentationCaptionCountTokensRequestV001(finalBuilt.generateRequest);
    if (finalWrapper.status !== 'built') stop(finalWrapper.code);
    const finalRequestPath = `${workDirectory}/final-count-tokens-request.json`;
    const finalRawPath = `${workDirectory}/final-count-tokens-response.raw.json`;
    calls += 1;
    const final = await performCount({
      apiKey,
      requestBytes: finalWrapper.bytes,
      requestPath: finalRequestPath,
      rawPath: finalRawPath,
      fetchImplementation,
    });
    finalInputTokens = final.totalTokens;
    artifacts.push(artifact('final-count-tokens-request', finalRequestPath, finalWrapper.bytes));
    artifacts.push(artifact('final-count-tokens-response-raw', finalRawPath, final.rawBytes));
    const budget = derivePresentationCaptionPreSendCostV001({
      probeInputTokens: probe.totalTokens,
      finalInputTokens: final.totalTokens,
    });
    if (budget.status !== 'passed'
      || budget.maxOutputTokens !== provisional.maxOutputTokens) {
      stop('API_BUDGET_EXCEEDED_BEFORE_SEND');
    }
    preSendEstimateNanoUsd = budget.preSendEstimateNanoUsd;
    const generatePath = `${workDirectory}/generate-content-request.json`;
    await writeExclusive(generatePath, finalBuilt.generateBytes);
    artifacts.push(artifact('generate-content-request', generatePath, finalBuilt.generateBytes));
    const toFormalPath = (path) => {
      const prefix = `${workDirectory}/`;
      if (!path.startsWith(prefix)) {
        stop('API_BUDGET_BINDING_INVALID', path);
      }
      const suffix = path.slice(prefix.length);
      if (suffix.length === 0
        || suffix.startsWith('/')
        || suffix.split('/').some(
          (segment) => segment.length === 0
            || segment === '.'
            || segment === '..',
        )) {
        stop('API_BUDGET_BINDING_INVALID', path);
      }
      return `${job.outputDirectory}/${suffix}`;
    };
    const formalArtifacts = artifacts
      .map((item) => ({...item, path: toFormalPath(item.path)}))
      .sort((a, b) => {
        const order = [
          ...SOURCE_FILES.map(([id]) => `official-snapshot-${id}`),
          'probe-count-tokens-request',
          'probe-count-tokens-response-raw',
          'final-count-tokens-request',
          'final-count-tokens-response-raw',
          'maximum-response-structure',
          'generate-content-request',
        ];
        return order.indexOf(a.role) - order.indexOf(b.role);
      });
    const byRole = new Map(formalArtifacts.map((item) => [item.role, item]));
    const manifest = {
      schemaVersion: 'presentation-caption-gate-b5-manifest-v002',
      status: 'passed',
      stage: 'ready-for-b6',
      executionStartedAt: currentDate.toISOString(),
      jobBinding: {
        path: jobPath,
        fileSha256: jobSnapshot.fileSha256,
        canonicalSha256: canonicalSha256(job),
      },
      sourceBinding: job.sourceBinding,
      requestBuilderBinding: job.requestBuilderBinding,
      upstreamProjection: job.upstreamProjection,
      officialVerification,
      residualRiskAcceptance: job.residualRiskAcceptance,
      requestBindings: {
        probeCountTokens: {
          requestPath: byRole.get('probe-count-tokens-request').path,
          requestFileSha256: byRole.get('probe-count-tokens-request').fileSha256,
          rawResponsePath: byRole.get('probe-count-tokens-response-raw').path,
          rawResponseFileSha256: byRole.get('probe-count-tokens-response-raw').fileSha256,
        },
        finalCountTokens: {
          requestPath: byRole.get('final-count-tokens-request').path,
          requestFileSha256: byRole.get('final-count-tokens-request').fileSha256,
          rawResponsePath: byRole.get('final-count-tokens-response-raw').path,
          rawResponseFileSha256: byRole.get('final-count-tokens-response-raw').fileSha256,
        },
        generateContent: {
          requestPath: byRole.get('generate-content-request').path,
          requestFileSha256: byRole.get('generate-content-request').fileSha256,
          rawResponsePath: null,
          rawResponseFileSha256: null,
        },
      },
      tokenDiagnosis: {
        probeInputTokens: probe.totalTokens,
        finalInputTokens: final.totalTokens,
        maximumResponseStructurePath: byRole.get('maximum-response-structure').path,
        maximumResponseStructureFileSha256:
          byRole.get('maximum-response-structure').fileSha256,
        maximumResponseStructureByteLength:
          byRole.get('maximum-response-structure').byteLength,
      },
      spendingAuthorization: {
        currency: 'USD',
        maximumNanoUsd: 500000000,
        inputPriceNanoUsdPerToken: 1500,
        outputPriceNanoUsdPerToken: 7500,
        finalInputTokens: final.totalTokens,
        maxOutputTokens: budget.maxOutputTokens,
        preSendEstimateNanoUsd: budget.preSendEstimateNanoUsd,
        officialClaimsCanonicalSha256:
          verification.officialClaimsCanonicalSha256,
        residualRiskAcceptanceCanonicalSha256: acceptance.canonicalSha256,
        status: 'approved-for-single-send',
      },
      transport: {
        product: 'Gemini Developer API',
        apiVersion: 'v1beta',
        countTokensEndpoint:
          PRESENTATION_CAPTION_API_COST_POLICY_V001.countTokensEndpoint,
        generateContentEndpoint:
          PRESENTATION_CAPTION_API_COST_POLICY_V001.generateContentEndpoint,
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-goog-api-key': '<redacted>',
        },
        serviceTierFieldOmitted: true,
        automaticRetries: 0,
        clientTimeoutMilliseconds: 600000,
        countTokensCalls: 2,
        generateContentCalls: 0,
      },
      cost: {
        currency: 'USD',
        maximumNanoUsd: 500000000,
        inputPriceNanoUsdPerToken: 1500,
        outputPriceNanoUsdPerToken: 7500,
        preSendEstimateNanoUsd: budget.preSendEstimateNanoUsd,
        actualBillingObservation:
          'count_tokens_billing_unverified_risk_accepted_generate_not_called',
      },
      checks: Object.fromEntries([
        'sourceBinding',
        'officialEvidence',
        'requestConstruction',
        'candidateCount',
        'tokenProbe',
        'finalRequest',
        'budget',
        'transport',
        'secret',
        'artifacts',
      ].map((key) => [key, 'passed'])),
      artifacts: formalArtifacts,
      nextStage: {
        status: 'ready-for-b6',
        blockingViolationCodes: [],
        generateContentAllowed: true,
      },
    };
    const manifestBytes = formalBytes(manifest);
    if (presentationCaptionApiBytesContainSecretV001(manifestBytes, apiKey)) {
      stop('SECRET_LEAK_DETECTED');
    }
    await writeExclusive(`${workDirectory}/b5-manifest-v002.json`, manifestBytes);
    await assertCommitBindings({
      jobPath,
      context,
      workDirectory,
      inspectUpstreamProjection,
    });
    await publishWorkDirectory({
      workDirectory,
      outputDirectory: job.outputDirectory,
    });
    workOwned = false;
    workDirectory = null;
    return {
      status: 'ready-for-b6',
      countTokensCalls: calls,
      generateContentCalls: 0,
      manifestBinding: {
        path: `${job.outputDirectory}/b5-manifest-v002.json`,
        fileSha256: sha256(manifestBytes),
      },
    };
  } catch (error) {
    const violationCode = error instanceof Stop
      ? error.code
      : 'API_TRANSPORT_CONTRACT_VIOLATION';
    const relatedPath = error instanceof Stop ? error.path : '$';
    if (context !== null && workDirectory !== null) {
      try {
        const artifacts = await collectFormalArtifacts({
          workDirectory,
          outputDirectory: context.job.outputDirectory,
        });
        const officialStop = calls === 0 && [
          'API_MODEL_OR_PRICE_UNVERIFIED',
          'API_COUNT_TOKENS_BILLING_RISK_ACCEPTANCE_INVALID',
          'API_PROMPT_TOKEN_BOUND_RISK_ACCEPTANCE_INVALID',
          'API_OUTPUT_TOKEN_BOUND_RISK_ACCEPTANCE_INVALID',
        ].includes(violationCode);
        const jobBinding = {
          path: jobPath,
          fileSha256: context.jobSnapshot.fileSha256,
          canonicalSha256: canonicalSha256(context.job),
        };
        const violations = [{
          code: violationCode,
          relatedPaths: [relatedPath],
        }];
        const report = officialStop
          ? {
            schemaVersion:
              'presentation-caption-api-cost-verification-stop-report-v001',
            status: 'blocked',
            stage: 'official-verification',
            executionStartedAt: context.executionStartedAt,
            jobBinding,
            officialVerification: context.officialVerification,
            checks: buildChecks({
              officialEvidence:
                violationCode === 'API_MODEL_OR_PRICE_UNVERIFIED'
                  ? 'failed'
                  : 'passed',
              failedKey:
                violationCode === 'API_MODEL_OR_PRICE_UNVERIFIED'
                  ? undefined
                  : 'budget',
            }),
            violations,
            transportObservation: {
              countTokensCalls: 0,
              generateContentCalls: 0,
            },
            artifacts,
            nextStage: {
              status: 'blocked-before-api',
              generateContentAllowed: false,
            },
          }
          : {
            schemaVersion:
              'presentation-caption-gate-b5-measurement-stop-report-v001',
            status: 'blocked',
            stage: measurementStageFor({
              code: violationCode,
              calls,
            }),
            executionStartedAt: context.executionStartedAt,
            jobBinding,
            officialVerification: context.officialVerification,
            checks: buildChecks({
              failedKey: failedCheckFor(violationCode, relatedPath),
            }),
            violations,
            transportObservation: {
              countTokensCalls: calls,
              generateContentCalls: 0,
              automaticRetries: 0,
            },
            tokenObservation: {
              probeInputTokens,
              finalInputTokens,
              derivedMaxOutputTokens,
              preSendEstimateNanoUsd,
            },
            artifacts,
            nextStage: {
              status: 'blocked-before-b6',
              generateContentAllowed: false,
            },
          };
        const basename = officialStop
          ? 'b5-cost-verification-stop-report-v001.json'
          : 'b5-measurement-stop-report-v001.json';
        const reportBytes = formalBytes(report);
        if (typeof apiKey === 'string'
          && presentationCaptionApiBytesContainSecretV001(
            reportBytes,
            apiKey,
          )) {
          throw new Error('secret-in-stop-report');
        }
        await writeExclusive(`${workDirectory}/${basename}`, reportBytes);
        await assertCommitBindings({
          jobPath,
          context,
          workDirectory,
          inspectUpstreamProjection,
        });
        await publishWorkDirectory({
          workDirectory,
          outputDirectory: context.job.outputDirectory,
        });
        workOwned = false;
        workDirectory = null;
        return {
          status: 'stopped',
          violationCode,
          relatedPath,
          countTokensCalls: calls,
          generateContentCalls: 0,
          stopReportBinding: {
            path: `${context.job.outputDirectory}/${basename}`,
            fileSha256: sha256(reportBytes),
          },
        };
      } catch {
        if (workOwned) {
          await rm(absolute(workDirectory), {recursive: true, force: true});
        }
        workDirectory = null;
        return {
          status: 'fatal',
          diagnosticCode: 'CAPTION_B5_V002_RUNNER_FATAL',
          countTokensCalls: calls,
          generateContentCalls: 0,
        };
      }
    }
    if (workDirectory !== null && workOwned) {
      await rm(absolute(workDirectory), {recursive: true, force: true});
    }
    return {
      status: 'fatal',
      diagnosticCode: 'CAPTION_B5_V002_RUNNER_FATAL',
      violationCode,
      relatedPath,
      countTokensCalls: calls,
      generateContentCalls: 0,
    };
  }
}

const main = async () => {
  const result = await executePresentationCaptionGateB5InitialV002({
    jobPath: process.argv[2],
  });
  if (result.status === 'ready-for-b6') {
    process.stdout.write(await readFile(absolute(result.manifestBinding.path)));
  } else if (result.status === 'stopped') {
    process.stdout.write(await readFile(absolute(result.stopReportBinding.path)));
  } else {
    process.stdout.write(formalBytes({
      schemaVersion: 'presentation-formal-runner-fatal-v001',
      runnerId: JOB_SCHEMA,
      status: 'fatal',
      diagnosticCode: 'CAPTION_B5_V002_RUNNER_FATAL',
    }));
  }
  process.exitCode = result.status === 'ready-for-b6'
    ? 0
    : result.status === 'fatal' ? 2 : 1;
};

if (typeof process.argv[1] === 'string'
  && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(() => {
    process.stdout.write(formalBytes({
      schemaVersion: 'presentation-formal-runner-fatal-v001',
      runnerId: JOB_SCHEMA,
      status: 'fatal',
      diagnosticCode: 'CAPTION_B5_V002_RUNNER_FATAL',
    }));
    process.exitCode = 2;
  });
}
