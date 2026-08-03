import assert from 'node:assert/strict';
import {readFile, readdir} from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';

import {
  PRESENTATION_OUTPUT_ACCEPTANCE_CHECKS_V001,
  PRESENTATION_OUTPUT_ACCEPTANCE_CHECK_DEPENDENCIES_V001,
  PRESENTATION_OUTPUT_ACCEPTANCE_CODE_OWNERS_V001,
  PRESENTATION_OUTPUT_ACCEPTANCE_OBSERVATION_RULES_V001,
  PRESENTATION_OUTPUT_ACCEPTANCE_VIOLATION_CODES_V001,
  PRESENTATION_OUTPUT_APPROVED_CONTRACT_BINDINGS_V001,
  PRESENTATION_OUTPUT_FORMAL_IMPLEMENTATION_ROLES_V001,
  buildPresentationOutputAcceptanceReportV001,
  evaluatePresentationOutputAcceptanceChecksV001,
  inspectPresentationOutputAcceptanceObservationV001,
  makePresentationOutputAcceptancePassedObservationV001,
  validatePresentationOutputAcceptanceReportV001,
  validatePresentationOutputFormalJobV001,
  validatePresentationOutputRequestV001,
} from './presentation_output_contract_v001.mjs';
import {runPresentationOutputJobCliV001} from './run_presentation_output_job_v001.ts';

const ROOT = process.cwd();

