import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdtemp, readFile, readdir, rm, writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import test from 'node:test';
import {
  createAutoPresentationOverridesV001,
  editAutoPresentationOverrideV001,
  resolveAutoPresentationV001,
  sha256AutoPresentationV001,
} from './presentation_auto_effects_v001.mjs';
import {
  loadAutoPresentationContextV001,
  loadAutoPresentationV001,
  saveAutoPresentationOverridesV001,
  saveFixedAutoPresentationV001,
} from './presentation_auto_effects_io_v001.mjs';
import {executeValidatedPresentationDrawAndQcV001} from './render_presentation_v002.mjs';
import {
  executePresentationInstructionRendererJobV002,
  runPresentationInstructionRendererJobFileV002,
} from './run_presentation_instruction_renderer_job_v002.ts';

const readJson = async file => JSON.parse(await readFile(file, 'utf8'));
const writeJson = (file, value) => writeFile(file, `${JSON.stringify(value, null, 2)}\n`);
const focus = {role: 'Focus', presentation: 'provisional-focus', scope: 'whole-caption'};
const digest = bytes => createHash('sha256').update(bytes).digest('hex');
const savedDigestJobPath = 'evals/clip_composition/outputs/presentation/work-digest-v1-20260913-v003/renderer-job.json';
const samplePlan = () => ({
  schemaVersion: 'presentation-output-common-core-plan-v001',
  canvas: {width: 1920, height: 1080, fps: 30},
  elements: ['条件を残す字幕', '普通の会話'].map((text, index) => ({
    instructionId: `caption-${index}`, kind: 'speech-caption', text,
    indexedLines: [{lineIndex: 0, text}],
    startFrame: index * 30, endFrameExclusive: (index + 1) * 30, displayFrameCount: 30,
    visualState: {textStyle: {fontColor: '#FFFDF8', fontSizePx: 94, fontAssetId: 'saved-font'},
      position: {preset: 'bottom-center'}},
  })),
});

async function savedInput(t, baselinePlan, {selected = false, normal = false} = {}) {
  const directory = await mkdtemp(path.join(tmpdir(), 'zev-auto-renderer-input-'));
  t.after(() => rm(directory, {recursive: true, force: true}));
  const files = Object.fromEntries(['baseline', 'decisionInput', 'autoProposal', 'overrides']
    .map(name => [`${name}Path`, path.join(directory, `${name}.json`)]));
  await writeJson(files.baselinePath, baselinePlan);
  await writeJson(files.decisionInputPath, {captions: baselinePlan.elements
    .filter(element => element.kind === 'speech-caption')
    .map(({instructionId, text}) => ({instructionId, text}))});
  const {context} = await loadAutoPresentationContextV001(files);
  const captionIds = baselinePlan.elements.filter(element => element.kind === 'speech-caption')
    .map(element => element.instructionId);
  const autoProposal = await saveFixedAutoPresentationV001({...files, outputPath: files.autoProposalPath,
    proposal: {schemaVersion: 'auto-presentation-proposal-v001', context, targetCaptionIds: captionIds,
      completion: 'complete', effects: selected ? [{captionId: captionIds[0], ...focus}] : [], exceptions: []},
  });
  if (normal) {
    const overrides = editAutoPresentationOverrideV001({baselinePlan, context, autoProposal,
      overrides: createAutoPresentationOverridesV001({baselinePlan, context, autoProposal}),
      captionId: captionIds[0], selection: 'Normal'});
    await saveAutoPresentationOverridesV001({...files, overrides, outputPath: files.overridesPath});
  }
  const loaded = await loadAutoPresentationV001({...files,
    ...(normal ? {} : {overridesPath: undefined})});
  return {...loaded, files};
}

// The existing layout-process boundary captures the real resolved draw input.
// It deliberately rejects layout before any overlay, encoding, or physical QC.
async function captureLayoutInput(t, plan, autoPresentation) {
  const directory = await mkdtemp(path.resolve('evals/clip_composition/outputs/presentation/auto-renderer-test-'));
  t.after(() => rm(directory, {recursive: true, force: true}));
  const observed = [];
  let overlayCalls = 0;
  const outputDirectory = path.join(directory, 'render');
  const result = await executeValidatedPresentationDrawAndQcV001({
    outputDirectory, plan, autoPresentation, presetRegistry: {},
    baseMediaPath: '/unused/base.mp4', baseMediaInspection: {media: {audio: null}}, expectedFrameCount: 60,
    overlayAdapter: {
      buildProps: (element, effectivePlan) => ({element: structuredClone(element), canvas: effectivePlan.canvas}),
      renderStill: async () => { overlayCalls++; throw new Error('unexpected physical draw'); },
      renderLineMask: async () => { overlayCalls++; throw new Error('unexpected physical draw'); },
    },
    toolPaths: {ffmpegPath: '/unused/ffmpeg', ffprobePath: '/unused/ffprobe',
      imageMagickPath: '/unused/magick', tsxPath: '/unused/tsx', layoutInspectorPath: '/unused/layout'},
    processObserver: {run: async (_command, args, options) => {
      assert.equal(options.observationLabel, 'layout-inspection');
      observed.push(await readJson(args[1]));
      await writeJson(args[2], {status: 'failed', violations: [{code: 'TEST_LAYOUT_STOP'}], items: []});
      return {code: 1, signal: null, stdout: Buffer.alloc(0), stderr: Buffer.alloc(0)};
    }},
  });
  assert.equal(result.exitCode, 1);
  assert.equal(observed.length, 1);
  assert.equal(overlayCalls, 0);
  await assert.rejects(readFile(outputDirectory), {code: 'ENOENT'});
  return observed[0];
}

