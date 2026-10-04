import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import path from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';
import test from 'node:test';

const rendererPath = process.env.ZEV_DIGEST_RENDERER_TEST_SOURCE
  ?? fileURLToPath(new URL('./render_presentation_v002.mjs', import.meta.url));
const source = await readFile(rendererPath, 'utf8');
const sharedImport = "await import('./digest_representative_completion_v001.mjs')";
const workspaceRoot = process.env.ZEV_DIGEST_RENDERER_TEST_WORKSPACE
  ?? path.resolve(path.dirname(rendererPath), '../..');
const oldQcMethod = 'test-only-full-qc-method';
const integrityMethod = 'test-only-integrity-qc-method';
const policy = Object.freeze({schemaVersion: 'digest-representative-verification-policy-v001',
  mode: 'representative-plus-rules-v001', representativeInstructionIds: ['caption-a'],
  permittedMethods: ['still-frame'], confirmationRecordPath: 'runtime/artifacts/test/attempt-001/confirmation.json'});
const plan = {canvas: {fps: 30}, elements: [{instructionId: 'caption-a', visualState: {stateId: 'caption-core-v001'}}]};

// Exercise the actual private control flow without opening a production capability,
// media encoder, output reservation or filesystem. Only imports/dependencies are
// replaced with explicit test spies; no new production export or test grant exists.
function compileActualFunction(text, dependencies) {
  const imported = text.replaceAll(sharedImport, 'await representativeModule()');
  return Function(...Object.keys(dependencies), 'return (' + imported + ');')(...Object.values(dependencies));
}
function gate(api, observations = {}) {
  const start = source.indexOf('export async function executeValidatedPresentationDrawAndQcV001(');
  const end = source.indexOf('  let reservation;', start);
  assert(start >= 0 && end > start);
  const text = source.slice(start, end).replace('export async function', 'async function')
    + 'return {verificationPolicy, effectiveCounterfactualQc, plan, expectedFrameCount};\n}';
  return compileActualFunction(text, {
    qualifyDigestStorageContextV001: async () => {observations.qualifications = (observations.qualifications ?? 0) + 1;},
    representativeModule: async () => api,
    path,
    isObject: value => value !== null && typeof value === 'object' && !Array.isArray(value),
    isNonEmptyString: value => typeof value === 'string' && value.length > 0,
    PRESENTATION_RENDERER_OUTPUT_NAMES: {},
    evaluatePresentationRendererQcV002: () => assert.fail('gate must not evaluate QC'),
    DEFAULT_PRESENTATION_OVERLAY_ADAPTER_V001: {buildProps() {}, renderStill() {}, renderLineMask() {}},
    DEFAULT_PRESENTATION_DRAW_TOOL_PATHS_V001: {ffmpegPath: '/test/ffmpeg', ffprobePath: '/test/ffprobe', imageMagickPath: '/test/magick'},
    PRESENTATION_ENCODED_OMISSION_QC_METHOD_V002: oldQcMethod,
    PRESENTATION_INTEGRITY_STATE_QC_METHOD_V001: integrityMethod,
    resolvePresentationEffectsV001: input => ({plan: input.plan, expectedFrameCount: input.expectedFrameCount, presentationTimeline: null}),
    deriveDigestNativeInspectionSelectionV001: () => ({representativeInstructionIds: ['caption-a'],
      requiredPlacementInstructionIds: [], lineMaskInstructionIds: ['caption-a']}),
  });
}
const gateArgs = overrides => ({plan, expectedFrameCount: 45, validatedLayoutInspection: {}, ...overrides});
const testContext = () => ({approvedJob: {testOnly: true}, composeMedia() {}, tempDirectory: '/test/owned/temp'});
const testObserver = {run() {assert.fail('gate must not start a child');}};

