import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import {deriveDigestNativeInspectionSelectionV001} from './presentation_renderer_qc_v002.mjs';

const source = await readFile(new URL('./render_presentation_v002.mjs', import.meta.url), 'utf8');
const start = source.indexOf('    const physicalRecords = [];');
const end = source.indexOf('    const baseExpectedAudio =', start);
assert(start > 0 && end > start);
const hash = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const policy = {schemaVersion: 'digest-representative-verification-policy-v001',
  mode: 'representative-plus-rules-v001', representativeInstructionIds: ['first', 'third'],
  permittedMethods: ['still-frame'], confirmationRecordPath: 'runtime/artifacts/test/confirmation.json'};
function fixture(special = false) {
  const elements = ['first', 'second', 'third'].map((instructionId, index) => ({instructionId,
    startFrame: index * 10, endFrameExclusive: index * 10 + 10, displayFrameCount: 10,
    indexedLines: Array.from({length: index === 2 ? 1 : 2}, (_, lineIndex) => ({lineIndex, text: 'test'})),
    visualState: {position: {preset: special && index === 1 ? 'top-band' : 'bottom-center'}, background: null}}));
  return {canvas: {width: 1920, height: 1080, fps: 30}, elements};
}
async function exercise(plan, {full = false, mismatch = null} = {}) {
  const events = [], files = new Map(), observed = [];
  const props = plan.elements.map(e => ({instructionId: e.instructionId}));
  const nativeSelection = full ? null : deriveDigestNativeInspectionSelectionV001(plan, policy);
  const dependencies = {
    plan, nativeSelection, path, stagingDirectory: '/test/publish', scratchDirectory: '/test/scratch',
    artifactNames: {overlays: 'overlays'}, hasFiniteStates: false, layoutInspection: {},
    layoutByInstruction: new Map(plan.elements.map(e => [e.instructionId, {lineRects: [],
      wrapper: {left: 0, top: 0, width: 1920, height: 300}}])),
    drawStates: plan.elements.map((element, groupIndex) => ({element, groupIndex})), overlayProps: props,
    sha256Bytes: hash, sha256Canonical: hash, toolPaths: {imageMagickPath: '/test/magick'}, processObserver: null,
    isPresentationPanelBackgroundV002: () => false,
    resolveVisibleCenterOffsetsV001: () => ({x: 0, y: 0}),
    overlayAdapter: {
      async renderStill(value, file, options = {}) {
        const kind = options.series ?? 'primary'; events.push({id: value.instructionId, kind});
        files.set(file, hash({value, ...(kind === 'repeat' && mismatch === value.instructionId ? {fault: true} : {})}));
      },
      async renderLineMask(value, lineIndex, file) {
        events.push({id: value.instructionId, kind: file.includes('calibration') ? 'calibration' : 'mask', lineIndex});
        files.set(file, hash({value, lineIndex}));
      },
    },
    fileSha256V002: async file => {assert(files.has(file)); return files.get(file);},
    validateOverlayDeterminismV002: (a, b, id) => ({status: a === b ? 'passed' : 'failed',
      violations: a === b ? [] : [{code: 'OVERLAY_RENDER_NONDETERMINISTIC', relatedIds: [id]}]}),
    failAfterWork: (violations, stage) => ({exitCode: 1, violations, stage}),
    inspectOverlayPngWithToolV001: async value => {
      observed.push(value);
      return {...value, alphaMax: 1, alphaBounds: {left: 120, top: 800, right: 1700, bottom: 1000},
        lineCount: value.lineRects?.length ?? 0};
    },
    buildPresentationRenderApplicationResults: records => records.map(r => ({instructionId: r.element.instructionId})),
  };
  // Execute the real native loop with explicit test dependencies; no capability,
  // filesystem, browser, production input or media output is created.
  const execute = Function(...Object.keys(dependencies), 'return (async () => {\n'
    + source.slice(start, end) + '\nreturn {overlayRecords,nativeEntries,applicationResults};})();');
  return {result: await execute(...Object.values(dependencies)), events, observed};
}