const H = 'a'.repeat(64);
const EXPECTED_ACCEPTANCE_VIOLATION_CODES = Object.freeze([
  'OUTPUT_REQUEST_INVALID',
  'OUTPUT_REQUEST_BINDING_MISMATCH',
  'MEANING_PACKAGE_INVALID',
  'MEANING_PACKAGE_BINDING_MISMATCH',
  'BASE_MEDIA_INPUT_MISMATCH',
  'SOURCE_MEDIA_CAPABILITY_UNSUPPORTED',
  'SOURCE_MEDIA_BINDING_MISMATCH',
  'TIMELINE_COMPOSITION_UNSUPPORTED',
  'TIMELINE_FRAME_MAPPING_INVALID',
  'CAPTION_SOURCE_RESOLUTION_FAILED',
  'DISPLAY_PAGE_LAYOUT_UNREPRESENTABLE',
  'DISPLAY_PAGE_TIMELINE_UNREPRESENTABLE',
  'TITLE_STYLE_UNAVAILABLE',
  'STYLE_BINDING_MISMATCH',
  'PRESET_CAPABILITY_MISMATCH',
  'CROP_BINDING_MISMATCH',
  'MEANING_PROJECTION_CHANGED',
  'OUTPUT_PUBLICATION_TARGET_INVALID',
  'COMMON_RENDER_PLAN_INVALID',
]);
const EXPECTED_ACCEPTANCE_CHECKS = Object.freeze([
  'requestSchema',
  'meaningPackageBinding',
  'meaningPackage',
  'baseMediaInput',
  'sourceMediaCapability',
  'timelineCapability',
  'timelineFrameMapping',
  'styleResolution',
  'cropResolution',
  'captionSourceResolution',
  'captionDisplayLayout',
  'captionDisplayTimeline',
  'titleCapability',
  'meaningPreservation',
  'publicationTarget',
  'commonRenderPlan',
]);
const EXPECTED_ACCEPTANCE_DEPENDENCIES = Object.freeze({
  requestSchema: Object.freeze([]),
  meaningPackageBinding: Object.freeze(['requestSchema']),
  meaningPackage: Object.freeze(['meaningPackageBinding']),
  baseMediaInput: Object.freeze(['meaningPackage']),
  sourceMediaCapability: Object.freeze(['meaningPackage', 'baseMediaInput']),
  timelineCapability: Object.freeze(['meaningPackage']),
  timelineFrameMapping: Object.freeze(['timelineCapability', 'baseMediaInput']),
  styleResolution: Object.freeze(['requestSchema']),
  cropResolution: Object.freeze(['styleResolution', 'baseMediaInput']),
  captionSourceResolution: Object.freeze(['meaningPackage', 'timelineCapability']),
  captionDisplayLayout: Object.freeze(['captionSourceResolution', 'styleResolution']),
  captionDisplayTimeline: Object.freeze(['captionDisplayLayout', 'timelineFrameMapping']),
  titleCapability: Object.freeze(['meaningPackage', 'styleResolution']),
  meaningPreservation: Object.freeze(['captionDisplayTimeline', 'titleCapability']),
  publicationTarget: Object.freeze(['requestSchema']),
  commonRenderPlan: Object.freeze([
    'meaningPreservation', 'cropResolution', 'publicationTarget',
  ]),
});
const FAILURE_OBSERVATIONS = Object.freeze([
  Object.freeze({code: 'OUTPUT_REQUEST_INVALID', checkName: 'requestSchema',
    observationKey: 'requestSchemaValid', path: ''}),
  Object.freeze({code: 'OUTPUT_REQUEST_BINDING_MISMATCH', checkName: 'requestSchema',
    observationKey: 'requestBindingMatches', path: ''}),
  Object.freeze({code: 'MEANING_PACKAGE_INVALID', checkName: 'meaningPackage',
    observationKey: 'packageValid', path: ''}),
  Object.freeze({code: 'MEANING_PACKAGE_BINDING_MISMATCH',
    checkName: 'meaningPackageBinding', observationKey: 'bindingMatches',
    path: '/meaningInformationPackage'}),
  Object.freeze({code: 'BASE_MEDIA_INPUT_MISMATCH', checkName: 'baseMediaInput',
    observationKey: 'inputMatches', path: '/baseMediaInput'}),
  Object.freeze({code: 'SOURCE_MEDIA_CAPABILITY_UNSUPPORTED',
    checkName: 'sourceMediaCapability', observationKey: 'capabilitySupported',
    path: '/sourceMedia'}),
  Object.freeze({code: 'SOURCE_MEDIA_BINDING_MISMATCH',
    checkName: 'sourceMediaCapability', observationKey: 'bindingMatches',
    path: '/sourceMedia/0/mediaBinding'}),
  Object.freeze({code: 'TIMELINE_COMPOSITION_UNSUPPORTED',
    checkName: 'timelineCapability', observationKey: 'compositionSupported',
    path: '/timelineComposition'}),
  Object.freeze({code: 'TIMELINE_FRAME_MAPPING_INVALID',
    checkName: 'timelineFrameMapping', observationKey: 'mappingValid',
    path: '/timelineComposition/segments'}),
  Object.freeze({code: 'CAPTION_SOURCE_RESOLUTION_FAILED',
    checkName: 'captionSourceResolution', observationKey: 'sourceResolved',
    path: '/captions'}),
  Object.freeze({code: 'DISPLAY_PAGE_LAYOUT_UNREPRESENTABLE',
    checkName: 'captionDisplayLayout', observationKey: 'layoutRepresentable',
    path: '/captions'}),
  Object.freeze({code: 'DISPLAY_PAGE_TIMELINE_UNREPRESENTABLE',
    checkName: 'captionDisplayTimeline', observationKey: 'timelineRepresentable',
    path: '/captions'}),
  Object.freeze({code: 'TITLE_STYLE_UNAVAILABLE', checkName: 'titleCapability',
    observationKey: 'styleAvailable', path: '/title'}),
  Object.freeze({code: 'STYLE_BINDING_MISMATCH', checkName: 'styleResolution',
    observationKey: 'bindingMatches', path: '/styleInput/presetBinding'}),
  Object.freeze({code: 'PRESET_CAPABILITY_MISMATCH', checkName: 'styleResolution',
    observationKey: 'presetCapabilitySupported', path: '/styleInput/presetBinding'}),
  Object.freeze({code: 'CROP_BINDING_MISMATCH', checkName: 'cropResolution',
    observationKey: 'bindingMatches', path: '/styleInput/cropPolicy'}),
  Object.freeze({code: 'MEANING_PROJECTION_CHANGED', checkName: 'meaningPreservation',
    observationKey: 'projectionPreserved', path: '/captions'}),
  Object.freeze({code: 'OUTPUT_PUBLICATION_TARGET_INVALID',
    checkName: 'publicationTarget', observationKey: 'targetAvailable',
    path: '/publication'}),
  Object.freeze({code: 'COMMON_RENDER_PLAN_INVALID', checkName: 'commonRenderPlan',
    observationKey: 'planValid', path: '/renderPlan'}),
]);
const binding = (schemaVersion, name) => ({
  schemaVersion,
  path: `fixtures/${name}.json`,
  fileSha256: H,
  canonicalSha256: H,
});

