import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import {fileURLToPath} from 'node:url';

import {canonicalJson} from './presentation_caption_contract_v002.mjs';
import {validatePresentationInstructionContractV003} from './presentation_instruction_contract_v003.mjs';
import {
  PRESENTATION_RENDERER_QC_VIOLATION_CODES,
  evaluatePresentationRendererQcV002,
  evaluatePresentationReviewRendererQcV003,
} from './presentation_renderer_qc_v002.mjs';
import {
  PRESENTATION_REVIEW_RENDER_APPLICATION_RESULTS_SCHEMA_VERSION_V003,
  PRESENTATION_REVIEW_RENDER_OUTPUT_NAMES_V003,
  PRESENTATION_REVIEW_RENDER_PLAN_DRAFT_SCHEMA_VERSION_V003,
  PRESENTATION_REVIEW_RENDER_PLAN_SCHEMA_VERSION_V003,
  buildPresentationReviewRenderPlanV003,
  executePresentationReviewRendererV003,
  resolvePresentationReviewOutputDirectoryV003,
  validatePresentationReviewRenderJobV003,
  validatePresentationReviewRenderRequestV003,
} from './render_presentation_review_v003.mjs';
import {
  actualToolVersions,
  executeValidatedPresentationDrawAndQcV001,
} from './render_presentation_v002.mjs';

const MODULE_DIRECTORY = path.dirname(fileURLToPath(import.meta.url));
const WORKSPACE_ROOT = path.resolve(MODULE_DIRECTORY, '../..');
const PAIR_DIRECTORY = path.join(
  MODULE_DIRECTORY,
  'outputs/presentation/caption-display-pairs/'
    + 'DmWu0jVQfTE-candidate-13-caption-b6-v004',
);
const JOB_PATH = path.join(
  MODULE_DIRECTORY,
  'outputs/presentation/review-render-jobs/'
    + 'DmWu0jVQfTE-candidate-13-caption-b6-v004-v001.json',
);
const sha256Bytes = (bytes) => createHash('sha256').update(bytes).digest('hex');
const sha256Canonical = (value) => sha256Bytes(canonicalJson(value));
const readJson = async (filePath) => JSON.parse(await readFile(filePath, 'utf8'));
const clone = (value) => structuredClone(value);
const resolveBindingPath = (baseDirectory, value) => {
  if (path.isAbsolute(value)) return value;
  return value.startsWith('evals/') || value.startsWith('runner/')
    ? path.resolve(WORKSPACE_ROOT, value)
    : path.resolve(baseDirectory, value);
};

const loadActual = async () => {
  const request = await readJson(path.join(PAIR_DIRECTORY, 'review-render-request.json'));
  const displayPlan = await readJson(path.join(PAIR_DIRECTORY, request.displayPlanBinding.path));
  const instructionBundle =
    await readJson(path.join(PAIR_DIRECTORY, request.instructionBundleBinding.path));
  const retainedSourceAtoms = await readJson(
    resolveBindingPath(PAIR_DIRECTORY, displayPlan.sourceAtomBinding.sourceAtoms.path),
  );
  const trustedRegistryBindings = await readJson(
    resolveBindingPath(
      PAIR_DIRECTORY,
      request.registryBindings.trustedRegistryBindings.path,
    ),
  );
  const presetRegistry = await readJson(
    resolveBindingPath(PAIR_DIRECTORY, request.registryBindings.presetRegistry.path),
  );
  const presetValidationIndex = await readJson(
    resolveBindingPath(PAIR_DIRECTORY, request.registryBindings.presetValidationIndex.path),
  );
  const materialValidationIndex = await readJson(
    resolveBindingPath(PAIR_DIRECTORY, request.registryBindings.materialValidationIndex.path),
  );
  const timeline = await readJson(
    resolveBindingPath(PAIR_DIRECTORY, request.baseMediaBinding.timeline.path),
  );
  const trust = await readJson(
    path.join(
      MODULE_DIRECTORY,
      'registries/presentation/presentation-renderer-trust-v001/trust.json',
    ),
  );
  return {
    request,
    displayPlan,
    instructionBundle,
    retainedSourceAtoms,
    trustedRegistryBindings,
    presetRegistry,
    presetValidationIndex,
    materialValidationIndex,
    timeline,
    trust,
  };
};

const contractInput = (actual, instructionBundle = actual.instructionBundle) => ({
  instructionBundle,
  displayPlan: actual.displayPlan,
  retainedSourceAtoms: actual.retainedSourceAtoms,
  trustedRegistryBindings: actual.trustedRegistryBindings,
  presetRegistry: actual.presetRegistry,
  presetValidationIndex: actual.presetValidationIndex,
  materialValidationIndex: actual.materialValidationIndex,
});

