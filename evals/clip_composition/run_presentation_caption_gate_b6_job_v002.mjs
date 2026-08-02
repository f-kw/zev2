#!/usr/bin/env node

import {constants} from 'node:fs';
import {spawn} from 'node:child_process';
import {
  lstat,
  mkdir,
  open,
  readFile,
} from 'node:fs/promises';
import {dirname, resolve, sep} from 'node:path';
import process from 'node:process';
import {fileURLToPath, pathToFileURL} from 'node:url';

import {
  executePresentationCaptionGateB6TransportV002,
  validatePresentationCaptionGateB6CostStateV002,
} from './run_presentation_caption_gate_b6_v001.mjs';
import {
  buildPresentationCaptionSemanticSourcePackageV001,
  canonicalizePresentationCaptionB1JsonV001,
  decodePresentationCaptionB1StrictJsonV001,
  serializePresentationCaptionB1FormalJsonV001,
  sha256PresentationCaptionB1BytesV001,
} from './presentation_caption_semantic_source_package_v001.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const SHA_PATTERN = /^[0-9a-f]{64}$/u;
const ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/u;
const ENDPOINT =
  'https://generativelanguage.googleapis.com/v1beta/'
    + 'models/gemini-3.6-flash:generateContent';
const B1_RUNNER_PATH =
  'evals/clip_composition/run_presentation_caption_semantic_output_check_v002.mjs';
const B4_RUNNER_PATH =
  'evals/clip_composition/run_presentation_caption_display_pair_job_v002.mjs';
const B1_FILE_BINDINGS = Object.freeze([
  ['packageCore', 'evals/clip_composition/presentation_caption_semantic_source_package_v001.mjs'],
  ['semanticCore', 'evals/clip_composition/presentation_caption_semantic_output_v001.mjs'],
  ['semanticRunner', B1_RUNNER_PATH],
]);
const B1_DEPENDENCY_BINDINGS = Object.freeze([
  ['textLayoutImplementation', 'evals/clip_composition/presentation_renderer_text_layout_v001.mjs'],
  ['gateACore', 'evals/clip_composition/presentation_segmenter_boundary_evidence_v001.mjs'],
  ['gateARetainedSourceAtomsCore', 'evals/clip_composition/presentation_retained_source_atoms_v001.mjs'],
  ['gateARunner', 'evals/clip_composition/run_presentation_segmenter_boundary_preflight_v001.mjs'],
]);

const CLOSURE = Object.freeze([
  ['b6Core', 'evals/clip_composition/run_presentation_caption_gate_b6_v001.mjs'],
  ['sourcePackageCore', 'evals/clip_composition/presentation_caption_semantic_source_package_v001.mjs'],
  ['textLayoutImplementation', 'evals/clip_composition/presentation_renderer_text_layout_v001.mjs'],
  ['gateACore', 'evals/clip_composition/presentation_segmenter_boundary_evidence_v001.mjs'],
  ['gateARetainedSourceAtomsCore', 'evals/clip_composition/presentation_retained_source_atoms_v001.mjs'],
  ['gateARunner', 'evals/clip_composition/run_presentation_segmenter_boundary_preflight_v001.mjs'],
  ['semanticCore', 'evals/clip_composition/presentation_caption_semantic_output_v001.mjs'],
  ['semanticRunnerV001', 'evals/clip_composition/run_presentation_caption_semantic_output_check_v001.mjs'],
  ['displayPairRunnerV001', 'evals/clip_composition/run_presentation_caption_display_pair_job_v001.mjs'],
  ['displayPairCoreV003', 'evals/clip_composition/presentation_caption_display_pair_v003.mjs'],
  ['instructionCoreV003', 'evals/clip_composition/presentation_instruction_contract_v003.mjs'],
  ['captionCoreV003', 'evals/clip_composition/presentation_caption_contract_v003.mjs'],
  ['timelineV002', 'evals/clip_composition/presentation_base_media_timeline_v002.mjs'],
  ['sourceSpeakerPolicy', 'evals/clip_composition/presentation_source_speaker_policy_v001.mjs'],
  ['sourceSpeakerRegistry', 'evals/clip_composition/registries/presentation/presentation-source-speaker-non-identity-registry-v001/registry.json'],
]);

class Stop extends Error {
  constructor(code, stage, path = '$') {
    super(code);
    this.code = code;
    this.stage = stage;
    this.path = path;
  }
}
const stop = (code, stage, path) => {
  throw new Stop(code, stage, path);
};
const exactKeys = (value, keys) =>
  value !== null
  && typeof value === 'object'
  && !Array.isArray(value)
  && JSON.stringify(Object.keys(value)) === JSON.stringify(keys);