const request = () => ({
  schemaVersion: 'presentation-output-request-v001',
  requestId: 'output-contract-fixture-v001',
  mode: 'formal-generation',
  meaningInformationPackage: binding(
    'zev-meaning-information-package-v001',
    'meaning-package',
  ),
  baseMediaInput: {
    baseMedia: {path: 'fixtures/base-media.mp4', fileSha256: H},
    timeline: binding('presentation-base-media-timeline-v002', 'timeline'),
    generationManifest: binding(
      'presentation-output-base-media-generation-manifest-v001',
      'generation-manifest',
    ),
    validationReceipt: binding(
      'presentation-output-base-media-validation-receipt-v001',
      'validation-receipt',
    ),
  },
  styleInput: {
    format: 'normal-landscape',
    screenLayoutId: null,
    presetBinding: {
      trustedRegistryBindings: binding('presentation-registry-trust-v001', 'trust'),
      presetRegistry: binding('presentation-preset-registry-v001', 'preset'),
      presetValidationIndex: binding('normal-landscape-preset-registry-v001', 'preset-index'),
      materialValidationIndex: binding('presentation-material-registry-empty-v001', 'material-index'),
      rendererTrust: binding('presentation-renderer-trust-v001', 'renderer-trust'),
      presetId: 'normal-landscape-readable-pop-v001',
    },
    captionLayoutPolicy: {
      maxLogicalWidthPerLine: 36,
      maxLinesPerDisplayPage: 2,
      characterWidthRule: 'U+0000..U+00FF=1; other Unicode code point=2',
      pageBreakPolicy: 'split-at-source-atom-boundary-or-reject',
    },
    cropPolicy: {mode: 'identity'},
    sceneTransitionPolicy: {mode: 'straight-cut-only'},
    audioPolicy: {mode: 'preserve-source-only'},
    materials: [],
  },
  publication: {
    outputId: 'output-contract-fixture-v001-output',
    controlRoot: 'evals/clip_composition/outputs/presentation/meaning-output-control/output-contract-fixture-v001',
    renderOutputRoot: 'evals/clip_composition/outputs/presentation/meaning-output-renders/output-contract-fixture-v001-output',
  },
});

const withRequestId = (value, requestId) => ({
  ...value,
  requestId,
  publication: {
    outputId: `${requestId}-output`,
    controlRoot:
      `evals/clip_composition/outputs/presentation/meaning-output-control/${requestId}`,
    renderOutputRoot:
      `evals/clip_composition/outputs/presentation/meaning-output-renders/${requestId}-output`,
  },
});

const requestBinding = () => ({
  schemaVersion: 'presentation-output-request-v001',
  path: 'evals/clip_composition/outputs/presentation/meaning-output-control/output-contract-fixture-v001/output-request.json',
  fileSha256: H,
  canonicalSha256: H,
});

const formalRequestBinding = value => ({
  ...requestBinding(),
  path: `evals/clip_composition/outputs/presentation/meaning-output-jobs/`
    + `${value.requestId}/output-request.json`,
});

const formalJob = value => ({
  schemaVersion: 'presentation-output-formal-job-v001',
  jobId: `${value.requestId}-formal-output`,
  requestBinding: formalRequestBinding(value),
  runtimeProfile: Object.fromEntries(
    ['node', 'tsx', 'remotion', 'browser', 'ffmpeg', 'ffprobe', 'imageMagick']
      .map(role => [role, {path: `/fixtures/${role}`, version: 'fixture-v001', fileSha256: H}]),
  ),
  implementationBindings: PRESENTATION_OUTPUT_FORMAL_IMPLEMENTATION_ROLES_V001
    .map(({path: implementationPath, role}) => ({
      path: implementationPath,
      fileSha256: H,
      role,
    })),
  approvedContractBindings: structuredClone(PRESENTATION_OUTPUT_APPROVED_CONTRACT_BINDINGS_V001),
  controlOutputRoot: value.publication.controlRoot,
  renderOutputRoot: value.publication.renderOutputRoot,
  expectedOutputId: value.publication.outputId,
  executionPolicy: {oneShot: true, allowRetry: false, allowLegacyArtifacts: false},
});