const makeQcInput = (plan, planFile) => {
  const element = clone(plan.elements[0]);
  const qcPlan = {...clone(plan), elements: [element]};
  const overlaySha256 = 'e'.repeat(64);
  const overlayFile = 'overlays/01.png';
  const overlayPropsSha256 = 'd'.repeat(64);
  const lineAlphaBounds = element.indexedLines.map((line, index) => ({
    lineIndex: line.lineIndex,
    left: 120,
    top: 760 + index * 80,
    right: 880,
    bottom: 820 + index * 80,
  }));
  return {
    plan: qcPlan,
    applicationResults: [{
      instructionId: element.instructionId,
      requestedPresetId: element.presetId,
      appliedPresetId: element.presetId,
      appliedPresetRegistryVersion: element.registryVersion,
      appliedOverlayPropsCanonicalSha256: overlayPropsSha256,
      overlayFile,
      overlaySha256,
      finalPlanElementReference: {
        planFile,
        instructionId: element.instructionId,
        canonicalSha256: sha256Canonical({...element, overlaySha256}),
      },
    }],
    overlayInspections: [{
      instructionId: element.instructionId,
      alphaMax: 1,
      alphaBounds: {left: 100, top: 740, right: 900, bottom: 940},
      lineCount: element.indexedLines.length,
      lineAlphaBounds,
      visibilityComparisonBasis: 'same-composite-with-instruction-omitted',
      representativeFrame: element.startFrame + Math.floor(element.displayFrameCount / 2),
      changedPixelsAgainstInstructionOmittedFrame: 1,
      appliedOverlayPropsCanonicalSha256: overlayPropsSha256,
      overlayFile,
      overlaySha256,
    }],
    mediaInspection: {
      durationMs: 84500,
      video: {
        codecName: 'h264',
        width: 1920,
        height: 1080,
        fps: 30,
        frameCount: 2535,
      },
      audio: {codecName: 'aac', packetPayloadSha256: 'b'.repeat(64)},
    },
    expectedAudio: {
      present: true,
      codecName: 'aac',
      packetPayloadSha256: 'b'.repeat(64),
    },
    expectedFrameCount: 2535,
    canvas: qcPlan.canvas,
  };
};

test('formal v003 job is exact and binds all three implementation files and tools', async () => {
  const job = await readJson(JOB_PATH);
  assert.equal(validatePresentationReviewRenderJobV003(job).status, 'passed');
  for (const binding of job.implementationBindings) {
    const actualSha = sha256Bytes(await readFile(path.resolve(WORKSPACE_ROOT, binding.path)));
    assert.equal(actualSha, binding.fileSha256);
  }
  const requestBytes = await readFile(path.resolve(WORKSPACE_ROOT, job.reviewRenderRequest.path));
  const request = JSON.parse(requestBytes.toString('utf8'));
  assert.equal(sha256Bytes(requestBytes), job.reviewRenderRequest.fileSha256);
  assert.equal(sha256Canonical(request), job.reviewRenderRequest.canonicalSha256);
  assert.deepEqual(job.runtimeProfile, await actualToolVersions());

  const unknown = {...job, unexpected: true};
  assert.equal(validatePresentationReviewRenderJobV003(unknown).status, 'failed');
  const wrongRole = clone(job);
  wrongRole.implementationBindings[0].role = 'fallback-renderer';
  assert.equal(validatePresentationReviewRenderJobV003(wrongRole).status, 'failed');
  const wrongRuntime = clone(job);
  wrongRuntime.runtimeProfile.nodeVersion = 'v0.0.0';
  assert.equal(validatePresentationReviewRenderJobV003(wrongRuntime).status, 'passed');
  const runtimeMismatch = await executePresentationReviewRendererV003(wrongRuntime);
  assert.equal(runtimeMismatch.exitCode, 1);
  assert.equal(runtimeMismatch.failure.stage, 'runtime-profile');
});

test('review request fixes review-only state and the six requested QC outcomes', async () => {
  const {request} = await loadActual();
  assert.equal(validatePresentationReviewRenderRequestV003(request).status, 'passed');
  assert.equal(request.reviewOnly, true);
  assert.equal(request.publicationAllowed, false);
  assert.deepEqual(request.expectedOutput.requiredQc, [
    'preset_applied',
    'no_text_overlap',
    'inside_safe_area',
    'no_missing_caption',
    'base_frame_count_preserved',
    'base_audio_preserved',
  ]);

  const publicRequest = clone(request);
  publicRequest.publicationAllowed = true;
  assert.equal(validatePresentationReviewRenderRequestV003(publicRequest).status, 'failed');
  const v2Request = clone(request);
  v2Request.schemaVersion = 'presentation-render-job-v002';
  assert.equal(validatePresentationReviewRenderRequestV003(v2Request).status, 'failed');
});