const formalBytes = (value) => {
  const result = serializePresentationCaptionB1FormalJsonV001(value);
  if (result?.status !== 'serialized') stop(
    'API_BUDGET_BINDING_INVALID',
    'pre-send',
  );
  return result.bytes;
};
const sha256 = (bytes) => {
  const result = sha256PresentationCaptionB1BytesV001(bytes);
  if (result?.status !== 'hashed') stop(
    'API_BUDGET_BINDING_INVALID',
    'pre-send',
  );
  return result.sha256;
};
const canonicalSha256 = (value) => {
  const result = canonicalizePresentationCaptionB1JsonV001(value);
  if (result?.status !== 'canonicalized') stop(
    'API_BUDGET_BINDING_INVALID',
    'pre-send',
  );
  return sha256(result.bytes);
};
const decode = (bytes) => {
  const result = decodePresentationCaptionB1StrictJsonV001(bytes);
  if (result?.status !== 'decoded') stop(
    'API_BUDGET_BINDING_INVALID',
    'pre-send',
  );
  return result.value;
};
const absolute = (path) => {
  const value = resolve(ROOT, path);
  if (value !== `${ROOT}${sep}${path}`) stop(
    'API_BUDGET_BINDING_INVALID',
    'pre-send',
    path,
  );
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
const readStable = async (path) => {
  const pathValue = absolute(path);
  const before = await lstat(pathValue, {bigint: true});
  if (!before.isFile() || before.isSymbolicLink() || before.nlink !== 1n) {
    stop('API_BUDGET_BINDING_INVALID', 'pre-send', path);
  }
  const handle = await open(pathValue, constants.O_RDONLY | constants.O_NOFOLLOW);
  try {
    const opened = await handle.stat({bigint: true});
    const bytes = await handle.readFile();
    const after = await handle.stat({bigint: true});
    const projection = (stats) => [
      stats.dev, stats.ino, stats.size, stats.mtimeNs, stats.ctimeNs, stats.nlink,
    ].map(String).join(':');
    if (projection(before) !== projection(opened)
      || projection(opened) !== projection(after)
      || BigInt(bytes.length) !== after.size) {
      stop('API_BUDGET_BINDING_INVALID', 'pre-send', path);
    }
    return {path, bytes, fileSha256: sha256(bytes)};
  } finally {
    await handle.close();
  }
};
const assertSnapshotBinding = async ({path, fileSha256}) => {
  const snapshot = await readStable(path);
  if (snapshot.fileSha256 !== fileSha256) {
    stop('API_BUDGET_BINDING_INVALID', 'pre-send', path);
  }
  return snapshot;
};
const assertImplementationGraph = async (job) => {
  const entry = await assertSnapshotBinding(job.implementationBinding.entry);
  const closureSnapshots = await Promise.all(
    job.implementationBinding.localImportClosure.map(
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
    const path = job.implementationBinding.localImportClosure[index].path;
    if (path.endsWith('.json')) dataBindingPaths.push(path);
    else implementationInputs.push({path, bytes: snapshot.bytes});
  }
  const graphValidator =
    buildPresentationCaptionSemanticSourcePackageV001
      .validatePresentationCaptionApiStaticImportGraphV001;
  if (typeof graphValidator !== 'function') {
    stop(
      'API_BUDGET_BINDING_INVALID',
      'pre-send',
      '$.implementationBinding.graphValidator',
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
      'pre-send',
      graph.relatedPaths?.[0] ?? '$.implementationBinding',
    );
  }
};
const assertCommitBindings = async (context) => {
  await assertSnapshotBinding(context.commitBindings[0]);
  await assertImplementationGraph(context.job);
  await Promise.all(
    context.commitBindings.slice(
      2 + context.job.implementationBinding.localImportClosure.length,
    ).map((bindingValue) => assertSnapshotBinding(bindingValue)),
  );
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
    stop('API_TRANSPORT_CONTRACT_VIOLATION', 'transport', path);
  }
};
const binding = (path, bytes) => ({
  path,
  fileSha256: sha256(bytes),
  byteLength: bytes.length,
});
const transportRecord = (calls) => ({
  product: 'Gemini Developer API',
  apiVersion: 'v1beta',
  generateContentEndpoint: ENDPOINT,
  method: 'POST',
  headers: {
    'content-type': 'application/json',
    'x-goog-api-key': '<redacted>',
  },
  serviceTierFieldOmitted: true,
  automaticRetries: 0,
  clientTimeoutMilliseconds: 600000,
  generateContentCalls: calls,
});

const validateJob = (job) => {
  if (!exactKeys(job, [
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
  ])
    || job.schemaVersion
      !== 'presentation-caption-gate-b6-execution-job-v002'
    || job.mode !== 'formal-one-shot'
    || ![job.jobId, job.attemptId, job.runDirectoryId].every((value) =>
      typeof value === 'string' && ID_PATTERN.test(value))
    || !exactKeys(job.implementationBinding, ['entry', 'localImportClosure'])
    || !exactKeys(job.implementationBinding.entry, ['path', 'fileSha256'])
    || job.implementationBinding.entry?.path
      !== 'evals/clip_composition/run_presentation_caption_gate_b6_job_v002.mjs'
    || !SHA_PATTERN.test(job.implementationBinding.entry.fileSha256 ?? '')
    || !Array.isArray(job.implementationBinding.localImportClosure)
    || job.implementationBinding.localImportClosure.some(
      (entry) => !exactKeys(entry, ['role', 'path', 'fileSha256'])
        || !SHA_PATTERN.test(entry.fileSha256 ?? ''),
    )
    || JSON.stringify(job.implementationBinding.localImportClosure.map(
      ({role, path}) => [role, path],
    )) !== JSON.stringify(CLOSURE)
    || !exactKeys(job.b5, ['initialManifest', 'fixedRequest'])
    || !exactKeys(job.sourcePackage, ['rootPath', 'manifest', 'validationReport'])
    || !exactKeys(job.b4StaticTemplate, ['path', 'fileSha256'])
    || !exactKeys(job.publication, [
      'outputRoot',
      'semanticRawPath',
      'b1JobPath',
      'b1ReportPath',
      'b4JobPath',
      'b4PairId',
      'b4OutputRoot',
      'b4RunnerOutputPath',
      'b4DisplayPlanPath',
    ])
    || job.publication.outputRoot
      !== `evals/clip_composition/outputs/presentation/caption-gate-b6/${job.runDirectoryId}`
    || job.publication.b4PairId !== job.attemptId) {
    stop('API_BUDGET_BINDING_INVALID', 'pre-send', '$.job');
  }
};

const validateB5 = ({job, manifestSnapshot, manifest, requestSnapshot}) => {
  if (manifest.schemaVersion !== 'presentation-caption-gate-b5-manifest-v002'
    || manifest.status !== 'passed'
    || manifest.stage !== 'ready-for-b6'
    || manifestSnapshot.fileSha256 !== job.b5.initialManifest.fileSha256
    || requestSnapshot.fileSha256 !== job.b5.fixedRequest.fileSha256
    || manifest.requestBindings?.generateContent?.requestPath
      !== job.b5.fixedRequest.path
    || manifest.requestBindings?.generateContent?.requestFileSha256
      !== requestSnapshot.fileSha256
    || manifest.transport?.generateContentCalls !== 0
    || manifest.nextStage?.generateContentAllowed !== true
    || !manifest.officialVerification?.claims?.slice(0, 6)
      .every((claim) => claim.verdict === 'verified')) {
    stop('API_BUDGET_BINDING_INVALID', 'pre-send', '$.b5');
  }
  if (!exactKeys(manifest.residualRiskAcceptance, [
    'schemaVersion',
    'acceptanceId',
    'acceptedBy',
    'acceptedOn',
    'maximumNanoUsd',
    'officialClaimsCanonicalSha256',
    'claimBindings',
    'sendPermission',
  ])
    || !Array.isArray(manifest.residualRiskAcceptance.claimBindings)
    || manifest.residualRiskAcceptance.claimBindings.length !== 3) {
    stop(
      'API_COUNT_TOKENS_BILLING_RISK_ACCEPTANCE_INVALID',
      'pre-send',
      '$.b5.residualRiskAcceptance',
    );
  }
  const riskIds = [
    'count-tokens-unbilled',
    'count-tokens-upper-bounds-prompt-billing',
    'max-output-upper-bounds-candidate-plus-thinking',
  ];
  for (let index = 0; index < riskIds.length; index += 1) {
    const observed = manifest.residualRiskAcceptance.claimBindings[index];
    const claim = manifest.officialVerification.claims[6 + index];
    if (!exactKeys(observed, ['claimId', 'acceptedVerdict'])
      || observed.claimId !== riskIds[index]
      || observed.acceptedVerdict !== claim?.verdict) {
      stop(
        [
          'API_COUNT_TOKENS_BILLING_RISK_ACCEPTANCE_INVALID',
          'API_PROMPT_TOKEN_BOUND_RISK_ACCEPTANCE_INVALID',
          'API_OUTPUT_TOKEN_BOUND_RISK_ACCEPTANCE_INVALID',
        ][index],
        'pre-send',
        `$.b5.residualRiskAcceptance.claimBindings[${index}]`,
      );
    }
  }
  if (manifest.residualRiskAcceptance.officialClaimsCanonicalSha256
      !== canonicalSha256(manifest.officialVerification.claims)
    || manifest.spendingAuthorization?.officialClaimsCanonicalSha256
      !== manifest.residualRiskAcceptance.officialClaimsCanonicalSha256
    || manifest.spendingAuthorization
      ?.residualRiskAcceptanceCanonicalSha256
      !== canonicalSha256(manifest.residualRiskAcceptance)) {
    stop(
      'API_COUNT_TOKENS_BILLING_RISK_ACCEPTANCE_INVALID',
      'pre-send',
      '$.b5.residualRiskAcceptance',
    );
  }
  const cost = validatePresentationCaptionGateB6CostStateV002({b5Manifest: manifest});
  if (cost.status !== 'passed-pre-send') {
    stop(cost.code, 'pre-send', '$.b5.spendingAuthorization');
  }
  const request = decode(requestSnapshot.bytes);
  if (request.generationConfig?.candidateCount !== 1
    || request.generationConfig?.thinkingConfig?.thinkingLevel !== 'medium'
    || request.generationConfig?.maxOutputTokens
      !== manifest.spendingAuthorization.maxOutputTokens
    || Object.hasOwn(request, 'serviceTier')
    || Object.hasOwn(request.generationConfig, 'serviceTier')) {
    stop('API_BUDGET_REQUEST_MISMATCH', 'pre-send', job.b5.fixedRequest.path);
  }
};

const tryDecode = (bytes) => {
  const result = decodePresentationCaptionB1StrictJsonV001(bytes);
  return result?.status === 'decoded' ? result.value : null;
};
const jsonBinding = (path, bytes, value = tryDecode(bytes)) => ({
  path,
  fileSha256: sha256(bytes),
  byteLength: bytes.length,
  canonicalSha256: value === null ? null : canonicalSha256(value),
});
const clone = (value) => structuredClone(value);

const bindingFromTemplate = (template, expected) => {
  const entries = [
    ...(template.implementationBinding?.files ?? []),
    ...(template.implementationBinding?.dependencyFiles ?? []),
  ];
  return expected.map(([role, path]) => {
    const matched = entries.find((entry) => entry.path === path);
    if (!matched || !SHA_PATTERN.test(matched.fileSha256 ?? '')) {
      throw new TypeError(`missing implementation binding: ${path}`);
    }
    return {role, path, fileSha256: matched.fileSha256};
  });
};

const runChild = async ({nodePath, runnerPath, jobPath}) => {
  const environment = {...process.env};
  delete environment.GEMINI_API_KEY;
  return new Promise((resolveChild) => {
    const child = spawn(
      nodePath,
      [absolute(runnerPath), jobPath],
      {
        cwd: ROOT,
        env: environment,
        stdio: ['ignore', 'pipe', 'pipe'],
      },
    );
    const stdout = [];
    const stderr = [];
    child.stdout.on('data', (chunk) => stdout.push(Buffer.from(chunk)));
    child.stderr.on('data', (chunk) => stderr.push(Buffer.from(chunk)));
    child.once('error', () => {
      resolveChild({
        exitCode: 2,
        stdout: Buffer.concat(stdout),
        stderr: Buffer.concat(stderr),
      });
    });
    child.once('close', (code) => {
      resolveChild({
        exitCode: Number.isSafeInteger(code) ? code : 2,
        stdout: Buffer.concat(stdout),
        stderr: Buffer.concat(stderr),
      });
    });
  });
};

const childFatal = (child, observation) => ({
  status: 'fatal',
  child,
  exitCode: observation.exitCode,
  stdout: observation.stdout,
  stderr: observation.stderr,
});

const defaultDownstream = async ({
  job,
  semanticBytes,
  semanticOutputBinding,
}) => {
  const templateSnapshot = await readStable(job.b4StaticTemplate.path);
  const template = decode(templateSnapshot.bytes);
  const nodePath = template.expectedRuntime?.resolvedNodePath;
  if (typeof nodePath !== 'string' || !nodePath.startsWith('/')) {
    return childFatal('b1', {
      exitCode: 2,
      stdout: Buffer.from(
        '{"schemaVersion":"presentation-formal-runner-fatal-v001","runnerId":"presentation-caption-semantic-output-check-job-v002","status":"fatal","diagnosticCode":"CAPTION_B1_V002_RUNNER_FATAL"}\n',
      ),
      stderr: Buffer.alloc(0),
    });
  }

  const b1Job = {
    schemaVersion: 'presentation-caption-semantic-output-check-job-v002',
    jobId: job.attemptId,
    artifactId: template.artifactId,
    mode: 'read-only-check',
    implementationBinding: {
      gitCommit: template.implementationBinding.gitCommit,
      files: bindingFromTemplate(template, B1_FILE_BINDINGS),
      dependencyFiles: bindingFromTemplate(
        template,
        B1_DEPENDENCY_BINDINGS,
      ),
    },
    sourcePackageBinding: clone(template.sourcePackageBinding),
    semanticOutputBinding: {
      path: semanticOutputBinding.path,
      fileSha256: semanticOutputBinding.fileSha256,
    },
    expectedRuntime: clone(template.expectedRuntime),
    expectedProjection: clone(template.expectedStaticProjection),
    readOnlyGuard: clone(template.readOnlyGuard),
  };
  const b1JobBytes = formalBytes(b1Job);
  await writeExclusive(job.publication.b1JobPath, b1JobBytes);
  const b1Observation = await runChild({
    nodePath,
    runnerPath: B1_RUNNER_PATH,
    jobPath: job.publication.b1JobPath,
  });
  const b1Report = tryDecode(b1Observation.stdout);
  const b1ExpectedStatus = b1Observation.exitCode === 0
    ? 'passed'
    : b1Observation.exitCode === 1
      ? ['rejected', 'abstained']
      : [];
  if (b1Observation.stderr.length !== 0
    || ![0, 1].includes(b1Observation.exitCode)
    || b1Report?.schemaVersion
      !== 'presentation-caption-semantic-output-validation-report-v002'
    || (
      Array.isArray(b1ExpectedStatus)
        ? !b1ExpectedStatus.includes(b1Report?.status)
        : b1Report?.status !== b1ExpectedStatus
    )
    || b1Report?.jobBinding?.path !== job.publication.b1JobPath
    || b1Report?.jobBinding?.fileSha256 !== sha256(b1JobBytes)) {
    return childFatal('b1', b1Observation);
  }
  await writeExclusive(job.publication.b1ReportPath, b1Observation.stdout);
  const b1JobBinding = jsonBinding(
    job.publication.b1JobPath,
    b1JobBytes,
    b1Job,
  );
  const b1ReportBinding = jsonBinding(
    job.publication.b1ReportPath,
    b1Observation.stdout,
    b1Report,
  );
  const b1 = {
    exitCode: b1Observation.exitCode,
    status: b1Report.status,
    jobBinding: b1JobBinding,
    validationReportBinding: b1ReportBinding,
  };
  if (b1Observation.exitCode === 1) {
    return {
      status: 'stopped-after-response',
      reason: b1Report.status === 'abstained'
        ? 'semantic-output-abstained'
        : 'semantic-output-rejected',
      violationCodes: b1Report.status === 'abstained'
        ? []
        : [...new Set(b1Report.violations.map((entry) => entry.code))],
      b1,
      b4: null,
    };
  }

  const semanticValue = tryDecode(semanticBytes);
  const semanticCheckBinding = {
    job: b1JobBinding,
    rawSemanticOutput: jsonBinding(
      semanticOutputBinding.path,
      semanticBytes,
      semanticValue,
    ),
    validationReport: b1ReportBinding,
    expectedCompilerInputObservedByteSha256:
      b1Report.compilerInput.observedByteSha256,
    expectedCompilerInputCanonicalSha256:
      b1Report.compilerInput.canonicalSha256,
  };
  const b4Job = {
    schemaVersion: 'presentation-caption-display-pair-generation-job-v002',
    jobId: job.attemptId,
    artifactId: template.artifactId,
    mode: 'formal-generation',
    implementationBinding: clone(template.implementationBinding),
    sourcePackageBinding: clone(template.sourcePackageBinding),
    semanticCheckBinding,
    retainedSourceBinding: clone(template.retainedSourceBinding),
    baseMediaBinding: clone(template.baseMediaBinding),
    registryBinding: clone(template.registryBinding),
    cropDecisionBinding: {
      path: template.cropDecisionBinding.path,
      fileSha256: template.cropDecisionBinding.fileSha256,
    },
    expectedRuntime: clone(template.expectedRuntime),
    expectedProjection: clone(template.expectedStaticProjection),
    publication: {
      pairId: job.publication.b4PairId,
      formalOutputPath: job.publication.b4OutputRoot,
      lockPath: `${job.publication.b4OutputRoot}.lock`,
      workPath: `${job.publication.b4OutputRoot}.work`,
    },
    readOnlyGuard: clone(template.readOnlyGuard),
  };
  const b4JobBytes = formalBytes(b4Job);
  await writeExclusive(job.publication.b4JobPath, b4JobBytes);
  const b4Observation = await runChild({
    nodePath,
    runnerPath: B4_RUNNER_PATH,
    jobPath: job.publication.b4JobPath,
  });
  const b4Report = tryDecode(b4Observation.stdout);
  const b4ExpectedStatus = b4Observation.exitCode === 0
    ? 'passed_pending_human_review'
    : b4Observation.exitCode === 1 ? 'rejected' : null;
  if (b4Observation.stderr.length !== 0
    || ![0, 1].includes(b4Observation.exitCode)
    || b4Report?.schemaVersion
      !== 'presentation-caption-display-pair-validation-report-v003'
    || b4Report?.status !== b4ExpectedStatus
    || b4Report?.jobBinding?.path !== job.publication.b4JobPath
    || b4Report?.jobBinding?.fileSha256 !== sha256(b4JobBytes)) {
    return childFatal('b4', b4Observation);
  }
  const b4JobBinding = jsonBinding(
    job.publication.b4JobPath,
    b4JobBytes,
    b4Job,
  );
  if (b4Observation.exitCode === 1) {
    await writeExclusive(
      job.publication.b4RunnerOutputPath,
      b4Observation.stdout,
    );
    return {
      status: 'stopped-after-response',
      reason: 'display-plan-rejected',
      violationCodes: [...new Set(
        b4Report.violations.map((entry) => entry.code),
      )],
      b1,
      b4: {
        exitCode: 1,
        status: 'rejected',
        jobBinding: b4JobBinding,
        outputRoot: null,
        validationReportBinding: jsonBinding(
          job.publication.b4RunnerOutputPath,
          b4Observation.stdout,
          b4Report,
        ),
      },
    };
  }
  const b4PublishedReportPath =
    `${job.publication.b4OutputRoot}/pair-validation-report.json`;
  const b4PublishedReport = await readStable(b4PublishedReportPath);
  if (!b4PublishedReport.bytes.equals(b4Observation.stdout)) {
    return childFatal('b4', {
      ...b4Observation,
      exitCode: 2,
    });
  }
  const displayPlanSnapshot = await readStable(
    job.publication.b4DisplayPlanPath,
  );
  return {
    status: 'passed-to-b4',
    b1,
    b4: {
      exitCode: 0,
      status: 'passed',
      jobBinding: b4JobBinding,
      outputRoot: job.publication.b4OutputRoot,
      validationReportBinding: jsonBinding(
        b4PublishedReportPath,
        b4PublishedReport.bytes,
        b4Report,
      ),
    },
    displayPlanBinding: binding(
      job.publication.b4DisplayPlanPath,
      displayPlanSnapshot.bytes,
    ),
  };
};

export async function executePresentationCaptionGateB6JobV002({
  jobPath,
  apiKey = process.env.GEMINI_API_KEY,
  fetchImplementation = globalThis.fetch,
  timeoutSignalFactory = (milliseconds) => AbortSignal.timeout(milliseconds),
  downstreamExecutor = defaultDownstream,
  currentDate = new Date(),
}) {
  let context = null;
  let generateContentCalls = 0;
  let rawBinding = null;
  let childObservation = null;
  let childArtifact = null;
  try {
    const jobSnapshot = await readStable(jobPath);
    const job = decode(jobSnapshot.bytes);
    validateJob(job);
    await assertImplementationGraph(job);
    const [
      manifestSnapshot,
      requestSnapshot,
      packageManifestSnapshot,
      packageReportSnapshot,
      b4TemplateSnapshot,
    ] = await Promise.all([
      readStable(job.b5.initialManifest.path),
      readStable(job.b5.fixedRequest.path),
      readStable(job.sourcePackage.manifest.path),
      readStable(job.sourcePackage.validationReport.path),
      readStable(job.b4StaticTemplate.path),
    ]);
    const manifest = decode(manifestSnapshot.bytes);
    const allOutputPaths = Object.values(job.publication)
      .filter((value) => typeof value === 'string' && value.includes('/'));
    for (const path of allOutputPaths) {
      if (await exists(path)) stop('API_BUDGET_BINDING_INVALID', 'pre-send', path);
    }
    await mkdir(absolute(job.publication.outputRoot), {recursive: false});
    context = {
      job,
      jobSnapshot,
      manifest,
      requestSnapshot,
      executionStartedAt: currentDate.toISOString(),
      commitBindings: [
        {path: jobPath, fileSha256: jobSnapshot.fileSha256},
        job.implementationBinding.entry,
        ...job.implementationBinding.localImportClosure,
        {
          path: job.b5.initialManifest.path,
          fileSha256: manifestSnapshot.fileSha256,
        },
        {
          path: job.b5.fixedRequest.path,
          fileSha256: requestSnapshot.fileSha256,
        },
        {
          path: job.sourcePackage.manifest.path,
          fileSha256: packageManifestSnapshot.fileSha256,
        },
        {
          path: job.sourcePackage.validationReport.path,
          fileSha256: packageReportSnapshot.fileSha256,
        },
        {
          path: job.b4StaticTemplate.path,
          fileSha256: b4TemplateSnapshot.fileSha256,
        },
      ],
    };
    validateB5({job, manifestSnapshot, manifest, requestSnapshot});
    if (packageManifestSnapshot.fileSha256 !== job.sourcePackage.manifest.fileSha256
      || packageReportSnapshot.fileSha256
        !== job.sourcePackage.validationReport.fileSha256
      || b4TemplateSnapshot.fileSha256 !== job.b4StaticTemplate.fileSha256
      || decode(packageManifestSnapshot.bytes).schemaVersion
        !== 'presentation-caption-semantic-source-package-manifest-v002'
      || decode(b4TemplateSnapshot.bytes).schemaVersion
        !== 'presentation-caption-display-pair-static-preflight-job-v002') {
      stop('API_BUDGET_REQUEST_MISMATCH', 'pre-send', '$.sourcePackage');
    }
    const rawPath =
      `${job.publication.outputRoot}/generate-content-response.raw.json`;
    generateContentCalls = 1;
    const transport = await executePresentationCaptionGateB6TransportV002({
      requestBytes: requestSnapshot.bytes,
      apiKey,
      fetchImplementation,
      timeoutSignalFactory,
      endpoint: ENDPOINT,
      rawResponseWriter: async (bytes) => {
        await writeExclusive(rawPath, bytes);
        rawBinding = binding(rawPath, bytes);
      },
    });
    const cost = validatePresentationCaptionGateB6CostStateV002({
      b5Manifest: manifest,
      usageMetadata: transport.usageMetadata,
    });
    const response = {
      configuredModelId: 'gemini-3.6-flash',
      responseModelVersion: transport.responseModelVersion,
      httpStatus: transport.httpStatus,
      contentType: transport.contentType,
      rawBinding,
      usageMetadata: transport.usageMetadata,
      observedServiceTier: transport.observedServiceTier,
      candidateCount: transport.candidateCount,
    };
    const costRecord = {
      currency: 'USD',
      inputPriceNanoUsdPerToken: 1500,
      outputPriceNanoUsdPerToken: 7500,
      promptCostNanoUsd: cost.promptCostNanoUsd,
      outputCostNanoUsd: cost.outputCostNanoUsd,
      totalUsageCostNanoUsd: cost.observedUsageCostNanoUsd,
      actualBillingObservation:
        'usage_metadata_list_price_estimate_invoice_not_observed',
    };
    const b5Binding = {
      path: job.b5.initialManifest.path,
      fileSha256: manifestSnapshot.fileSha256,
      canonicalSha256: canonicalSha256(manifest),
    };
    const requestBinding = {
      path: job.b5.fixedRequest.path,
      fileSha256: requestSnapshot.fileSha256,
      canonicalSha256: canonicalSha256(decode(requestSnapshot.bytes)),
    };
    const authorization = manifest.spendingAuthorization;
    const spending = {
      b5ManifestBinding: b5Binding,
      officialClaimsCanonicalSha256:
        authorization.officialClaimsCanonicalSha256,
      residualRiskAcceptanceCanonicalSha256:
        authorization.residualRiskAcceptanceCanonicalSha256,
      finalRequestBinding: requestBinding,
      finalInputTokens: authorization.finalInputTokens,
      maxOutputTokens: authorization.maxOutputTokens,
      maximumNanoUsd: authorization.maximumNanoUsd,
      preSendEstimateNanoUsd: authorization.preSendEstimateNanoUsd,
      preSendStatus: 'passed',
      observedPromptTokens: transport.usageMetadata.promptTokenCount,
      observedCandidateTokens: transport.usageMetadata.candidatesTokenCount,
      observedThinkingTokens: transport.usageMetadata.thoughtsTokenCount,
      observedTotalTokens: transport.usageMetadata.totalTokenCount,
      observedUsageCostNanoUsd: cost.observedUsageCostNanoUsd,
      estimateComparison: cost.estimateComparison,
      postSendStatus: cost.status === 'passed' ? 'passed' : 'failed',
    };
    const baseManifest = {
      schemaVersion: 'presentation-caption-gate-b6-manifest-v002',
      status: 'stopped-after-response',
      stage: 'response-validation',
      attemptId: job.attemptId,
      executionStartedAt: context.executionStartedAt,
      jobBinding: {
        path: jobPath,
        fileSha256: jobSnapshot.fileSha256,
        canonicalSha256: canonicalSha256(job),
      },
      implementationBinding: job.implementationBinding,
      fixedRequestBinding: binding(
        job.b5.fixedRequest.path,
        requestSnapshot.bytes,
      ),
      transport: transportRecord(1),
      response,
      residualRiskAcceptance: manifest.residualRiskAcceptance,
      cost: costRecord,
      spendingAuthorization: spending,
      semanticOutputBinding: null,
      b1: null,
      b4: null,
      stop: null,
    };
    if (cost.status !== 'passed') {
      baseManifest.stop = {
        reason: 'usage-budget-violation',
        violationCodes: ['API_USAGE_BUDGET_VIOLATION'],
      };
      const bytes = formalBytes(baseManifest);
      const path = `${job.publication.outputRoot}/b6-manifest-v002.json`;
      await assertCommitBindings(context);
      await writeExclusive(path, bytes);
      return {
        status: 'stopped-after-response',
        reason: 'usage-budget-violation',
        generateContentCalls: 1,
        manifestBinding: binding(path, bytes),
      };
    }
    await writeExclusive(job.publication.semanticRawPath, transport.semanticBytes);
    baseManifest.semanticOutputBinding =
      binding(job.publication.semanticRawPath, transport.semanticBytes);
    const downstream = await downstreamExecutor({
      job,
      semanticBytes: transport.semanticBytes,
      semanticOutputBinding: baseManifest.semanticOutputBinding,
    });
    if (downstream?.status === 'fatal') {
      const stdout = Buffer.isBuffer(downstream.stdout)
        ? downstream.stdout
        : Buffer.alloc(0);
      const stderr = Buffer.isBuffer(downstream.stderr)
        ? downstream.stderr
        : Buffer.alloc(0);
      const child = downstream.child === 'b4' ? 'b4' : 'b1';
      childObservation = {
        child,
        exitCode: downstream.exitCode,
        stdoutByteLength: stdout.length,
        stdoutSha256: sha256(stdout),
        stderrByteLength: stderr.length,
        stderrSha256: sha256(stderr),
      };
      if (stdout.includes(Buffer.from(apiKey, 'utf8'))
        || stderr.includes(Buffer.from(apiKey, 'utf8'))) {
        stop('SECRET_LEAK_DETECTED', 'downstream', '$.downstream');
      }
      if (stdout.length > 0) {
        const childPath = child === 'b4'
          ? job.publication.b4RunnerOutputPath
          : `${job.publication.outputRoot}/b1-runner-output.raw`;
        await writeExclusive(childPath, stdout);
        childArtifact = {
          role: child === 'b4'
            ? 'b4-runner-output-raw'
            : 'b1-runner-output-raw',
          ...binding(childPath, stdout),
        };
      }
      stop('B6_DOWNSTREAM_EXECUTION_FAILED', 'downstream', '$.downstream');
    }
    baseManifest.b1 = downstream?.b1 ?? null;
    baseManifest.b4 = downstream?.b4 ?? null;
    if (downstream?.status === 'passed-to-b4') {
      baseManifest.status = 'passed-to-b4';
      baseManifest.stage = 'complete';
      baseManifest.stop = null;
    } else {
      baseManifest.stop = {
        reason: downstream?.reason ?? 'semantic-output-rejected',
        violationCodes: downstream?.violationCodes ?? ['B1_REJECTED'],
      };
    }
    const manifestBytes = formalBytes(baseManifest);
    if (manifestBytes.includes(Buffer.from(apiKey, 'utf8'))) {
      stop('SECRET_LEAK_DETECTED', 'downstream');
    }
    const manifestPath = `${job.publication.outputRoot}/b6-manifest-v002.json`;
    await assertCommitBindings(context);
    await writeExclusive(manifestPath, manifestBytes);
    return {
      status: baseManifest.status,
      generateContentCalls: 1,
      manifestBinding: binding(manifestPath, manifestBytes),
      displayPlanBinding: downstream?.displayPlanBinding ?? null,
    };
  } catch (error) {
    const code = error instanceof Stop
      ? error.code
      : error?.reason?.startsWith('SECRET_')
        ? 'SECRET_LEAK_DETECTED'
      : error?.reason === 'B6_V002_RESPONSE_TIER_INVALID'
        ? 'API_RESPONSE_TIER_MISMATCH'
        : error?.reason?.startsWith('B6_V002_USAGE')
          || error?.reason === 'B6_V002_CANDIDATE_COUNT_INVALID'
          ? 'API_USAGE_ACCOUNTING_INVALID'
          : error?.reason
            ? 'API_TRANSPORT_CONTRACT_VIOLATION'
            : 'API_TRANSPORT_CONTRACT_VIOLATION';
    const stage = error instanceof Stop
      ? error.stage
      : rawBinding === null ? 'transport' : 'response-envelope';
    if (context === null) {
      return {
        status: 'fatal',
        diagnosticCode: 'CAPTION_B6_V002_RUNNER_FATAL',
        generateContentCalls: 0,
      };
    }
    const stopReport = {
      schemaVersion: 'presentation-caption-gate-b6-stop-report-v001',
      status: 'blocked',
      stage,
      executionStartedAt: context.executionStartedAt,
      jobBinding: {
        path: jobPath,
        fileSha256: context.jobSnapshot.fileSha256,
        canonicalSha256: canonicalSha256(context.job),
      },
      implementationBinding: context.job.implementationBinding,
      fixedRequestBinding: binding(
        context.job.b5.fixedRequest.path,
        context.requestSnapshot.bytes,
      ),
      transport: transportRecord(generateContentCalls),
      responseBinding: rawBinding === null
        ? null
        : {
          ...rawBinding,
          httpStatus: null,
          contentType: null,
        },
      childObservation,
      violations: [{code, relatedPaths: [error?.path ?? '$']}],
      artifacts: rawBinding === null
        ? []
        : [
          {role: 'generate-content-response-raw', ...rawBinding},
          ...(childArtifact === null ? [] : [childArtifact]),
        ],
      nextStage: {status: 'stopped', b1Allowed: false, b4Allowed: false},
    };
    const bytes = formalBytes(stopReport);
    const path = `${context.job.publication.outputRoot}/b6-stop-report-v001.json`;
    try {
      await assertCommitBindings(context);
      await writeExclusive(path, bytes);
    } catch {
      return {
        status: 'fatal',
        diagnosticCode: 'B6_COMMIT_RECORD_PUBLICATION_FAILED',
        generateContentCalls,
      };
    }
    return {
      status: 'stopped',
      violationCode: code,
      stage,
      generateContentCalls,
      stopReportBinding: binding(path, bytes),
    };
  }
}

const main = async () => {
  const result = await executePresentationCaptionGateB6JobV002({
    jobPath: process.argv[2],
  });
  if (result.manifestBinding?.path) {
    process.stdout.write(await readFile(absolute(result.manifestBinding.path)));
  } else if (result.stopReportBinding?.path) {
    process.stdout.write(await readFile(absolute(result.stopReportBinding.path)));
  } else if (
    result.diagnosticCode === 'B6_COMMIT_RECORD_PUBLICATION_FAILED'
  ) {
    process.stdout.write(formalBytes({
      schemaVersion: 'presentation-caption-gate-b6-publication-fatal-v001',
      status: 'fatal',
      diagnosticCode: 'B6_COMMIT_RECORD_PUBLICATION_FAILED',
    }));
  } else {
    process.stdout.write(formalBytes({
      schemaVersion: 'presentation-formal-runner-fatal-v001',
      runnerId: 'presentation-caption-gate-b6-execution-job-v002',
      status: 'fatal',
      diagnosticCode: 'CAPTION_B6_V002_RUNNER_FATAL',
    }));
  }
  process.exitCode = result.status === 'passed-to-b4'
    ? 0
    : result.status === 'fatal' ? 2 : 1;
};

if (typeof process.argv[1] === 'string'
  && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(() => {
    process.stdout.write(formalBytes({
      schemaVersion: 'presentation-formal-runner-fatal-v001',
      runnerId: 'presentation-caption-gate-b6-execution-job-v002',
      status: 'fatal',
      diagnosticCode: 'CAPTION_B6_V002_RUNNER_FATAL',
    }));
    process.exitCode = 2;
  });
}
