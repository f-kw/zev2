import {getPresentationPanelPresetV002} from './presentation_panel_presets_v002.mjs';
/** One saved automatic Digest. Connections have already been applied to the
 * subtitle-free background; the renderer receives only the common display clock. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createReadStream} from 'node:fs';
import {mkdir, readFile, writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {executeValidatedPresentationDrawAndQcV001, buildPresentationRendererOverlayAdapterV001,
  commitValidatedPresentationArtifactsV002} from './render_presentation_v002.mjs';
import {createPresentationRendererProcessObserverV001} from './presentation_renderer_process_observation_v001.mjs';
import {inspectRenderedMediaWithToolsV001} from './presentation_renderer_qc_v002.mjs';
import {createOrchestrationContextV001, resolveOrchestrationDrawingViewV001,
  assertOrchestrationDrawingViewMatchesStateV001, exportOrchestrationDrawingViewEvidenceV001}
  from './presentation_orchestration_v001.mjs';
import {assertIgnoredPresentationOutputDirectoryV001} from './presentation_output_directory_v001.mjs';
import {PRESENTATION_EFFECT_TRIAL_PRESETS_V001} from './presentation_effects_v001.mjs';
import {PRESENTATION_INTEGRITY_STATE_QC_METHOD_V001} from './presentation_integrity_state_qc_v001.mjs';
import {getPresentationPulseProgramV001} from './presentation_pulse_v001.mjs';
import {getPresentationCaptionMotionProgramV001} from './presentation_caption_motion_v001.mjs';
import {inspectOrchestrationEncodedAudioV001} from './presentation_orchestration_background_v001.mjs';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const json = async file => JSON.parse(await readFile(file, 'utf8'));
const save = (file, value) => writeFile(file, JSON.stringify(value, null, 2) + '\n', {flag: 'wx'});
async function bind(file) {
  const hash = createHash('sha256'); let bytes = 0;
  for await (const chunk of createReadStream(file)) {hash.update(chunk); bytes += chunk.length;}
  return {path: path.resolve(file), bytes, fileSha256: hash.digest('hex')};
}
async function verify(refs) {
  for (const ref of refs) assert.deepEqual(await bind(ref.path), ref, 'A frozen source or implementation changed');
}
async function readSavedState(directory) {
  const state = {};
  for (const name of ['captionAuto', 'captionOverrides', 'connectionAuto', 'connectionOverrides', 'selectionRecord']) {
    state[name] = await json(path.join(directory, name + '.json'));
  }
  return state;
}

/** Strip only the finite paint/motion chosen by the saved automatic draft and
 * compare every other property, including text, line breaks and source mapping. */
function assertOnlySelectedPresentationChanged(plan, normalPlan, state) {
  const effects = new Map(state.captionAuto.proposal.effects.map(entry => [entry.captionId, entry]));
  const elements = plan.elements.map((element, index) => {
    const original = normalPlan.elements[index], value = structuredClone(element);
    const selected = effects.get(element.instructionId);
    if (selected?.role === 'Pulse accent') {
      assert.equal(element.presentationPulse.anchorPeakId, selected.anchorPeakId);
      delete value.presentationPulse;
    } else if (['Bounce accent', 'Shake accent'].includes(selected?.role)) {
      assert.deepEqual(Object.keys(element.presentationMotion).sort(), ['presentation', 'presetVersion']);
      assert.equal(element.presentationMotion.presentation, selected.presentation);
      delete value.presentationMotion;
    } else if (selected?.role === 'Panel accent') {
      assert.deepEqual(element.visualState.background, getPresentationPanelPresetV002(selected.presentation).background);
      for (const [key, expected] of Object.entries(getPresentationPanelPresetV002(selected.presentation).textStyle)) {
        assert.equal(element.visualState.textStyle[key], expected);
        value.visualState.textStyle[key] = original.visualState.textStyle[key];
      }
      value.visualState.background = original.visualState.background;
    } else if (selected?.role === 'Vocal accent') {
      assert.equal(element.visualState.textStyle.fontSizePx, PRESENTATION_EFFECT_TRIAL_PRESETS_V001.reaction.fontSizePx);
      value.visualState.textStyle.fontSizePx = original.visualState.textStyle.fontSizePx;
    } else if (selected?.role === 'Focus') delete value.presentationColorRange;
    return value;
  });
  assert.deepEqual({...plan, elements}, normalPlan, 'Only saved finite caption appearance may change after projection');
}