test('common draw rejects unknown rules and mixed legacy effects before acquiring output or drawing', async t => {
  const plan = samplePlan();
  const {autoPresentation} = await savedInput(t, plan);
  const directory = await mkdtemp(path.join(tmpdir(), 'zev-auto-renderer-rejected-'));
  t.after(() => rm(directory, {recursive: true, force: true}));
  let calls = 0;
  const invalidVersion = structuredClone(autoPresentation);
  invalidVersion.context.renderingRulesRef.version = 'unknown-rules';
  for (const [name, options, expected] of [
    ['unknown-rules', {autoPresentation: invalidVersion}, /rendering rules version differs/],
    ['mixed-effects', {autoPresentation, effects: {}}, /auto.*effects|effects.*auto/i],
  ]) {
    await assert.rejects(executeValidatedPresentationDrawAndQcV001({
      outputDirectory: path.join(directory, name), plan, ...options,
      overlayAdapter: {buildProps: () => { calls++; }, renderStill: async () => { calls++; },
        renderLineMask: async () => { calls++; }},
      processObserver: {run: async () => { calls++; }},
    }), expected);
  }
  assert.equal(calls, 0);
  assert.deepEqual(await readdir(directory), []);
});

test('unspecified effects, empty automatic judgment, and explicit human Normal reach layout identically', async t => {
  const plan = samplePlan();
  const before = structuredClone(plan);
  const empty = await savedInput(t, plan);
  const humanNormal = await savedInput(t, plan, {selected: true, normal: true});
  const plain = await captureLayoutInput(t, plan);
  assert.deepEqual(await captureLayoutInput(t, plan, empty.autoPresentation), plain);
  assert.deepEqual(await captureLayoutInput(t, plan, humanNormal.autoPresentation), plain);
  assert.deepEqual(plan, before);
});

test('Focus reaches the existing layout only on its caption while the normal plan remains unchanged', async t => {
  const plan = samplePlan();
  const before = structuredClone(plan);
  const {autoPresentation} = await savedInput(t, plan, {selected: true});
  const layout = await captureLayoutInput(t, plan, autoPresentation);
  const expected = structuredClone(plan.elements[0]);
  expected.visualState.textStyle.fontColor = '#FFD65A';
  assert.deepEqual(layout.overlays[0].element, expected);
  assert.deepEqual(layout.overlays[1].element, before.elements[1]);
  assert.deepEqual(plan, before);
  await assert.rejects(executeValidatedPresentationDrawAndQcV001({plan, autoPresentation,
    validatedLayoutInspection: {status: 'passed', items: []}}), /layout inspection/);
});

// Reuse saved Digest admission data. Injected observations below are capability
// fixtures; actual executable/media-byte and physical-QC checks belong to E2E.
async function savedJobFixture() {
  const jobPath = savedDigestJobPath;
  const jobBytes = await readFile(jobPath);
  const job = JSON.parse(jobBytes);
  const readBinding = binding => binding === null ? null : readJson(binding.path);
  const instructionArtifact = await readBinding(job.instructionArtifactBinding);
  const [cueEndProjection, lineEndProjection, meaningPackage, timeline,
    styleProfileRegistry, materialRegistry, rendererTrust] = await Promise.all([
    readBinding(instructionArtifact.sourceBindings.cueEndProjection),
    readBinding(job.lineEndProjectionBinding),
    readBinding(instructionArtifact.sourceBindings.meaningInformationPackage),
    readBinding(job.cropAppliedBaseMedia.timeline),
    readBinding(job.registryBindings.styleProfileRegistry),
    readBinding(job.registryBindings.materialRegistry),
    readBinding(job.registryBindings.rendererTrust),
  ]);
  return {
    workspaceRoot: process.cwd(), job, instructionArtifact, cueEndProjection, lineEndProjection,
    lineEndSourcePackage: await readBinding(lineEndProjection.sourcePackageBinding),
    meaningPackage, timeline, styleProfileRegistry, materialRegistry, rendererTrust,
    rendererJobBinding: {schemaVersion: job.schemaVersion, path: jobPath,
      fileSha256: digest(jobBytes), canonicalSha256: sha256AutoPresentationV001(job)},
    mediaInspection: {path: job.cropAppliedBaseMedia.baseMedia.path,
      fileSha256: job.cropAppliedBaseMedia.baseMedia.fileSha256, ...job.executionInputs.canvas,
      frameCount: timeline.baseMedia.expectedFrameCount, audioStreamCount: 1},
    renderMediaInspection: {audio: null},
    fontAssetInspections: rendererTrust.fontAssets.map(({path, fileSha256}) => ({path, fileSha256})),
    rendererDependencyInspections: structuredClone(rendererTrust.rendererDependencies),
    observedRuntimeBindings: structuredClone(job.runtimeBindings),
    observedImplementationBindings: structuredClone(job.rendererImplementationBindings),
    outputPathsUnused: true,
  };
}