const captureCli = async argv => {
  const stdout = [];
  const stderr = [];
  const stdoutWrite = process.stdout.write;
  const stderrWrite = process.stderr.write;
  process.stdout.write = chunk => { stdout.push(Buffer.from(chunk)); return true; };
  process.stderr.write = chunk => { stderr.push(Buffer.from(chunk)); return true; };
  try {
    return {
      exitCode: await runPresentationOutputJobCliV001(argv),
      stdout: Buffer.concat(stdout),
      stderr: Buffer.concat(stderr),
    };
  } finally {
    process.stdout.write = stdoutWrite;
    process.stderr.write = stderrWrite;
  }
};

const captureCliWithWriter = async argv => {
  const stdout = [];
  const stderr = [];
  const result = await runPresentationOutputJobCliV001(argv, {
    stdout: chunk => { stdout.push(Buffer.from(chunk)); },
    stderr: chunk => { stderr.push(Buffer.from(chunk)); },
  });
  return {
    exitCode: result,
    stdout: Buffer.concat(stdout),
    stderr: Buffer.concat(stderr),
  };
};

const readNames = async relativePath => {
  try { return await readdir(path.join(ROOT, relativePath)); } catch (error) {
    if (error?.code === 'ENOENT') return [];
    throw error;
  }
};

const projections = Object.freeze({
  timelineProjection: {
    sourceMediaCount: 1,
    segmentCount: 1,
    outputFrameCount: 30,
    sourceToOutputMappingCanonicalSha256: H,
    baseMediaFileSha256: H,
  },
  captionDisplayProjection: {
    semanticCaptionCount: 1,
    displayPageCount: 1,
    displayLineCount: 1,
    maxObservedLogicalWidth: 10,
    captionPageLineMapCanonicalSha256: H,
  },
  meaningProjection: {
    timelineSegmentCount: 1,
    captionCount: 1,
    titleState: 'empty',
    semanticObservationCount: 0,
    captionTextSequenceCanonicalSha256: H,
    captionTimingSequenceCanonicalSha256: H,
    timelineCompositionCanonicalSha256: H,
  },
  resolvedStyleProjection: {
    format: 'normal-landscape',
    screenLayoutId: null,
    presetId: 'normal-landscape-readable-pop-v001',
    visualStateId: 'caption-default-v001',
    cropMode: 'identity',
    sceneTransitionMode: 'straight-cut-only',
    audioMode: 'preserve-source-only',
  },
  renderPlanBinding: binding('presentation-output-render-plan-v001', 'render-plan'),
});

const passedEvaluators = (failure = null, calls = []) => Object.fromEntries(
  PRESENTATION_OUTPUT_ACCEPTANCE_CHECKS_V001.map(name => [name, async () => {
    calls.push(name);
    const passedObservation = makePresentationOutputAcceptancePassedObservationV001(name);
    if (failure !== null && failure.checkName === name) {
      return inspectPresentationOutputAcceptanceObservationV001({
        checkName: name,
        observation: {
          ...passedObservation,
          [failure.observationKey]: false,
        },
      });
    }
    return inspectPresentationOutputAcceptanceObservationV001({
      checkName: name,
      observation: passedObservation,
    });
  }]),
);

const reportInputs = result => {
  const statuses = new Map(result.checks.map(entry => [entry.name, entry.status]));
  const passed = name => statuses.get(name) === 'passed';
  return {
    timelineProjection: passed('timelineFrameMapping') ? projections.timelineProjection : null,
    captionDisplayProjection: passed('captionDisplayTimeline')
      ? projections.captionDisplayProjection : null,
    meaningProjection: passed('meaningPackage') ? projections.meaningProjection : null,
    resolvedStyleProjection: passed('styleResolution') && passed('cropResolution')
      ? projections.resolvedStyleProjection : null,
    renderPlanBinding: passed('commonRenderPlan') ? projections.renderPlanBinding : null,
  };
};