export async function renderOrchestrationCandidateV001({evidenceDirectory, outputDirectory,
  savedInputDirectory, inventoryPath, backgroundProofPath}) {
  assert.equal(process.version, 'v20.19.6');
  assert(!Object.hasOwn(process.env, 'NODE_OPTIONS'));
  for (const file of [evidenceDirectory, outputDirectory, savedInputDirectory, inventoryPath, backgroundProofPath]) {
    assert(path.isAbsolute(file), 'Explicit absolute paths are required');
  }
  const guards = [evidenceDirectory, outputDirectory].map(directory =>
    assertIgnoredPresentationOutputDirectoryV001({repositoryRoot: repo, outputDirectory: directory}));
  await mkdir(evidenceDirectory);
  const started = performance.now();
  let sourceReferences = [], implementationReferences = [];
  try {
    const inventory = await json(inventoryPath), state = await readSavedState(savedInputDirectory);
    assert.deepEqual(await json(path.join(savedInputDirectory, 'fresh-input.json')), state.selectionRecord.input);
    assert.equal(await readFile(path.join(savedInputDirectory, 'raw-ai-response-v001.json'), 'utf8'), state.selectionRecord.replyBytes);
    const source = await json(path.join(savedInputDirectory, 'source-bindings.json'));
    const context = createOrchestrationContextV001(source), view = resolveOrchestrationDrawingViewV001({context, state});
    assert.deepEqual(state.captionOverrides.entries, [], 'Candidate must have no caption overrides');
    assert.deepEqual(state.connectionOverrides.entries, [], 'Candidate must have no connection overrides');
    assert.deepEqual(view.resolvedPlan.elements.length, 32);
    assert.deepEqual([view.resolvedPlan.canvas.width, view.resolvedPlan.canvas.height, view.resolvedPlan.canvas.fps], [1920, 1080, 30]);
    assert.equal(view.projection.sourceFrameCount, 4831);
    assert.equal(source.digestRef.sha256, inventory.refs.canonicalEditPlan.fileSha256);
    for (const ref of Object.values(inventory.refs)) {
      const actual = await bind(ref.path);
      assert.equal(actual.fileSha256, ref.fileSha256); assert.equal(actual.bytes, ref.bytes);
    }
    assertOnlySelectedPresentationChanged(view.resolvedPlan, view.projectedNormalPlan, state);
    const background = await json(backgroundProofPath);
    assert.equal(background.status, 'passed');
    assert.equal(background.projectionSha256, view.projection.projectionSha256);
    assert.equal(background.sourceClockSha256, view.projection.sourceClockSha256);
    assert.equal(background.displayFrameCount, view.projection.displayFrameCount);
    assert.deepEqual(background.concreteConnections, view.projection.connections);
    for (const ref of [background.outputs.background, background.outputs.audio]) assert.deepEqual(await bind(ref.path), ref);
    const orchestrationBackground = {projectionSha256: background.projectionSha256,
      displayFrameCount: background.displayFrameCount, video: background.outputs.background, audio: background.outputs.audio};
    const registryPath = path.join(repo, 'evals/clip_composition/registries/presentation/normal-landscape-preset-registry-v001/preset-registry.json');
    const presetRegistry = await json(registryPath);
    const inputFiles = ['source-bindings.json', 'fresh-input.json', 'raw-ai-response-v001.json',
      'captionAuto.json', 'captionOverrides.json', 'connectionAuto.json', 'connectionOverrides.json', 'selectionRecord.json'];
    const fontFiles = presetRegistry.fontAssets.filter(font => view.resolvedPlan.elements.some(element =>
      element.visualState.textStyle.fontAssetId === font.fontAssetId)).flatMap(font =>
      [path.join(repo, font.path), path.join(repo, font.licensePath)]);
    const uniqueSources = [...new Set([...inputFiles.map(file => path.join(savedInputDirectory, file)),
      inventoryPath, ...Object.values(inventory.refs).map(ref => ref.path), backgroundProofPath,
      source.planRef.path, source.timelineRef.path, source.mediaRef.path, source.captionContext.decisionInputRef.path,
      source.captionContext.pulseTimingEvidence.sourceRef.path, source.captionContext.pulseTimingEvidence.candidatesRef.path,
      source.captionContext.pulseTimingEvidence.peaksRef.path,
      background.outputs.background.path, background.outputs.audio.path, registryPath, ...fontFiles])];
    sourceReferences = await Promise.all(uniqueSources.map(bind));
    const codeNames = ['presentation_orchestration_v001.mjs', 'presentation_orchestration_projection_v001.mjs',
      'presentation_orchestration_background_v001.mjs', 'presentation_output_directory_v001.mjs',
      'connection_expression_v001.mjs', 'presentation_auto_effects_v001.mjs', 'presentation_effects_v001.mjs',
      'presentation_pulse_v001.mjs', 'presentation_pulse_evidence_v001.mjs', 'presentation_pulse_renderer_qc_v001.mjs',
      'presentation_caption_motion_v001.mjs', 'render_presentation_v002.mjs', 'presentation_renderer_entry_v001.tsx',
      'inspect_presentation_render_layout_v001.ts', 'presentation_renderer_text_layout_v001.mjs',
      'presentation_renderer_qc_v002.mjs', 'presentation_native_frame_qc_v001.mjs',
      'presentation_native_frame_qc_preparation_v001.mjs', 'presentation_exact_replay_qc_v001.mjs',
      'presentation_integrity_state_qc_v001.mjs', 'presentation_renderer_process_observation_v001.mjs'];
    implementationReferences = await Promise.all([...codeNames.map(file => path.join(repo, 'evals/clip_composition', file)),
      ...['runner/src/remotion/components/TelopText.tsx', 'runner/src/telop/telop-render-model.ts',
        'runner/src/remotion/utils/telop-font.ts', 'runner/src/telop/text-metrics.ts', 'runner/src/telop/telop-line-break.ts']
        .map(file => path.join(repo, file)), fileURLToPath(import.meta.url), process.execPath].map(bind));
    const toolPaths = {ffmpegPath: '/opt/homebrew/bin/ffmpeg', ffprobePath: '/opt/homebrew/bin/ffprobe',
      imageMagickPath: '/opt/homebrew/bin/magick', tsxPath: path.join(repo, 'runner/node_modules/tsx/dist/cli.mjs'),
      layoutInspectorPath: path.join(repo, 'evals/clip_composition/inspect_presentation_render_layout_v001.ts')};
    const media = await inspectRenderedMediaWithToolsV001(background.outputs.background.path, toolPaths);
    assert.equal(media.video.frameCount, view.projection.displayFrameCount);
    const processObserver = createPresentationRendererProcessObserverV001({observationDirectory: path.join(evidenceDirectory, 'processes')});
    const overlayAdapter = buildPresentationRendererOverlayAdapterV001({
      remotionPath: path.join(repo, 'runner/node_modules/@remotion/cli/remotion-cli.js'),
      chromiumPath: path.join(repo, 'runner/node_modules/.remotion/chrome-headless-shell/mac-arm64/chrome-headless-shell-mac-arm64/chrome-headless-shell'), processObserver});
    const limits = {entry: 'existing-shared-renderer-development-entry', formalJobAdmissionProven: false,
      formalTrustChanged: false, humanQuality: 'not-evaluated', paidApiCalls: 0, newExternalMediaTransfers: 0,
      captionPresetHandPlacements: 0, connectionPresetHandPlacements: 0, humanOverrides: 0};
    await save(path.join(evidenceDirectory, 'drawing-evidence.json'), exportOrchestrationDrawingViewEvidenceV001(view));
    await save(path.join(evidenceDirectory, 'projection.json'), view.projection);
    await save(path.join(evidenceDirectory, 'start.json'), {schemaVersion: 'stage3-candidate-start-v001',
      startedAt: new Date().toISOString(), guards, sourceReferences, implementationReferences,
      viewSha256: view.viewSha256, fourSavedSha256: view.fourSavedSha256, media,
      captionCount: 32, expectedFrameCount: view.projection.displayFrameCount, ...limits});
    process.stdout.write(`START stage3 candidate: ${view.projection.displayFrameCount} frames, 32 captions, combined QC\n`);
    const draw = await executeValidatedPresentationDrawAndQcV001({outputDirectory, plan: view.projectedNormalPlan,
      presetRegistry, baseMediaPath: background.outputs.background.path, baseMediaInspection: {media},
      expectedFrameCount: view.projection.displayFrameCount, overlayAdapter, processObserver, toolPaths,
      serializePngAndFilters: true, runCounterfactualQc: true, counterfactualQcMethod: PRESENTATION_INTEGRITY_STATE_QC_METHOD_V001,
      orchestrationDrawingView: view, orchestrationBackground});
    await save(path.join(evidenceDirectory, 'draw-result.json'), draw);
    assert.equal(draw.exitCode, 0, JSON.stringify(draw.failure ?? draw.finalQc));
    assert.equal(draw.finalQc.status, 'passed'); assert.deepEqual(draw.resolvedPlan, view.resolvedPlan);
    assert.equal(draw.outputMedia.video.frameCount, view.projection.displayFrameCount);
    const encodedAudio = await inspectRenderedMediaWithToolsV001(background.outputs.audio.path, toolPaths);
    assert.equal(draw.outputMedia.audio.packetPayloadSha256, encodedAudio.audio.packetPayloadSha256);
    const finalAudioClock = await inspectOrchestrationEncodedAudioV001({audioPath: draw.workVideo,
      logicalSampleCount: view.projection.displayPlaybackSampleCount,
      sampleRate: view.projection.sourceClock.playbackSampleRate, ...toolPaths});
    assertOrchestrationDrawingViewMatchesStateV001({view, context, state: await readSavedState(savedInputDirectory)});
    const rendered = await bind(draw.workVideo);
    for (const manifest of [draw.completedFrameQc.evidence.exactReplay.inputManifest.refs,
      draw.completedFrameQc.evidence.finiteState.inputManifest.inputRefs]) {
      const matches = manifest.filter(ref => ref.role === 'completed-media'); assert.equal(matches.length, 1);
      assert.equal(matches[0].path, draw.workVideo); assert.equal(matches[0].fileSha256, rendered.fileSha256);
    }
    await verify(sourceReferences); await verify(implementationReferences);
    const publication = await commitValidatedPresentationArtifactsV002({stagingDirectory: draw.stagingDirectory,
      outputDirectory: draw.outputDirectory, reservation: draw.reservation});
    assert.equal(publication.status, 'published');
    const candidateVideo = await bind(path.join(publication.outputDirectory, 'presentation-rendered-v002.mp4'));
    assert.equal(candidateVideo.fileSha256, rendered.fileSha256); assert.equal(candidateVideo.bytes, rendered.bytes);
    await verify(sourceReferences); await verify(implementationReferences);
    const dynamicCaptions = view.resolvedPlan.elements.flatMap(element => {
      const kind = element.presentationPulse ? 'pulse' : element.presentationMotion?.presentation;
      return kind ? [{captionId: element.instructionId, kind, projectedStartFrame: element.startFrame,
        program: element.presentationPulse ? getPresentationPulseProgramV001({element, canvas: view.resolvedPlan.canvas})
          : getPresentationCaptionMotionProgramV001({element, canvas: view.resolvedPlan.canvas})}] : [];
    });
    const result = {schemaVersion: 'stage3-candidate-completion-v001', status: 'passed',
      elapsedMilliseconds: performance.now() - started, completedAt: new Date().toISOString(), ...limits,
      candidateVideo, expectedFrameCount: view.projection.displayFrameCount, outputMedia: draw.outputMedia,
      projectionSha256: view.projection.projectionSha256, viewSha256: view.viewSha256,
      fourSavedSha256: view.fourSavedSha256, sourceReferences, implementationReferences,
      fixedSelectionCounts: view.resolution.counts, dynamicCaptions, projectedPeaks: view.projectedPeaks,
      captionContentAndSourceMappingPreserved: true, encodedAudioPacketsCopied: true,
      finalAudioClock,
      finalQc: draw.finalQc, completedFrameQc: draw.completedFrameQc, publication};
    await save(path.join(evidenceDirectory, 'completion.json'), result);
    process.stdout.write('PASS stage3 candidate: ' + candidateVideo.path + '\n');
    return result;
  } catch (error) {
    await save(path.join(evidenceDirectory, 'failure.json'), {status: 'failed', message: String(error), stack: error?.stack,
      elapsedMilliseconds: performance.now() - started, sourceReferences, implementationReferences});
    throw error;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const [jobPath] = process.argv.slice(2);
  if (!jobPath) throw new Error('usage: presentation_orchestration_candidate_v001.mjs absolute-job.json');
  await renderOrchestrationCandidateV001(await json(jobPath));
}