test('every bound review input still matches its recorded file and canonical hash', async () => {
  const {request, displayPlan} = await loadActual();
  const entries = [
    request.displayPlanBinding,
    request.instructionBundleBinding,
    request.captionCheckBinding,
    request.layoutPreflightBinding,
    request.baseMediaBinding.timeline,
    request.baseMediaBinding.generationManifest,
    request.baseMediaBinding.validationReport,
    ...Object.values(request.registryBindings),
    displayPlan.sourceAtomBinding.generationManifest,
    displayPlan.sourceAtomBinding.sourceAtoms,
    displayPlan.sourceAtomBinding.validationReport,
  ];
  for (const entry of entries) {
    const absolutePath = resolveBindingPath(PAIR_DIRECTORY, entry.path);
    const bytes = await readFile(absolutePath);
    const value = JSON.parse(bytes.toString('utf8'));
    assert.equal(sha256Bytes(bytes), entry.fileSha256, entry.path);
    assert.equal(sha256Canonical(value), entry.canonicalSha256, entry.path);
  }
  const baseMediaPath = resolveBindingPath(
    PAIR_DIRECTORY,
    request.baseMediaBinding.baseMedia.path,
  );
  assert.equal(
    sha256Bytes(await readFile(baseMediaPath)),
    request.baseMediaBinding.baseMedia.fileSha256,
  );
});

test('actual v003 input is accepted only as review input with its declared G2 limits', async () => {
  const actual = await loadActual();
  const report = validatePresentationInstructionContractV003(contractInput(actual));
  assert.equal(report.status, 'passed_with_declared_limit');
  assert.deepEqual(report.violations, []);
  assert.equal(report.captionValidation.status, 'passed_with_declared_limit');
});

test('G4-G7 kinds, material references, and a different preset are rejected before drawing', async () => {
  const actual = await loadActual();
  const cases = [
    (bundle) => {
      bundle.instructionSet.instructions[0].kind = 'emphasis-strong-emotion';
    },
    (bundle) => {
      bundle.instructionSet.instructions[0].materialRefs = ['unapproved-material'];
    },
    (bundle) => {
      bundle.instructionSet.instructions[0].presetId = 'another-preset';
    },
  ];
  for (const mutate of cases) {
    const bundle = clone(actual.instructionBundle);
    mutate(bundle);
    const report = validatePresentationInstructionContractV003(contractInput(actual, bundle));
    assert.equal(report.status, 'failed');
    assert.ok(report.violations.length > 0);
  }
});

test('v003 maps 20 captions and 40 explicit lines directly to the 2,535-frame engine plan', async () => {
  const actual = await loadActual();
  const report = buildPresentationReviewRenderPlanV003({
    instructionBundle: actual.instructionBundle,
    displayPlan: actual.displayPlan,
    presetRegistry: actual.presetRegistry,
    timeline: actual.timeline,
    layoutRules: actual.trust.layoutRules,
  });
  assert.equal(report.status, 'passed');
  assert.equal(
    report.plan.schemaVersion,
    PRESENTATION_REVIEW_RENDER_PLAN_DRAFT_SCHEMA_VERSION_V003,
  );
  assert.equal(report.plan.rendererVersion, 'presentation-review-renderer-v003');
  assert.equal(report.plan.elements.length, 20);
  assert.equal(
    report.plan.elements.reduce((count, element) => count + element.indexedLines.length, 0),
    40,
  );
  assert.deepEqual(
    [report.plan.elements[0].startFrame, report.plan.elements[0].endFrameExclusive],
    [0, 108],
  );
  assert.deepEqual(
    [report.plan.elements.at(-1).startFrame, report.plan.elements.at(-1).endFrameExclusive],
    [2466, 2535],
  );
  assert.ok(report.plan.elements.every((element) => (
    element.displayFrameCount > 0
    && element.kind === 'speech-caption'
    && element.presetId === 'normal-landscape-readable-pop-v001'
    && element.materialRefs.length === 0
  )));
  for (let index = 1; index < report.plan.elements.length; index += 1) {
    assert.ok(
      report.plan.elements[index].startFrame
        >= report.plan.elements[index - 1].endFrameExclusive,
    );
  }
});