const expectedDagStatuses = failedCheck => {
  const statuses = new Map();
  const invoked = [];
  for (const checkName of EXPECTED_ACCEPTANCE_CHECKS) {
    const runnable = EXPECTED_ACCEPTANCE_DEPENDENCIES[checkName]
      .every(dependency => statuses.get(dependency) === 'passed');
    const status = !runnable
      ? 'blocked'
      : checkName === failedCheck
        ? 'failed'
        : 'passed';
    statuses.set(checkName, status);
    if (runnable) invoked.push(checkName);
  }
  return {statuses, invoked};
};

const replaceObjectKeyOrder = value => ({
  jobId: value.jobId,
  schemaVersion: value.schemaVersion,
  requestBinding: value.requestBinding,
  runtimeProfile: value.runtimeProfile,
  implementationBindings: value.implementationBindings,
  approvedContractBindings: value.approvedContractBindings,
  controlOutputRoot: value.controlOutputRoot,
  renderOutputRoot: value.renderOutputRoot,
  expectedOutputId: value.expectedOutputId,
  executionPolicy: value.executionPolicy,
});

test('OCT001: output requestからaccepted reportを決定的に構築する', async () => {
  const value = request();
  const job = formalJob(value);
  assert.equal(validatePresentationOutputRequestV001(value), true);
  assert.equal(validatePresentationOutputFormalJobV001(job), true);
  assert.equal(validatePresentationOutputFormalJobV001(job, value), true);
  assert.deepEqual(
    [...PRESENTATION_OUTPUT_ACCEPTANCE_CHECKS_V001],
    [...EXPECTED_ACCEPTANCE_CHECKS],
  );
  assert.deepEqual(
    PRESENTATION_OUTPUT_ACCEPTANCE_CHECK_DEPENDENCIES_V001,
    EXPECTED_ACCEPTANCE_DEPENDENCIES,
  );

  // O03 owns the exact formal-job shape and derived paths.  The fixed tool
  // identities themselves remain O05/O07 live-binding responsibility, so a
  // structurally valid replacement is accepted here and rejected there.
  const structurallyValidToolReplacement = structuredClone(job);
  structurallyValidToolReplacement.runtimeProfile.node = {
    path: '/fixtures/replacement-node',
    version: 'replacement-v001',
    fileSha256: 'b'.repeat(64),
  };
  assert.equal(
    validatePresentationOutputFormalJobV001(structurallyValidToolReplacement, value),
    true,
  );
  const malformedRuntime = structuredClone(job);
  malformedRuntime.runtimeProfile.node.path = 'relative/node';
  const missingRuntime = structuredClone(job);
  delete missingRuntime.runtimeProfile.imageMagick;
  const reorderedRuntime = structuredClone(job);
  reorderedRuntime.runtimeProfile = {
    tsx: reorderedRuntime.runtimeProfile.tsx,
    node: reorderedRuntime.runtimeProfile.node,
    remotion: reorderedRuntime.runtimeProfile.remotion,
    browser: reorderedRuntime.runtimeProfile.browser,
    ffmpeg: reorderedRuntime.runtimeProfile.ffmpeg,
    ffprobe: reorderedRuntime.runtimeProfile.ffprobe,
    imageMagick: reorderedRuntime.runtimeProfile.imageMagick,
  };
  const wrongImplementationRole = structuredClone(job);
  wrongImplementationRole.implementationBindings[0].role = 'foreign-role';
  const wrongImplementationPath = structuredClone(job);
  wrongImplementationPath.implementationBindings[0].path = 'fixtures/foreign.mjs';
  const missingImplementation = structuredClone(job);
  missingImplementation.implementationBindings.pop();
  const sparseImplementation = structuredClone(job);
  delete sparseImplementation.implementationBindings[3];
  const wrongContract = structuredClone(job);
  wrongContract.approvedContractBindings[0].fileSha256 = 'b'.repeat(64);
  const wrongRequestPath = structuredClone(job);
  wrongRequestPath.requestBinding.path = 'fixtures/output-request.json';
  const wrongControlRoot = structuredClone(job);
  wrongControlRoot.controlOutputRoot = 'fixtures/control';
  const wrongRenderRoot = structuredClone(job);
  wrongRenderRoot.renderOutputRoot = 'fixtures/render';
  const wrongOutputId = structuredClone(job);
  wrongOutputId.expectedOutputId = 'foreign-output';
  const retryEnabled = structuredClone(job);
  retryEnabled.executionPolicy.allowRetry = true;
  const extraKey = {...structuredClone(job), uncontracted: true};
  for (const invalid of [
    replaceObjectKeyOrder(job),
    malformedRuntime,
    missingRuntime,
    reorderedRuntime,
    wrongImplementationRole,
    wrongImplementationPath,
    missingImplementation,
    sparseImplementation,
    wrongContract,
    wrongRequestPath,
    wrongControlRoot,
    wrongRenderRoot,
    wrongOutputId,
    retryEnabled,
    extraKey,
  ]) {
    assert.equal(validatePresentationOutputFormalJobV001(invalid, value), false);
  }
  const longestClosedRequestId = `r${'a'.repeat(72)}`;
  assert.equal(longestClosedRequestId.length, 73);
  assert.equal(
    validatePresentationOutputRequestV001(
      withRequestId(request(), longestClosedRequestId),
    ),
    true,
  );
  const firstUnclosedRequestId = `r${'a'.repeat(73)}`;
  assert.equal(firstUnclosedRequestId.length, 74);
  assert.equal(
    validatePresentationOutputRequestV001(
      withRequestId(request(), firstUnclosedRequestId),
    ),
    false,
  );
  const sparseMaterialsRequest = request();
  sparseMaterialsRequest.styleInput.materials.length = 1;
  assert.equal(validatePresentationOutputRequestV001(sparseMaterialsRequest), false);
  const calls = [];
  const evaluation = await evaluatePresentationOutputAcceptanceChecksV001({
    evaluators: passedEvaluators(null, calls),
  });
  assert.deepEqual(calls, [...EXPECTED_ACCEPTANCE_CHECKS]);
  const report = buildPresentationOutputAcceptanceReportV001({
    request: value,
    requestBinding: requestBinding(),
    checks: evaluation.checks,
    violations: evaluation.violations,
    ...reportInputs(evaluation),
  });
  assert.equal(report.status, 'accepted-for-render');
  assert.equal(validatePresentationOutputAcceptanceReportV001(report), true);
  assert.equal(report.reportId, `${value.requestId}-acceptance`);
  assert.deepEqual(evaluation.checks.map(check => check.name), [
    ...PRESENTATION_OUTPUT_ACCEPTANCE_CHECKS_V001,
  ]);
  assert.ok(evaluation.checks.every(check => check.status === 'passed'));
  const extraReportKey = {...structuredClone(report), uncontracted: true};
  const reorderedChecks = structuredClone(report);
  [reorderedChecks.checks[0], reorderedChecks.checks[1]] =
    [reorderedChecks.checks[1], reorderedChecks.checks[0]];
  const missingProjection = structuredClone(report);
  missingProjection.captionDisplayProjection = null;
  const sparseChecks = structuredClone(report);
  delete sparseChecks.checks[4];
  const foreignRequestBinding = structuredClone(report);
  foreignRequestBinding.requestBinding.path = foreignRequestBinding.requestBinding.path
    .replace(value.requestId, 'foreign-request');
  for (const invalidReport of [
    extraReportKey,
    reorderedChecks,
    missingProjection,
    sparseChecks,
    foreignRequestBinding,
  ]) {
    assert.equal(validatePresentationOutputAcceptanceReportV001(invalidReport), false);
  }

  const guarded = await captureCli([]);
  assert.equal(guarded.exitCode, 2);
  assert.equal(guarded.stdout.length, 0);
  assert.deepEqual(JSON.parse(guarded.stderr.toString('utf8')), {
    schemaVersion: 'presentation-output-runner-diagnostic-v001',
    status: 'fatal',
    stage: 'job-validation',
    diagnosticCode: 'OUTPUT_FORMAL_JOB_INVALID',
  });
  assert.deepEqual(await captureCliWithWriter([]), guarded);

  const roots = [
    'evals/clip_composition/outputs/presentation/meaning-output-control',
    'evals/clip_composition/outputs/presentation/meaning-output-renders',
    'evals/clip_composition/outputs/presentation/meaning-output-render-failures',
  ];
  const beforeImport = await Promise.all(roots.map(readNames));
  await import(`./run_presentation_output_job_v001.ts?oct001=${Date.now()}`);
  const afterImport = await Promise.all(roots.map(readNames));
  assert.deepEqual(afterImport, beforeImport);

  // O13 owns the full media fixture for actual exit 0/1.  O09 verifies that
  // both branches use this same guarded production CLI export rather than a
  // duplicated output-contract runner.
  const o13Source = await readFile(
    path.join(ROOT, 'evals/clip_composition/presentation_output_render_plan_v001.test.mjs'),
    'utf8',
  );
  assert.match(o13Source,
    /const exitCode = await runPresentationOutputJobCliV001\(\s*\[jobPath\],\s*\{stdout, stderr\},\s*\);/u);
  const runnerSource = await readFile(
    path.join(ROOT, 'evals/clip_composition/run_presentation_output_job_v001.ts'),
    'utf8',
  );
  assert.match(runnerSource,
    /export async function runPresentationOutputJobCliV001\(\s*argv = process\.argv\.slice\(2\),\s*writers:[\s\S]*?= \{\},\s*\)/u);
  assert.match(runnerSource,
    /const writeStdout = writers\.stdout \?\? \(\(chunk: Buffer\) => process\.stdout\.write\(chunk\)\);/u);
  assert.match(runnerSource,
    /const writeStderr = writers\.stderr \?\? \(\(chunk: Buffer\) => process\.stderr\.write\(chunk\)\);/u);
  assert.match(runnerSource, /runPresentationOutputJobCliV001\(\)\.then\(/u);
  assert.match(runnerSource,
    /runPresentationOutputJobV001\(\{\s*workspaceRoot: process\.cwd\(\),\s*jobPath: argv\[0\],\s*\}\)/u);
  const successStart = o13Source.indexOf("test('OEE001:");
  const rejectedStart = o13Source.indexOf("test('OEE004:");
  const nextAfterRejected = o13Source.indexOf("test('OEE005:");
  assert.ok(successStart >= 0 && rejectedStart > successStart
    && nextAfterRejected > rejectedStart);
  const successOwner = o13Source.slice(successStart, rejectedStart);
  const rejectedOwner = o13Source.slice(rejectedStart, nextAfterRejected);
  assert.match(successOwner, /runFormalOutputE2e\('normal-landscape', \{useCli: true\}\)/u);
  assert.match(successOwner, /assert\.equal\(result\.observed\.exitCode, 0\)/u);
  assert.match(successOwner,
    /assert\.deepEqual\(result\.cli\.stdout, renderFormalBytes\(result\.manifest\)\)/u);
  assert.match(rejectedOwner, /useCli: true/u);
  assert.match(rejectedOwner, /assert\.equal\(result\.observed\.exitCode, 1\)/u);
  assert.match(rejectedOwner,
    /assert\.deepEqual\(result\.cli\.stdout, renderFormalBytes\(result\.acceptance\)\)/u);
  assert.match(rejectedOwner, /assert\.equal\(result\.cli\.stderr\.length, 0\)/u);
});

const observedCodes = [];
FAILURE_OBSERVATIONS.forEach((failure, index) => {
  const {code} = failure;
  const id = `OCT${String(index + 2).padStart(3, '0')}`;
  test(`${id}: ${code}を所有checkで一度だけ発火する`, async () => {
    const calls = [];
    const evaluation = await evaluatePresentationOutputAcceptanceChecksV001({
      evaluators: passedEvaluators(failure, calls),
    });
    assert.deepEqual(evaluation.violations, [{
      code,
      path: failure.path,
      relatedIds: [],
    }]);
    const owner = PRESENTATION_OUTPUT_ACCEPTANCE_CODE_OWNERS_V001[code];
    assert.equal(owner, failure.checkName);
    assert.equal(evaluation.checks.find(entry => entry.name === owner)?.status, 'failed');
    assert.equal(evaluation.checks.filter(entry => entry.status === 'failed').length, 1);
    const expected = expectedDagStatuses(owner);
    assert.deepEqual(calls, expected.invoked);
    assert.deepEqual(
      evaluation.checks.map(entry => [entry.name, entry.status]),
      [...expected.statuses],
    );
    const ownerIndex = PRESENTATION_OUTPUT_ACCEPTANCE_CHECKS_V001.indexOf(owner);
    assert.ok(evaluation.checks.slice(0, ownerIndex)
      .every(entry => entry.status === 'passed'));
    assert.ok(evaluation.checks
      .filter(entry => entry.status === 'blocked')
      .every(entry => !calls.includes(entry.name)));
    const report = buildPresentationOutputAcceptanceReportV001({
      request: request(),
      requestBinding: requestBinding(),
      checks: evaluation.checks,
      violations: evaluation.violations,
      ...reportInputs(evaluation),
    });
    assert.equal(report.status, 'rejected');
    assert.equal(validatePresentationOutputAcceptanceReportV001(report), true);
    if (index === 0) {
      const duplicateViolation = structuredClone(report);
      duplicateViolation.violations.push(structuredClone(duplicateViolation.violations[0]));
      assert.equal(
        validatePresentationOutputAcceptanceReportV001(duplicateViolation),
        false,
      );
    }
    observedCodes.push(code);
  });
});

test('OCT021: export違反code集合と実発火観測集合が完全一致する', () => {
  assert.equal(1 + FAILURE_OBSERVATIONS.length + 1, 21);
  assert.deepEqual(
    FAILURE_OBSERVATIONS.map(entry => entry.code),
    [...EXPECTED_ACCEPTANCE_VIOLATION_CODES],
  );
  assert.deepEqual(
    [...PRESENTATION_OUTPUT_ACCEPTANCE_VIOLATION_CODES_V001],
    [...EXPECTED_ACCEPTANCE_VIOLATION_CODES],
  );
  assert.deepEqual(
    Object.entries(PRESENTATION_OUTPUT_ACCEPTANCE_CODE_OWNERS_V001),
    FAILURE_OBSERVATIONS.map(entry => [entry.code, entry.checkName]),
  );
  assert.deepEqual(
    EXPECTED_ACCEPTANCE_CHECKS.flatMap(checkName =>
      PRESENTATION_OUTPUT_ACCEPTANCE_OBSERVATION_RULES_V001[checkName]
        .map(rule => rule.code)),
    [
      'OUTPUT_REQUEST_INVALID',
      'OUTPUT_REQUEST_BINDING_MISMATCH',
      'MEANING_PACKAGE_BINDING_MISMATCH',
      'MEANING_PACKAGE_INVALID',
      'BASE_MEDIA_INPUT_MISMATCH',
      'SOURCE_MEDIA_CAPABILITY_UNSUPPORTED',
      'SOURCE_MEDIA_BINDING_MISMATCH',
      'TIMELINE_COMPOSITION_UNSUPPORTED',
      'TIMELINE_FRAME_MAPPING_INVALID',
      'STYLE_BINDING_MISMATCH',
      'PRESET_CAPABILITY_MISMATCH',
      'CROP_BINDING_MISMATCH',
      'CAPTION_SOURCE_RESOLUTION_FAILED',
      'DISPLAY_PAGE_LAYOUT_UNREPRESENTABLE',
      'DISPLAY_PAGE_TIMELINE_UNREPRESENTABLE',
      'TITLE_STYLE_UNAVAILABLE',
      'MEANING_PROJECTION_CHANGED',
      'OUTPUT_PUBLICATION_TARGET_INVALID',
      'COMMON_RENDER_PLAN_INVALID',
    ],
  );
  assert.deepEqual(observedCodes, [...EXPECTED_ACCEPTANCE_VIOLATION_CODES]);
});
