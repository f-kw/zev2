/** One whole-Digest candidate through the existing shared development renderer. */
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
import {loadAutoPresentationV001} from './presentation_auto_effects_io_v001.mjs';
import {resolveAutoPresentationV001} from './presentation_auto_effects_v001.mjs';
import {PRESENTATION_PANEL_PRESET_V001, PRESENTATION_EFFECT_TRIAL_PRESETS_V001} from './presentation_effects_v001.mjs';
import {PRESENTATION_INTEGRITY_STATE_QC_METHOD_V001} from './presentation_integrity_state_qc_v001.mjs';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const json = async p => JSON.parse(await readFile(p, 'utf8'));
const save = (p, value) => writeFile(p, JSON.stringify(value, null, 2) + '\n', {flag: 'wx'});
async function bind(p) {
  const hash = createHash('sha256'); let bytes = 0;
  for await (const chunk of createReadStream(p)) {hash.update(chunk); bytes += chunk.length;}
  return {path: path.resolve(p), bytes, fileSha256: hash.digest('hex')};
}
async function verify(refs) {
  for (const ref of refs) assert.deepEqual(await bind(ref.path), ref, 'A frozen input or implementation changed');
}

export async function renderCaptionExpressionStage1CandidateV001({
  evidenceDirectory, outputDirectory, baselinePath, decisionInputPath, autoProposalPath, baseMediaPath,
}) {
  assert.equal(process.version, 'v20.19.6');
  assert(!Object.hasOwn(process.env, 'NODE_OPTIONS'), 'Use the existing fixed Node runtime without injected options');
  for (const p of [evidenceDirectory, outputDirectory, baselinePath, decisionInputPath, autoProposalPath, baseMediaPath]) {
    assert(path.isAbsolute(p), 'Use explicit absolute paths');
  }
  await mkdir(evidenceDirectory);
  const start = performance.now();
  let sourceReferences = [], implementationReferences = [];
  try {
    const registryPath = path.join(repo, 'evals/clip_composition/registries/presentation/normal-landscape-preset-registry-v001/preset-registry.json');
    const loaded = await loadAutoPresentationV001({baselinePath, decisionInputPath, autoProposalPath});
    const plan = loaded.baselinePlan, before = structuredClone(plan), presetRegistry = await json(registryPath);
    assert.equal(plan.schemaVersion, 'presentation-output-common-core-plan-v001');
    assert.equal(plan.elements.length, 32);
    assert(plan.elements.every(element => element.kind === 'speech-caption'));
    assert.deepEqual([plan.canvas.width, plan.canvas.height, plan.canvas.fps], [1920, 1080, 30]);
    const automatic = loaded.autoPresentation;
    assert.equal(automatic.overrides, undefined, 'The submitted candidate must use the new fixed automatic draft without human corrections');
    const expected = resolveAutoPresentationV001({baselinePlan: plan, ...automatic});
    assert(expected.resolution.captions.every(row => row.origin === 'automatic' && row.hasOverride === false));
    const newUses = expected.resolution.captions.filter(row => ['Bounce accent', 'Shake accent'].includes(row.role));
    assert(newUses.length > 0, 'NO_NEW_EXPRESSIONS_SELECTED: inspect input, eligibility and judgment; do not hand-place examples');
    const codeNames = ['presentation_auto_effects_v001.mjs', 'presentation_auto_effects_io_v001.mjs',
      'presentation_effects_v001.mjs', 'presentation_pulse_v001.mjs', 'presentation_pulse_evidence_v001.mjs',
      'presentation_pulse_renderer_qc_v001.mjs', 'presentation_caption_motion_v001.mjs',
      'render_presentation_v002.mjs', 'presentation_renderer_entry_v001.tsx',
      'inspect_presentation_render_layout_v001.ts', 'presentation_renderer_text_layout_v001.mjs',
      'presentation_renderer_qc_v002.mjs', 'presentation_native_frame_qc_v001.mjs',
      'presentation_native_frame_qc_preparation_v001.mjs', 'presentation_exact_replay_qc_v001.mjs',
      'presentation_integrity_state_qc_v001.mjs', 'presentation_renderer_process_observation_v001.mjs'];
    implementationReferences = await Promise.all([...codeNames.map(p => path.join(repo, 'evals/clip_composition', p)),
      ...['runner/src/remotion/components/TelopText.tsx', 'runner/src/telop/telop-render-model.ts',
        'runner/src/remotion/utils/telop-font.ts', 'runner/src/telop/text-metrics.ts',
        'runner/src/telop/telop-line-break.ts'].map(p => path.join(repo, p)),
      fileURLToPath(import.meta.url), process.execPath].map(bind));
    const fontFiles = presetRegistry.fontAssets.filter(font => plan.elements.some(element =>
      element.visualState.textStyle.fontAssetId === font.fontAssetId)).flatMap(font =>
      [path.join(repo, font.path), path.join(repo, font.licensePath)]);
    sourceReferences = await Promise.all([baselinePath, decisionInputPath, autoProposalPath, baseMediaPath,
      registryPath, ...fontFiles].map(bind));
    const toolPaths = {ffmpegPath: '/opt/homebrew/bin/ffmpeg', ffprobePath: '/opt/homebrew/bin/ffprobe',
      imageMagickPath: '/opt/homebrew/bin/magick', tsxPath: path.join(repo, 'runner/node_modules/tsx/dist/cli.mjs'),
      layoutInspectorPath: path.join(repo, 'evals/clip_composition/inspect_presentation_render_layout_v001.ts')};
    const media = await inspectRenderedMediaWithToolsV001(baseMediaPath, toolPaths);
    assert.equal(media.video.frameCount, 4831);
    const processObserver = createPresentationRendererProcessObserverV001({observationDirectory: path.join(evidenceDirectory, 'processes')});
    const overlayAdapter = buildPresentationRendererOverlayAdapterV001({
      remotionPath: path.join(repo, 'runner/node_modules/@remotion/cli/remotion-cli.js'),
      chromiumPath: path.join(repo, 'runner/node_modules/.remotion/chrome-headless-shell/mac-arm64/chrome-headless-shell-mac-arm64/chrome-headless-shell'),
      processObserver});
    const limits = {entry: 'existing-shared-renderer-development-entry', formalJobAdmissionProven: false,
      formalTrustChanged: false, priorJobTrustSnapshotUsed: false, humanQuality: 'not-evaluated',
      paidApiCalls: 0, newExternalMediaTransfers: 0, humanOverrides: 0};
    await save(path.join(evidenceDirectory, 'start.json'), {schemaVersion: 'stage1-candidate-start-v001',
      startedAt: new Date().toISOString(), sourceReferences, implementationReferences, media,
      captionCount: 32, expectedFrameCount: 4831, newUses, counterfactualQcMethod: PRESENTATION_INTEGRITY_STATE_QC_METHOD_V001, ...limits});
    process.stdout.write('START stage1 candidate: 4831 frames, 32 captions, shared renderer with combined full-video and finite-state QC\n');
    const draw = await executeValidatedPresentationDrawAndQcV001({outputDirectory, plan, presetRegistry,
      baseMediaPath, baseMediaInspection: {media}, expectedFrameCount: 4831, overlayAdapter, processObserver,
      toolPaths, serializePngAndFilters: true, runCounterfactualQc: true,
      counterfactualQcMethod: PRESENTATION_INTEGRITY_STATE_QC_METHOD_V001, autoPresentation: automatic});
    await save(path.join(evidenceDirectory, 'draw-result.json'), draw);
    assert.equal(draw.exitCode, 0, JSON.stringify(draw.failure ?? draw.finalQc));
    assert.equal(draw.finalQc.status, 'passed');
    assert.deepEqual(draw.resolvedPlan, expected.plan);
    assert.deepEqual(draw.autoPresentationInputs, automatic);
    assert.equal(draw.autoPresentationResolution.overridesSha256, null);
    assert.deepEqual(plan, before);
    const effects = new Map(automatic.autoProposal.proposal.effects.map(entry => [entry.captionId, entry]));
    const restored = draw.resolvedPlan.elements.map((element, index) => {
      const value = structuredClone(element), selected = effects.get(element.instructionId);
      if (selected?.role === 'Pulse accent') {
        assert.equal(element.presentationPulse.anchorPeakId, selected.anchorPeakId);
        delete value.presentationPulse;
      } else if (['Bounce accent', 'Shake accent'].includes(selected?.role)) {
        assert.deepEqual(Object.keys(element.presentationMotion).sort(), ['presentation', 'presetVersion']);
        assert.equal(element.presentationMotion.presentation, selected.presentation);
        delete value.presentationMotion;
      } else if (selected?.role === 'Panel accent') {
        assert.deepEqual(element.visualState.background, PRESENTATION_PANEL_PRESET_V001.background);
        for (const [key, v] of Object.entries(PRESENTATION_PANEL_PRESET_V001.textStyle)) {
          assert.equal(element.visualState.textStyle[key], v);
          value.visualState.textStyle[key] = before.elements[index].visualState.textStyle[key];
        }
        value.visualState.background = before.elements[index].visualState.background;
      } else if (selected?.role === 'Vocal accent') {
        assert.equal(element.visualState.textStyle.fontSizePx, PRESENTATION_EFFECT_TRIAL_PRESETS_V001.reaction.fontSizePx);
        value.visualState.textStyle.fontSizePx = before.elements[index].visualState.textStyle.fontSizePx;
      } else if (selected?.role === 'Focus') delete value.presentationColorRange;
      return value;
    });
    assert.deepEqual({...draw.resolvedPlan, elements: restored}, before,
      'Only the selected finite appearance or motion may differ from the original plan');
    assert.equal(draw.outputMedia.video.frameCount, 4831);
    assert.equal(draw.outputMedia.audio.packetPayloadSha256, media.audio.packetPayloadSha256);
    const renderedVideo = await bind(draw.workVideo);
    const replayMedia = draw.completedFrameQc.evidence.exactReplay.inputManifest.refs
      .filter(ref => ref.role === 'completed-media');
    const finiteMedia = draw.completedFrameQc.evidence.finiteState.inputManifest.inputRefs
      .filter(ref => ref.role === 'completed-media');
    assert.equal(replayMedia.length, 1); assert.equal(finiteMedia.length, 1);
    for (const ref of [...replayMedia, ...finiteMedia]) {
      assert.equal(ref.path, draw.workVideo);
      assert.equal(ref.fileSha256, renderedVideo.fileSha256);
    }
    await verify(sourceReferences); await verify(implementationReferences);
    const publication = await commitValidatedPresentationArtifactsV002({stagingDirectory: draw.stagingDirectory,
      outputDirectory: draw.outputDirectory, reservation: draw.reservation});
    assert.equal(publication.status, 'published');
    const videoPath = path.join(publication.outputDirectory, 'presentation-rendered-v002.mp4');
    const candidateVideo = await bind(videoPath);
    assert.equal(candidateVideo.fileSha256, renderedVideo.fileSha256);
    assert.equal(candidateVideo.bytes, renderedVideo.bytes);
    await verify(sourceReferences); await verify(implementationReferences);
    const result = {schemaVersion: 'stage1-candidate-completion-v001', status: 'passed',
      elapsedMilliseconds: performance.now() - start, completedAt: new Date().toISOString(), ...limits,
      candidateVideo, captionCount: 32, expectedFrameCount: 4831,
      outputMedia: draw.outputMedia, sourceReferences, implementationReferences,
      planContentAndTimingPreserved: true, audioPacketsIdentical: true, resolution: draw.autoPresentationResolution,
      newUses: newUses.map(row => ({captionId: row.captionId, role: row.role,
        startFrame: before.elements.find(element => element.instructionId === row.captionId).startFrame,
        endFrameExclusive: before.elements.find(element => element.instructionId === row.captionId).endFrameExclusive})),
      finalQc: draw.finalQc, completedFrameQc: draw.completedFrameQc, publication};
    await save(path.join(evidenceDirectory, 'completion.json'), result);
    process.stdout.write('PASS stage1 candidate: ' + videoPath + '\n');
    return result;
  } catch (error) {
    await save(path.join(evidenceDirectory, 'failure.json'), {status: 'failed', message: String(error),
      stack: error?.stack, elapsedMilliseconds: performance.now() - start, sourceReferences, implementationReferences});
    throw error;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const [evidenceDirectory, outputDirectory, baselinePath, decisionInputPath, autoProposalPath, baseMediaPath] = process.argv.slice(2);
  if (!baseMediaPath) throw new Error('usage: stage1-candidate evidence-directory new-output-directory normal-plan decision-input fixed-auto base-media');
  await renderCaptionExpressionStage1CandidateV001({evidenceDirectory, outputDirectory, baselinePath,
    decisionInputPath, autoProposalPath, baseMediaPath});
}
