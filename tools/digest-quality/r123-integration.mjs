/** Assemble one HRB candidate from saved R2 timing and R3 palette decisions. */
import assert from 'node:assert/strict';
import {mkdir, readFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {bindR2File as bind, saveR2Json as save} from './r2-media.mjs';
import {buildR123IntegratedPlanV001} from './r123-plan.mjs';
import {reloadR3IntegrationV001} from './r3-integration.mjs';
import {restoreOrchestrationDrawingViewEvidenceV001} from '../../evals/clip_composition/presentation_orchestration_v001.mjs';
import {loadAutoPresentationV001, loadAutoPresentationContextV001} from '../../evals/clip_composition/presentation_auto_effects_io_v001.mjs';
import {fixAutoPresentationProposalV001, createAutoPresentationOverridesV001, editAutoPresentationOverrideV001, resolveAutoPresentationV001}
  from '../../evals/clip_composition/presentation_auto_effects_v001.mjs';
import {buildPresentationBaseMediaVideoV001, muxPresentationBaseMediaV001}
  from '../../evals/clip_composition/presentation_base_media_build_v003.mjs';
import {buildEditedOrchestrationDrawingRulesRefV001, verifyEditedOrchestrationDrawingRulesRefV001}
  from '../../evals/clip_composition/presentation_orchestration_edited_render_v001.mjs';
import {executeValidatedPresentationDrawAndQcV001, buildPresentationRendererOverlayAdapterV001,
  commitValidatedPresentationArtifactsV002} from '../../evals/clip_composition/render_presentation_v002.mjs';
import {inspectRenderedMediaWithToolsV001} from '../../evals/clip_composition/presentation_renderer_qc_v002.mjs';
import {inspectOrchestrationEncodedAudioV001} from '../../evals/clip_composition/presentation_orchestration_background_v001.mjs';
import {createPresentationRendererProcessObserverV001} from '../../evals/clip_composition/presentation_renderer_process_observation_v001.mjs';
import {PRESENTATION_INTEGRITY_STATE_QC_METHOD_V001} from '../../evals/clip_composition/presentation_integrity_state_qc_v001.mjs';
import {assertIgnoredPresentationOutputDirectoryV001} from '../../evals/clip_composition/presentation_output_directory_v001.mjs';

const here = path.dirname(fileURLToPath(import.meta.url)), repo = path.resolve(here, '../..');
const composition = path.join(repo, 'evals/clip_composition');
const json = async file => JSON.parse(await readFile(file, 'utf8'));
const tools = {ffmpegPath: '/opt/homebrew/bin/ffmpeg', ffprobePath: '/opt/homebrew/bin/ffprobe', imageMagickPath: '/opt/homebrew/bin/magick',
  tsxPath: path.join(repo, 'runner/node_modules/tsx/dist/cli.mjs'), layoutInspectorPath: path.join(composition, 'inspect_presentation_render_layout_v001.ts')};
const sourceNames = ['source-bindings.json', 'selectionRecord.json', 'captionAuto.json', 'captionOverrides.json',
  'connectionAuto.json', 'connectionOverrides.json', 'drawing-evidence.json'];
const ownNames = ['normal-plan.json', 'decision-input.json', 'fixed-proposal.json', 'overrides.json', 'resolved-plan.json'];
const filesAt = directory => ({baselinePath: path.join(directory, ownNames[0]), decisionInputPath: path.join(directory, ownNames[1]),
  autoProposalPath: path.join(directory, ownNames[2]), overridesPath: path.join(directory, ownNames[3])});
async function check(ref) {assert.equal((await bind(ref.path)).fileSha256, ref.fileSha256, 'integrated input bytes changed: ' + ref.path);}
const resolvedFrom = loaded => resolveAutoPresentationV001({baselinePlan: loaded.baselinePlan, ...loaded.autoPresentation});
async function checkOriginalBackground(ref, view) {
  await check(ref);
  const proof = await json(ref.path);
  assert.equal(proof.status, 'passed'); assert.equal(proof.verification.status, 'passed');
  assert.equal(proof.projectionSha256, view.projection.projectionSha256);
  assert.equal(proof.sourceClockSha256, view.projection.sourceClockSha256);
  assert.deepEqual(proof.concreteConnections, view.projection.connections);
  assert.equal(proof.displayFrameCount, view.projection.displayFrameCount);
  return proof;
}

async function reconstruct({paletteDirectory, r2Directory}) {
  await reloadR3IntegrationV001(paletteDirectory);
  const view = restoreOrchestrationDrawingViewEvidenceV001(await json(path.join(paletteDirectory, 'drawing-evidence.json')));
  const r2 = await json(path.join(r2Directory, 'r2-evidence.json'));
  const loaded = await loadAutoPresentationV001(r2.files), resolved = resolvedFrom(loaded);
  assert.deepEqual(resolved.plan, await json(path.join(r2Directory, 'resolved-plan.json')));
  assert.deepEqual(loaded.autoPresentation.context.pulseTimingEvidence, view.sourceContext.pulseTimingEvidence);
  for (const ref of Object.values(r2.sourceRefs)) await check(ref);
  const derived = buildR123IntegratedPlanV001({view, r2BaselinePlan: loaded.baselinePlan,
    r2ResolvedPlan: resolved.plan, extension: r2.extension});
  // Only this same-ID/same-text opening was explicitly fixed to Normal in R2.
  // Keep that edit provenance; other old overrides must not migrate by ID alone.
  assert.deepEqual(loaded.autoPresentation.overrides.entries, [{captionId: derived.normalPlan.elements[0].instructionId, role: 'Normal'}]);
  assert.equal(resolved.resolution.captions[0].origin, 'human');
  assert.equal(resolved.resolution.captions[0].hasOverride, true);
  return {view, r2, derived};
}

export async function prepareR123IntegrationV001({paletteDirectory, r2Directory, outputDirectory}) {
  assert.equal(process.version, 'v20.19.6');
  assertIgnoredPresentationOutputDirectoryV001({repositoryRoot: repo, outputDirectory});
  const inputs = {paletteDirectory, r2Directory}, {view, r2, derived} = await reconstruct(inputs);
  const reuse = await json(path.join(repo, 'docs/reports/review-reflection-r1-r3-20260921-v002/r2-full-background-reuse-readonly-v001.json'));
  const originalBackgroundProofRef = reuse.previousBackgroundProofRef;
  await checkOriginalBackground(originalBackgroundProofRef, view);
  const sourceRefs = await Promise.all([...sourceNames.map(name => path.join(paletteDirectory, name)),
    ...['r2-evidence.json', ...ownNames].map(name => path.join(r2Directory, name))].map(bind));
  sourceRefs.push(originalBackgroundProofRef);
  await mkdir(outputDirectory);
  const files = filesAt(outputDirectory);
  await save(files.baselinePath, derived.normalPlan);
  await save(files.decisionInputPath, {schemaVersion: 'presentation-focus-decision-input-v005',
    pulseTimingEvidence: view.sourceContext.pulseTimingEvidence, pulseTimingProjection: derived.pulseTimingProjection,
    sourceRefs, purpose: 'Explicit integration of saved semantic decisions, R2 opening/timing and R3 finite palettes; no new AI judgment'});
  const loaded = await loadAutoPresentationContextV001({...files, pulseTimingProjection: derived.pulseTimingProjection});
  const originalAuto = await json(path.join(paletteDirectory, 'captionAuto.json'));
  const effects = derived.finiteSelections.filter(row => row.selection.role !== 'Normal')
    .map(({captionId, selection}) => ({captionId, ...selection}));
  const autoProposal = fixAutoPresentationProposalV001({...loaded, proposal: {schemaVersion: 'auto-presentation-proposal-v001',
    context: loaded.context, targetCaptionIds: derived.finiteSelections.map(row => row.captionId), completion: 'complete',
    effects, exceptions: originalAuto.proposal.exceptions}});
  const overrides = editAutoPresentationOverrideV001({...loaded, autoProposal,
    overrides: createAutoPresentationOverridesV001({...loaded, autoProposal}),
    captionId: derived.normalPlan.elements[0].instructionId, selection: 'Normal'});
  const resolved = resolveAutoPresentationV001({...loaded, autoProposal, overrides});
  assert.deepEqual(resolved.resolution.captions.map(row => ({captionId: row.captionId, selection: row.effectiveSelection})), derived.finiteSelections);
  await save(files.autoProposalPath, autoProposal); await save(files.overridesPath, overrides);
  await save(path.join(outputDirectory, 'resolved-plan.json'), resolved.plan);
  const record = {schemaVersion: 'review-reflection-hrb-integration-v002', kind: 'technical-recompile',
    inputs, sourceRefs, originalBackgroundProofRef, files, lineage: derived.lineage, extension: r2.extension,
    expectedFrameCount: derived.frameCount, originalViewSha256: view.viewSha256,
    explicitOpeningNormalPreserved: true,
    originalProjection: view.projection, originalSelections: view.effectiveSelections,
    applied: ['new automatic Panel choices exclude comic frame', 'saved semantic Panel choices receive finite palettes',
      'eleven source frames restore the opening utterance', 'two finite motions return near the observed speech end'],
    notApplied: ['C-all subtitle corrections belong to their separate short derivatives', 'Q5 omission and introduction edits'],
    newAiJudgment: false, humanQualityApproved: false, originalTenPointAnswersRemainComplete: true};
  await save(path.join(outputDirectory, 'integration.json'), record);
  return reloadR123IntegrationV001(outputDirectory);
}

export async function reloadR123IntegrationV001(directory) {
  const record = await json(path.join(directory, 'integration.json'));
  for (const ref of record.sourceRefs) await check(ref);
  const {view, r2, derived} = await reconstruct(record.inputs);
  await checkOriginalBackground(record.originalBackgroundProofRef, view);
  assert.equal(view.viewSha256, record.originalViewSha256);
  assert.deepEqual(view.projection, record.originalProjection);
  assert.deepEqual(view.effectiveSelections, record.originalSelections);
  assert.deepEqual(r2.extension, record.extension); assert.deepEqual(derived.lineage, record.lineage);
  const loaded = await loadAutoPresentationV001(record.files), resolved = resolvedFrom(loaded);
  assert.deepEqual(loaded.baselinePlan, derived.normalPlan);
  assert.deepEqual(loaded.autoPresentation.context.pulseTimingProjection, derived.pulseTimingProjection);
  assert.deepEqual(loaded.autoPresentation.context.pulseTimingEvidence, view.sourceContext.pulseTimingEvidence);
  assert.deepEqual(resolved.resolution.captions.map(row => ({captionId: row.captionId, selection: row.effectiveSelection})), derived.finiteSelections);
  assert.deepEqual(loaded.autoPresentation.overrides.entries, [{captionId: derived.normalPlan.elements[0].instructionId, role: 'Normal'}]);
  assert.equal(record.explicitOpeningNormalPreserved, true);
  assert.equal(resolved.resolution.captions[0].origin, 'human');
  assert.equal(resolved.resolution.captions[0].hasOverride, true);
  assert.deepEqual(resolved.plan, await json(path.join(directory, 'resolved-plan.json')));
  assert.equal(record.expectedFrameCount, derived.frameCount);
  return {status: 'passed', frameCount: derived.frameCount, captionCount: derived.normalPlan.elements.length,
    reconstructedFromSavedInputs: true, newAiJudgment: false};
}

export async function renderR123IntegrationV001({directory, backgroundProofPath, outputDirectory, evidenceDirectory,
  onProgress = () => {}}) {
  assert.equal(process.version, 'v20.19.6'); assert(!Object.hasOwn(process.env, 'NODE_OPTIONS'));
  for (const value of [outputDirectory, evidenceDirectory]) assertIgnoredPresentationOutputDirectoryV001({repositoryRoot: repo, outputDirectory: value});
  await reloadR123IntegrationV001(directory);
  const record = await json(path.join(directory, 'integration.json')), background = await json(backgroundProofPath);
  assert.equal(background.status, 'passed'); assert.deepEqual(background.extension, record.extension);
  assert.equal(background.expectedFrameCount, record.expectedFrameCount);
  assert.equal(background.audio.sampleRate, 44100); assert.equal(background.audio.channels, 2);
  assert.equal(background.audio.sampleCount, record.expectedFrameCount * 1470);
  const originalBackground = await json(record.originalBackgroundProofRef.path);
  assert.deepEqual(background.originalBaseRef, originalBackground.outputs.background);
  const loaded = await loadAutoPresentationV001(record.files), resolved = resolvedFrom(loaded);
  const refs = [await bind(path.join(directory, 'integration.json')), await bind(backgroundProofPath),
    background.originalBaseRef, background.joinedRef, background.pcmRef,
    ...await Promise.all(ownNames.map(name => bind(path.join(directory, name))))];
  const localImplementationRefs = await Promise.all(['r123-integration.mjs', 'r123-plan.mjs', 'r3-integration.mjs', 'r2-media.mjs']
    .map(name => bind(path.join(here, name))));
  const rules = await buildEditedOrchestrationDrawingRulesRefV001();
  const reread = async () => {
    for (const ref of [...refs, ...localImplementationRefs]) await check(ref);
    await verifyEditedOrchestrationDrawingRulesRefV001(rules);
    await reloadR123IntegrationV001(directory);
  };
  await reread(); await mkdir(evidenceDirectory);
  try {
    const expectedFrameCount = record.expectedFrameCount;
    await onProgress({phase: 'build-integrated-base', expectedFrameCount});
    const videoPath = path.join(evidenceDirectory, 'base-video.mp4'), basePath = path.join(evidenceDirectory, 'base.mp4');
    const videoBuild = await buildPresentationBaseMediaVideoV001(background.joinedRef.path, videoPath, 30,
      [{sourceStartFrame30: 0, sourceEndFrame30: expectedFrameCount}]);
    const mux = await muxPresentationBaseMediaV001(videoPath, basePath,
      {sampleRate: 44100, channels: 2, channelLayout: 'stereo'}, {present: true, encodePath: background.pcmRef.path});
    const baseRef = await bind(basePath), media = await inspectRenderedMediaWithToolsV001(basePath, tools);
    assert.equal(media.video.frameCount, expectedFrameCount);
    const baseAudio = await inspectOrchestrationEncodedAudioV001({audioPath: basePath,
      logicalSampleCount: expectedFrameCount * 1470, sampleRate: 44100, ...tools});
    await save(path.join(evidenceDirectory, 'base-build.json'), {videoBuild, mux, baseRef, media, baseAudio});
    await reread();
    const processObserver = createPresentationRendererProcessObserverV001({observationDirectory: path.join(evidenceDirectory, 'processes')});
    const overlayAdapter = buildPresentationRendererOverlayAdapterV001({
      remotionPath: path.join(repo, 'runner/node_modules/@remotion/cli/remotion-cli.js'),
      chromiumPath: path.join(repo, 'runner/node_modules/.remotion/chrome-headless-shell/mac-arm64/chrome-headless-shell-mac-arm64/chrome-headless-shell'),
      processObserver});
    const draw = await executeValidatedPresentationDrawAndQcV001({outputDirectory,
      plan: loaded.baselinePlan, autoPresentation: loaded.autoPresentation,
      presetRegistry: await json(path.join(composition, 'registries/presentation/normal-landscape-preset-registry-v001/preset-registry.json')),
      baseMediaPath: basePath, baseMediaInspection: {media}, expectedFrameCount, overlayAdapter, toolPaths: tools,
      processObserver, serializePngAndFilters: true, runCounterfactualQc: true,
      counterfactualQcMethod: PRESENTATION_INTEGRITY_STATE_QC_METHOD_V001, onProgress});
    await save(path.join(evidenceDirectory, 'draw-result.json'), draw);
    assert.equal(draw.exitCode, 0, JSON.stringify(draw.failure ?? draw.finalQc)); assert.equal(draw.finalQc.status, 'passed');
    assert.deepEqual(draw.resolvedPlan, resolved.plan); assert.equal(draw.outputMedia.video.frameCount, expectedFrameCount);
    const finalAudio = await inspectOrchestrationEncodedAudioV001({audioPath: draw.workVideo,
      logicalSampleCount: expectedFrameCount * 1470, sampleRate: 44100, ...tools});
    assert.equal(finalAudio.packetPayloadSha256, baseAudio.packetPayloadSha256);
    assert.equal(finalAudio.logicalDecodedPayloadSha256, baseAudio.logicalDecodedPayloadSha256);
    await reread(); await check(baseRef);
    const stagedRef = await bind(draw.workVideo);
    const publication = await commitValidatedPresentationArtifactsV002({stagingDirectory: draw.stagingDirectory,
      outputDirectory: draw.outputDirectory, reservation: draw.reservation});
    const after = await bind(path.join(publication.outputDirectory, 'presentation-rendered-v002.mp4'));
    assert.equal(after.fileSha256, stagedRef.fileSha256); await reread();
    const result = {status: 'passed', after, expectedFrameCount, refs, localImplementationRefs, drawingRulesRef: rules,
      finalQc: draw.finalQc, completedFrameQc: draw.completedFrameQc, publication, baseRef, baseAudio, finalAudio,
      originalMediaReplaced: false, newAiJudgment: false, humanQuality: 'pending'};
    await save(path.join(evidenceDirectory, 'completion.json'), result);
    return {status: 'passed', after, expectedFrameCount, completionPath: path.join(evidenceDirectory, 'completion.json')};
  } catch (error) {
    await save(path.join(evidenceDirectory, 'failure.json'), {status: 'failed', message: String(error), stack: error.stack});
    throw error;
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [command, ...args] = process.argv.slice(2);
  const operation = command === 'prepare'
    ? () => prepareR123IntegrationV001({paletteDirectory: args[0], r2Directory: args[1], outputDirectory: args[2]})
    : command === 'reload' ? () => reloadR123IntegrationV001(args[0])
      : command === 'render' ? () => renderR123IntegrationV001({directory: args[0], backgroundProofPath: args[1],
        outputDirectory: args[2], evidenceDirectory: args[3], onProgress: value => console.log(JSON.stringify(value))}) : null;
  assert(operation, 'usage: r123-integration prepare|reload|render with absolute paths');
  console.log(JSON.stringify(await operation(), null, 2));
}