test('the v003 route calls the single shared draw-and-QC implementation', async () => {
  assert.equal(typeof executeValidatedPresentationDrawAndQcV001, 'function');
  const source = await readFile(
    path.join(MODULE_DIRECTORY, 'render_presentation_review_v003.mjs'),
    'utf8',
  );
  assert.match(
    source,
    /executeValidatedPresentationDrawAndQcV001\(\{\s*outputDirectory,/,
  );
  assert.match(source, /artifactNames: PRESENTATION_REVIEW_RENDER_OUTPUT_NAMES_V003/);
  assert.match(source, /evaluateQc: evaluatePresentationReviewRendererQcV003/);
  assert.doesNotMatch(source, /presentation-render-job-v002/);
  assert.doesNotMatch(source, /presentation-render-plan-v002\.json/);
  assert.doesNotMatch(source, /presentation-render-application-results-v002/);
  assert.doesNotMatch(source, /presentation-render-qc-v002\.json/);
  assert.doesNotMatch(source, /fallback/i);
});

test('the six review checks remain owned by the existing renderer QC', () => {
  for (const code of [
    'APPLIED_PRESET_MISMATCH',
    'LAYOUT_LINE_POSITIVE_INTERSECTION',
    'INSTRUCTION_TEMPORAL_SPATIAL_COLLISION',
    'LAYOUT_SAFE_AREA_VIOLATION',
    'INSTRUCTION_RENDER_MISSING',
    'INSTRUCTION_RENDER_DUPLICATED',
    'OUTPUT_ELEMENT_NOT_VISIBLE',
    'OUTPUT_AUDIO_PACKET_HASH_MISMATCH',
    'OUTPUT_FORMAT_MISMATCH',
  ]) {
    assert.ok(PRESENTATION_RENDERER_QC_VIOLATION_CODES.includes(code), code);
  }
});

test('the same QC calculations accept only their own v002 or v003 plan reference', async () => {
  const actual = await loadActual();
  const planReport = buildPresentationReviewRenderPlanV003({
    instructionBundle: actual.instructionBundle,
    displayPlan: actual.displayPlan,
    presetRegistry: actual.presetRegistry,
    timeline: actual.timeline,
    layoutRules: actual.trust.layoutRules,
  });
  assert.equal(planReport.status, 'passed');

  const v3 = evaluatePresentationReviewRendererQcV003(
    makeQcInput(planReport.plan, PRESENTATION_REVIEW_RENDER_OUTPUT_NAMES_V003.plan),
  );
  assert.equal(v3.status, 'passed');
  assert.equal(v3.schemaVersion, 'presentation-review-render-qc-v003');

  const wrongPlanReference = evaluatePresentationReviewRendererQcV003(
    makeQcInput(planReport.plan, 'presentation-render-plan-v002.json'),
  );
  assert.ok(
    wrongPlanReference.violations.some((entry) => entry.code === 'INSTRUCTION_RENDER_MISSING'),
  );

  const v2 = evaluatePresentationRendererQcV002(
    makeQcInput(planReport.plan, 'presentation-render-plan-v002.json'),
  );
  assert.equal(v2.status, 'passed');
  assert.equal(v2.schemaVersion, 'presentation-render-qc-v002');
});

test('v003 output names and schemas are versioned without a v002 artifact alias', () => {
  assert.deepEqual(PRESENTATION_REVIEW_RENDER_OUTPUT_NAMES_V003, {
    video: 'presentation-review-rendered-v003.mp4',
    overlays: 'overlays',
    plan: 'presentation-review-render-plan-v003.json',
    applicationResults: 'presentation-review-render-application-results-v003.json',
    manifest: 'presentation-review-render-manifest-v003.json',
    qc: 'presentation-review-render-qc-v003.json',
    failure: 'presentation-review-render-failure-v003.json',
  });
  assert.equal(
    PRESENTATION_REVIEW_RENDER_PLAN_SCHEMA_VERSION_V003,
    'presentation-review-render-plan-v003',
  );
  assert.equal(
    PRESENTATION_REVIEW_RENDER_APPLICATION_RESULTS_SCHEMA_VERSION_V003,
    'presentation-review-render-application-results-v003',
  );
});

test('review output paths resolve from the workspace and do not depend on process cwd', () => {
  const relative = 'evals/clip_composition/outputs/presentation/review-renders/example-v003';
  assert.equal(
    resolvePresentationReviewOutputDirectoryV003(relative),
    path.join(WORKSPACE_ROOT, relative),
  );
});