test('three primary inspections remain; selected two repeat/three mask; other cue has no unnecessary draw', async () => {
  const {result, events, observed} = await exercise(fixture());
  assert.equal(events.filter(e => e.kind === 'primary').length, 3);
  assert.deepEqual(events.filter(e => e.kind === 'repeat').map(e => e.id), ['first', 'third']);
  assert.equal(events.filter(e => e.kind === 'mask').length, 3);
  assert.equal(events.filter(e => e.id === 'second').length, 1);
  assert.equal(observed.filter(e => e.overlaySha256).length, 3, 'all primary alpha/bounds actually inspected');
  assert.deepEqual(result.nativeEntries[1].repeat, {status: 'not-executed'});
  assert.deepEqual(result.nativeEntries[1].lineMasks, {status: 'not-executed'});
  assert.deepEqual(result.overlayRecords[1].inspection.lineAlphaBounds, []);
  assert(result.nativeEntries[0].lineMasks.masks.every(m => /^[a-f0-9]{64}$/.test(m.pngSha256)));
});

test('necessary unselected placement calibration and corrected masks remain; repeat remains unexecuted', async () => {
  const {result, events} = await exercise(fixture(true));
  assert.equal(events.filter(e => e.id === 'second' && e.kind === 'calibration').length, 2);
  assert.equal(events.filter(e => e.id === 'second' && e.kind === 'mask').length, 2);
  assert.equal(events.filter(e => e.id === 'second' && e.kind === 'repeat').length, 0);
  assert.equal(result.nativeEntries[1].lineMasks.scope, 'required-placement');
  assert.equal(result.nativeEntries[1].calibration.masks.length, 2);
  assert.deepEqual(result.overlayRecords[1].inspection.visibleCenterCalibration.lineMasks,
    result.nativeEntries[1].calibration.masks);
});

test('no private policy preserves all repeats/masks; selected repeat mismatch stops before downstream work', async () => {
  const full = await exercise(fixture(), {full: true});
  assert.equal(full.events.filter(e => e.kind === 'repeat').length, 3);
  assert.equal(full.events.filter(e => e.kind === 'mask').length, 5);
  assert.deepEqual(full.result.nativeEntries, []);
  const broken = await exercise(fixture(), {mismatch: 'first'});
  assert.equal(broken.result.exitCode, 1); assert.equal(broken.result.stage, 'overlay-determinism');
  assert.equal(broken.result.violations[0].code, 'OVERLAY_RENDER_NONDETERMINISTIC');
  assert(!broken.events.some(e => e.id !== 'first'), 'fails at selected mismatch before later primary or composite');
});


test('actual layout preflight forwards complete clock, policy and exact job/code coverage', async () => {
  const plan = fixture(), drawn = await exercise(plan), observed = {};
  const jobBinding = {path: 'job.json', fileSha256: 'a'.repeat(64), sizeBytes: 12};
  const authorizationBinding = {path: 'authorization.json', fileSha256: 'b'.repeat(64), sizeBytes: 13};
  const storageContext = {approvedJob: {jobBinding, authorizationBinding,
    job: {implementation: {sha: 'c'.repeat(40)}}}};
  const first = source.indexOf('    const nativeCoverage = nativeSelection === null ? null : {');
  const last = source.indexOf("    await onProgress({phase: 'composite'", first);
  assert(first > 0 && last > first);
  const dependencies = {nativeSelection: deriveDigestNativeInspectionSelectionV001(plan, policy),
    plan, verificationPolicy: policy, sha256Canonical: hash, storageContext,
    nativeEntries: drawn.result.nativeEntries, expectedFrameCount: 30,
    applicationResults: drawn.result.applicationResults, overlayRecords: drawn.result.overlayRecords,
    baseMediaInspection: {media: {video: {frameCount: 30}}}, baseExpectedAudio: {present: false},
    evaluateQc: () => assert.fail('sampled preflight cannot call full entry'),
    evaluateDigestRepresentativeRendererQcV001: (input, parameters) => {
      observed.input = input; observed.parameters = parameters;
      return {status: 'passed-representative-rules', violations: []};
    }, failAfterWork: () => assert.fail('accepted test preflight cannot fail')};
  const execute = Function(...Object.keys(dependencies), 'return (() => {\n'
    + source.slice(first, last) + '\nreturn nativeCoverage;})();');
  const coverage = execute(...Object.values(dependencies));
  assert.equal(observed.input.expectedFrameCount, 30);
  assert.equal(observed.input.overlayInspections.length, 3);
  assert.equal(observed.parameters.policy, policy);
  assert.equal(observed.parameters.nativeCoverage, coverage);
  assert.deepEqual(observed.parameters.expectedBindings, {approvedJobBinding: jobBinding,
    authorizationBinding, implementationSha: 'c'.repeat(40)});
  assert.deepEqual(coverage.entries, drawn.result.nativeEntries);
  assert.equal(coverage.rendererPlanCanonicalSha256, hash(plan));
});