function finish(api, observations = {}) {
  const start = source.indexOf('async function finishPresentationDrawAndQcV001(');
  const end = source.indexOf('\nexport async function executePresentationRendererV002(', start);
  assert(start >= 0 && end > start);
  return compileActualFunction(source.slice(start, end).trim(), {
    representativeModule: async () => api,
    createPresentationRendererFailureAfterWorkV001: input => ({exitCode: 1, ...input}),
    inspectPresentationCompletedFrameQcV001: async args => {
      observations.fullQcCalls = (observations.fullQcCalls ?? 0) + 1;
      return {status: 'passed', violations: [], inspections: args.records.map(record => record.inspection), evidence: {testOnly: true}};
    },
    makeViolation: (code, pointer, dependencies, detail) => ({code, pointer, dependencies, detail}),
    fileSha256V002: async () => {observations.hashCalls = (observations.hashCalls ?? 0) + 1; return 'test-only-hash';},
  });
}
function state(overrides = {}) {
  const record = {element: plan.elements[0], inspection: {instructionId: 'caption-a'}};
  return {outputDirectory: '/test/owned/output', reservation: {testOnly: 'owned'}, workDirectory: '/test/owned/work',
    stagingDirectory: '/test/owned/work/publish', scratchDirectory: '/test/owned/work/scratch', cleanupWarnings: [],
    overlayRecords: [record], applicationResults: [{instructionId: 'caption-a'}], baseExpectedAudio: {present: false},
    completedExpectedAudio: {present: true, sampleRate: 48000}, outputMedia: {video: {frameCount: 45}},
    workVideo: '/test/owned/work/publish/video.mp4', plan, expectedFrameCount: 45, presentationTimeline: null,
    timelineAudio: null, baseMediaPath: '/test/base.mp4', serializePngAndFilters: true,
    runCounterfactualQc: false, ...overrides};
}
const finishArgs = (saved, evaluateQc) => ({state: saved, onProgress() {}, evaluateQc});

test('representative policy selects internal mode, verifies selection before reservation and retains public flag rejection', async () => {
  const observed = {};
  const ctx = testContext();
  const run = gate({resolveApprovedDigestVerificationPolicyV001: async value => {
    assert.equal(value, ctx); observed.resolve = (observed.resolve ?? 0) + 1; return policy;
  }, validateDigestRepresentativeSelectionV001: (selected, actual) => {
    assert.equal(selected, policy); assert.equal(actual, plan); observed.selection = (observed.selection ?? 0) + 1;
  }}, observed);
  const result = await run(gateArgs({storageContext: ctx, processObserver: testObserver}));
  assert.equal(result.verificationPolicy, policy); assert.equal(result.effectiveCounterfactualQc, false);
  assert.equal(observed.resolve, 1); assert.equal(observed.selection, 1);
  await assert.rejects(run(gateArgs({storageContext: ctx, processObserver: testObserver, runCounterfactualQc: false})),
    /bound complete Normal render with QC/);
  assert.equal(observed.resolve, 1, 'public flag cannot select representative mode');
});

test('selection failure stops before image/output work', async () => {
  const run = gate({resolveApprovedDigestVerificationPolicyV001: async () => policy,
    validateDigestRepresentativeSelectionV001: () => {throw Error('TEST_ONLY_SELECTION_REJECTED');}});
  await assert.rejects(run(gateArgs({storageContext: testContext(), processObserver: testObserver})), /TEST_ONLY_SELECTION_REJECTED/);
});

test('absent private policy preserves explicit full-QC method and old public behavior', async () => {
  const run = gate({resolveApprovedDigestVerificationPolicyV001: async () => null,
    validateDigestRepresentativeSelectionV001: () => assert.fail('absent policy must not validate a representative selection')});
  const result = await run(gateArgs({storageContext: testContext(), processObserver: testObserver, counterfactualQcMethod: oldQcMethod}));
  assert.equal(result.verificationPolicy, null); assert.equal(result.effectiveCounterfactualQc, true);
  await assert.rejects(run(gateArgs({storageContext: testContext(), processObserver: testObserver})), /explicit corrected-omission/);
  const publicResult = await run(gateArgs({runCounterfactualQc: false}));
  assert.equal(publicResult.verificationPolicy, null); assert.equal(publicResult.effectiveCounterfactualQc, false);
});

for (const status of ['passed-representative', 'confirmation-pending']) {
  test(`${status} keeps explicit result, whole-visibility unperformed and owned video without full QC`, async () => {
    const observed = {}, saved = state({verificationPolicy: policy, storageContext: testContext()});
    const verification = {schemaVersion: 'test-only-representative-result', status,
      wholeCaptionVisibility: 'not-performed', fullVideoPlayback: 'not-performed', humanQuality: 'not-evaluated'};
    const run = finish({finishApprovedDigestRepresentativeCompletionV001: async args => {
      assert.equal(args.storageContext, saved.storageContext); assert.equal(args.plan, saved.plan);
      assert.equal(args.workVideo, saved.workVideo); assert.equal(args.outputMedia, saved.outputMedia);
      assert.equal(args.expectedFrameCount, 45); assert.equal(args.expectedAudio, saved.completedExpectedAudio);
      assert.equal(args.overlayRecords, saved.overlayRecords); assert.equal(args.applicationResults, saved.applicationResults);
      assert.equal(args.nativeCoverage, saved.nativeCoverage ?? null);
      return verification;
    }}, observed);
    const result = await run(finishArgs(saved, () => assert.fail('representative result cannot invoke legacy final QC')));
    assert.equal(result.exitCode, 0); assert.equal(result.finalQc, verification); assert.equal(result.verification, verification);
    assert.equal(result.verificationMode, policy.mode); assert.equal(result.counterfactualQcExecuted, false);
    assert.equal(result.workVideo, saved.workVideo); assert.equal(result.reservation, saved.reservation);
    assert.equal(result.completedFrameQc, undefined); assert.equal(observed.fullQcCalls, undefined);
    assert.equal(observed.hashCalls, undefined);
  });
}

