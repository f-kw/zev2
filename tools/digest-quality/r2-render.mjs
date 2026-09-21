/** The saved R2 plan enters the existing production draw, native-state QC and exact replay path. */
import assert from 'node:assert/strict';
import {mkdir, readFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {bindR2File as bind, saveR2Json as save} from './r2-media.mjs';
import {resolveR2OpeningExtensionV001} from './r2-opening.mjs';
import {loadAutoPresentationV001} from '../../evals/clip_composition/presentation_auto_effects_io_v001.mjs';
import {resolveAutoPresentationV001} from '../../evals/clip_composition/presentation_auto_effects_v001.mjs';
import {buildPresentationBaseMediaVideoV001, muxPresentationBaseMediaV001}
  from '../../evals/clip_composition/presentation_base_media_build_v003.mjs';
import {buildEditedOrchestrationDrawingRulesRefV001, verifyEditedOrchestrationDrawingRulesRefV001}
  from '../../evals/clip_composition/presentation_orchestration_edited_render_v001.mjs';
import {executeValidatedPresentationDrawAndQcV001, buildPresentationRendererOverlayAdapterV001, commitValidatedPresentationArtifactsV002}
  from '../../evals/clip_composition/render_presentation_v002.mjs';
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
async function check(ref) {assert.equal((await bind(ref.path)).fileSha256, ref.fileSha256, 'bound R2 bytes changed: ' + ref.path);}

export async function renderR2OpeningV001({preparedDirectory, outputDirectory, evidenceDirectory, onProgress = () => {}}) {
  assert.equal(process.version, 'v20.19.6'); assert(!Object.hasOwn(process.env, 'NODE_OPTIONS'));
  assert(path.isAbsolute(preparedDirectory));
  for (const directory of [outputDirectory, evidenceDirectory]) {
    assertIgnoredPresentationOutputDirectoryV001({repositoryRoot: repo, outputDirectory: directory});
  }
  const inputRef = await bind(path.join(preparedDirectory, 'r2-evidence.json')),
    backgroundRef = await bind(path.join(preparedDirectory, 'background/proof.json'));
  const evidence = await json(inputRef.path), background = await json(backgroundRef.path);
  assert.equal(background.status, 'passed'); assert.deepEqual(background.extension, evidence.extension);
  const {baselinePath, decisionInputPath, autoProposalPath, overridesPath} = evidence.files;
  const loaded = await loadAutoPresentationV001({baselinePath, decisionInputPath, autoProposalPath, overridesPath});
  const resolved = resolveAutoPresentationV001({baselinePlan: loaded.baselinePlan, ...loaded.autoPresentation});
  assert.deepEqual(resolved.plan, await json(path.join(preparedDirectory, 'resolved-plan.json')));
  const original = await json(evidence.sourceRefs.historicalDrawing.path), originalPlan = JSON.parse(original.source.planBytes);
  const extension = resolveR2OpeningExtensionV001({inspection: await json(evidence.sourceRefs.sourceInspection.path),
    generationManifest: await json(evidence.sourceRefs.sourceManifest.path), completedFrameCount: evidence.extension.oldCompletedFrameCount,
    observedStartMs: evidence.firstUtterance[0].startMs, observedEndMs: evidence.firstUtterance.at(-1).endMs});
  assert.deepEqual(extension, evidence.extension);
  const expectedPlan = {...structuredClone(originalPlan), elements: originalPlan.elements.slice(0, 5).map(element => ({
    ...structuredClone(element), startFrame: element.startFrame + extension.addedFrameCount,
    endFrameExclusive: element.endFrameExclusive + extension.addedFrameCount}))};
  expectedPlan.elements[0].startFrame = 0; expectedPlan.elements[0].displayFrameCount = expectedPlan.elements[0].endFrameExclusive;
  assert.deepEqual(loaded.baselinePlan, expectedPlan);
  assert.deepEqual(loaded.autoPresentation.context.pulseTimingEvidence, original.source.captionContext.pulseTimingEvidence);
  assert.equal(loaded.autoPresentation.context.pulseTimingProjection.frameOffset, extension.addedFrameCount);
  assert.equal(background.audio.sampleRate, 44100); assert.equal(background.audio.channels, 2);
  const expectedFrameCount = background.expectedFrameCount;
  assert.equal(expectedFrameCount, evidence.clockScope.newShortRange.endFrameExclusive);
  assert.equal(expectedFrameCount * 1470, background.audio.sampleCount);
  const refs = [inputRef, backgroundRef, ...Object.values(evidence.sourceRefs), background.joinedRef, background.pcmRef,
    ...await Promise.all([baselinePath, decisionInputPath, autoProposalPath, overridesPath,
      path.join(preparedDirectory, 'resolved-plan.json')].map(bind))];
  for (const ref of refs) await check(ref);
  const rules = await buildEditedOrchestrationDrawingRulesRefV001();
  const localImplementationRefs = await Promise.all(['r2-render.mjs', 'r2-prepare.mjs', 'r2-media.mjs', 'r2-opening.mjs']
    .map(name => bind(path.join(here, name))));
  const reread = async () => {
    for (const ref of [...refs, ...localImplementationRefs]) await check(ref);
    await verifyEditedOrchestrationDrawingRulesRefV001(rules);
    const reloaded = await loadAutoPresentationV001({baselinePath, decisionInputPath, autoProposalPath, overridesPath});
    assert.deepEqual(resolveAutoPresentationV001({baselinePlan: reloaded.baselinePlan, ...reloaded.autoPresentation}), resolved);
  };
  await mkdir(evidenceDirectory);
  try {
    await onProgress({phase: 'build-r2-short-base', expectedFrameCount});
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
    assert.equal(draw.exitCode, 0, JSON.stringify(draw.failure ?? draw.finalQc));
    assert.equal(draw.finalQc.status, 'passed'); assert.deepEqual(draw.resolvedPlan, resolved.plan);
    assert.equal(draw.outputMedia.video.frameCount, expectedFrameCount);
    const finalAudio = await inspectOrchestrationEncodedAudioV001({audioPath: draw.workVideo,
      logicalSampleCount: expectedFrameCount * 1470, sampleRate: 44100, ...tools});
    assert.equal(finalAudio.packetPayloadSha256, baseAudio.packetPayloadSha256);
    assert.equal(finalAudio.logicalDecodedPayloadSha256, baseAudio.logicalDecodedPayloadSha256);
    await reread(); await check(baseRef);
    const priorRendered = await bind(draw.workVideo);
    const publication = await commitValidatedPresentationArtifactsV002({stagingDirectory: draw.stagingDirectory,
      outputDirectory: draw.outputDirectory, reservation: draw.reservation});
    const after = await bind(path.join(publication.outputDirectory, 'presentation-rendered-v002.mp4'));
    assert.equal(after.fileSha256, priorRendered.fileSha256);
    await reread();
    const result = {status: 'passed', after, inputRef, backgroundRef, expectedFrameCount,
      baseRef, baseAudio, finalAudio, drawingRulesRef: rules, localImplementationRefs,
      finalQc: draw.finalQc, completedFrameQc: draw.completedFrameQc, publication,
      programs: evidence.programs, measuredPeak: evidence.measuredPeak,
      humanQuality: 'pending', oldMediaReplaced: false, newAutomaticJudgment: false};
    await save(path.join(evidenceDirectory, 'completion.json'), result);
    return {status: result.status, after, expectedFrameCount, completionPath: path.join(evidenceDirectory, 'completion.json')};
  } catch (error) {
    await save(path.join(evidenceDirectory, 'failure.json'), {status: 'failed', message: String(error), stack: error.stack});
    throw error;
  }
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const [preparedDirectory, outputDirectory, evidenceDirectory] = process.argv.slice(2);
  console.log(JSON.stringify(await renderR2OpeningV001({preparedDirectory, outputDirectory, evidenceDirectory,
    onProgress: value => console.log(JSON.stringify(value))}), null, 2));
}