test('the normal job keeps its normal plan separate from the resolved draw plan and judgment', async t => {
  const fixture = await savedJobFixture();
  const draws = [];
  const publications = [];
  const capabilities = {
    publishReceipt: async () => ({status: 'published'}),
    publishLineLayout: async () => ({status: 'published'}),
    executeDraw: async input => {
      draws.push(input);
      const resolved = input.autoPresentation === undefined ? {plan: input.plan}
        : resolveAutoPresentationV001({baselinePlan: input.plan, ...input.autoPresentation});
      return {exitCode: 0, finalQc: {status: 'passed'}, resolvedPlan: resolved.plan,
        autoPresentationResolution: resolved.resolution,
        autoPresentationInputs: structuredClone(input.autoPresentation),
        stagingDirectory: 'test-staging', outputDirectory: 'test-output', reservation: {test: true}};
    },
    commitDraw: async input => { publications.push(input); return {status: 'published'}; },
  };
  const normal = await executePresentationInstructionRendererJobV002({...fixture, capabilities});
  assert.equal(normal.exitCode, 0, JSON.stringify(normal));
  assert.equal(Object.hasOwn(normal.result, 'effectivePlan'), false);
  assert.equal(Object.hasOwn(normal.result, 'autoPresentationResolution'), false);
  assert.equal(Object.hasOwn(normal.result, 'autoPresentationInputs'), false);
  const baseline = structuredClone(normal.result.commonCorePlan);
  const {autoPresentation} = await savedInput(t, baseline, {selected: true});
  const expected = resolveAutoPresentationV001({baselinePlan: baseline, ...autoPresentation});
  const selected = await executePresentationInstructionRendererJobV002({...fixture, capabilities, autoPresentation});
  assert.equal(selected.exitCode, 0, JSON.stringify(selected));
  assert.equal(draws.length, 2);
  assert.equal(publications.length, 2);
  assert.deepEqual(draws[1].autoPresentation, autoPresentation);
  assert.deepEqual(draws[1].plan, baseline);
  assert.deepEqual(selected.result.commonCorePlan, baseline);
  assert.deepEqual(selected.result.effectivePlan, expected.plan);
  assert.deepEqual(selected.result.autoPresentationResolution, expected.resolution);
  assert.deepEqual(selected.result.autoPresentationInputs, autoPresentation);
  assert.deepEqual(normal.result.commonCorePlan, baseline);
  assert.notDeepEqual(selected.result.effectivePlan.elements[0], baseline.elements[0]);
  assert.deepEqual(selected.result.effectivePlan.elements.slice(1), baseline.elements.slice(1));
});

test('the job file entry rereads decision and fixed-proposal bytes and rejects changes before drawing', async t => {
  const plan = samplePlan();
  const {files} = await savedInput(t, plan, {selected: true});
  const directory = await mkdtemp(path.resolve('evals/clip_composition/outputs/presentation/auto-renderer-file-test-'));
  t.after(() => rm(directory, {recursive: true, force: true}));
  const jobPath = path.join(directory, 'renderer-job.json');
  await writeFile(jobPath, await readFile(savedDigestJobPath));
  let drawCalls = 0;
  const options = {workspaceRoot: process.cwd(), autoPresentationFiles: {
    baselinePath: files.baselinePath, decisionInputPath: files.decisionInputPath,
    autoProposalPath: files.autoProposalPath,
  }, overlayAdapter: {
    buildProps: () => { drawCalls++; throw new Error('unexpected draw'); },
    renderStill: async () => { drawCalls++; throw new Error('unexpected draw'); },
    renderLineMask: async () => { drawCalls++; throw new Error('unexpected draw'); },
  }};
  const decisionBytes = await readFile(files.decisionInputPath);
  await writeFile(files.decisionInputPath, Buffer.concat([decisionBytes, Buffer.from('\n')]));
  await assert.rejects(runPresentationInstructionRendererJobFileV002(jobPath, options),
    /proposal reference version differs/);
  await writeFile(files.decisionInputPath, decisionBytes);

  const fixedBytes = await readFile(files.autoProposalPath);
  const edited = JSON.parse(fixedBytes);
  edited.proposal.effects[0].captionId = plan.elements[1].instructionId;
  await writeJson(files.autoProposalPath, edited);
  await assert.rejects(runPresentationInstructionRendererJobFileV002(jobPath, options),
    /fixed proposal content differs/);
  assert.equal(drawCalls, 0);
  assert.deepEqual(await readdir(directory), ['renderer-job.json']);
});