test('failed representative result retains failure evidence instead of publishing full-QC passed', async () => {
  const verification = {schemaVersion: 'test-only-representative-result', status: 'failed', violations: [{code: 'TEST_ONLY_MEDIA_FAILURE'}]};
  const observed = {}, run = finish({finishApprovedDigestRepresentativeCompletionV001: async () => verification}, observed);
  const result = await run(finishArgs(state({verificationPolicy: policy, storageContext: testContext()}), () => assert.fail('legacy QC forbidden')));
  assert.equal(result.exitCode, 1); assert.equal(result.stage, 'post-render-qc'); assert.equal(result.nested, verification);
  assert.equal(result.violations, verification.violations); assert.equal(observed.fullQcCalls, undefined);
});

test('legacy passed status or contradictory representative state cannot pass the representative finish', async () => {
  const run = finish({finishApprovedDigestRepresentativeCompletionV001: async () => ({status: 'passed'})});
  await assert.rejects(run(finishArgs(state({verificationPolicy: policy, storageContext: testContext()}))), /invalid status/);
  await assert.rejects(run(finishArgs(state({verificationPolicy: policy, storageContext: testContext(), runCounterfactualQc: true}))), /approved Digest job/);
  await assert.rejects(run(finishArgs(state({verificationPolicy: policy}))), /approved Digest job/);
});

test('unconfigured full mode still executes complete-frame QC and requires final visibility', async () => {
  const observed = {}, saved = state({runCounterfactualQc: true}), legacy = {status: 'passed', violations: []};
  const run = finish({finishApprovedDigestRepresentativeCompletionV001: () => assert.fail('full mode cannot select representative API')}, observed);
  const result = await run(finishArgs(saved, args => {
    assert.equal(args.requireFinalVisibility, true); assert.equal(args.expectedFrameCount, 45);
    assert.equal(args.mediaInspection, saved.outputMedia); return legacy;
  }));
  assert.equal(observed.fullQcCalls, 1); assert.equal(observed.hashCalls, 1);
  assert.equal(result.finalQc, legacy); assert.equal(result.verification, undefined); assert.equal(result.counterfactualQcExecuted, true);
});

test('actual public renderer rejects a JSON-shaped fake approved storage context at opaque qualification', async () => {
  const realRenderer = path.join(workspaceRoot, 'evals/clip_composition/render_presentation_v002.mjs');
  const input = `const {executeValidatedPresentationDrawAndQcV001:run}=await import(${JSON.stringify(pathToFileURL(realRenderer).href)});\n`
    + `try { await run({storageContext:{approvedJob:{job:{verificationPolicy:${JSON.stringify(policy)}}}}}); process.exitCode=99; }\n`
    + `catch(error){if(!String(error.message).includes('QUALIFIED_APPROVED_DIGEST_STORAGE_REQUIRED'))throw error;console.log('opaque context rejected');}`;
  const result = await promisify(execFile)(process.execPath, ['--import', path.join(workspaceRoot, 'runner/node_modules/tsx/dist/loader.mjs'), '--input-type=module', '-e', input],
    {cwd: workspaceRoot, timeout: 30_000, maxBuffer: 64_000});
  assert.match(result.stdout, /opaque context rejected/);
});


test('actual finish forwards sampled coverage into private completion and returned draw', async () => {
  const nativeCoverage = {schemaVersion: 'test-only-coverage', entries: [{instructionId: 'caption-a'}]};
  const saved = state({verificationPolicy: policy, storageContext: testContext(), nativeCoverage});
  const run = finish({finishApprovedDigestRepresentativeCompletionV001: async args => {
    assert.equal(args.nativeCoverage, nativeCoverage);
    return {status: 'confirmation-pending', nativeCoverage};
  }});
  const result = await run(finishArgs(saved, () => assert.fail('cannot switch to full QC')));
  assert.equal(result.nativeCoverage, nativeCoverage);
  assert.equal(result.verification.nativeCoverage, nativeCoverage);
});
