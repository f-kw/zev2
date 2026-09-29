/** Explicit development output. Saved 1080p decisions and clocks remain inputs;
 * 540p media and structural evidence never stand in for final pixel QC. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createReadStream} from 'node:fs';
import {lstat, mkdir, readFile, realpath, writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {canonicalJson} from './presentation_caption_contract_v002.mjs';
import {restoreOrchestrationDrawingViewEvidenceV001, assertOrchestrationDrawingViewV001}
  from './presentation_orchestration_v001.mjs';
import {createOrchestrationRenderScopeV001} from './presentation_orchestration_render_scope_v001.mjs';
import {DIGEST_STRUCTURE_VIEW_VERSION, assertDigestStructureDrawingViewV001, createDigestStructureRenderScopeV001}
  from '../../tools/digest-quality/digest-structure-view.mjs';
import {readDigestStructureDrawingEvidenceV001} from '../../tools/digest-quality/digest-structure-evidence.mjs';
import {readPresentationDevProxyStructureBackgroundV001} from './presentation_dev_proxy_structure_background_v001.mjs';
import {assertPresentationDevProxyProfileV001, assertPresentationDevProxySourceCanvasV001}
  from './presentation_dev_proxy_profile_v001.mjs';
import {createPresentationDevProxyOverlaySessionV001} from './presentation_dev_proxy_overlay_session_v001.mjs';
import {readPresentationDevProxyMediaV001} from './presentation_dev_proxy_media_v001.mjs';
import {buildEditedOrchestrationDrawingRulesRefV001, verifyEditedOrchestrationDrawingRulesRefV001}
  from './presentation_orchestration_edited_render_v001.mjs';
import {buildPresentationCaptionMotionStateElementsV001, getPresentationCaptionMotionProgramV001,
  assertPresentationCaptionMotionLayoutsV001} from './presentation_caption_motion_v001.mjs';
import {buildPresentationPulseStateElementsV001, getPresentationPulseProgramV001,
  assertPresentationPulseAnchorsV001} from './presentation_pulse_v001.mjs';
import {isPresentationPanelBackgroundV002} from './presentation_panel_presets_v002.mjs';
import {resolveVisibleCenterOffsetsV001} from './presentation_renderer_text_layout_v001.mjs';
import {createPresentationRendererOverlayJobV001, buildPresentationRendererOverlayAdapterV001,
  composePresentationMediaV001, buildPresentationCompositeArgumentsV001, runPresentationRendererChildProcessV001}
  from './render_presentation_v002.mjs';
import {inspectRenderedMediaWithToolsV001, inspectOverlayPngWithToolV001}
  from './presentation_renderer_qc_v002.mjs';
import {inspectOrchestrationEncodedAudioV001} from './presentation_orchestration_background_v001.mjs';
import {createPresentationRendererProcessObserverV001} from './presentation_renderer_process_observation_v001.mjs';
import {assertIgnoredPresentationOutputDirectoryV001} from './presentation_output_directory_v001.mjs';

const directory = path.dirname(fileURLToPath(import.meta.url)), repo = path.resolve(directory, '../..');
const hash = value => createHash('sha256').update(canonicalJson(value)).digest('hex');
const clone = structuredClone;
const json = async file => JSON.parse(await readFile(file, 'utf8'));
const save = async (file, value) => {await writeFile(file, JSON.stringify(value, null, 2) + '\n', {flag: 'wx'}); return bind(file);};
const same = (a, b, reason) => assert.equal(canonicalJson(a), canonicalJson(b), reason);
const VERSION = 'presentation-dev-proxy-completion-v001';
const ownNames = ['../../tools/digest-quality/digest-structure-view.mjs',
  '../../tools/digest-quality/digest-structure-evidence.mjs', '../../tools/digest-quality/digest-structure-policy.mjs',
  '../../tools/digest-quality/digest-structure-new-captions.mjs', 'presentation_dev_proxy_structure_background_v001.mjs',
  'presentation_dev_proxy_render_v001.mjs', 'presentation_dev_proxy_profile_v001.mjs',
  'presentation_dev_proxy_overlay_session_v001.mjs', 'presentation_dev_proxy_media_v001.mjs'];
async function bind(file) {
  assert(path.isAbsolute(file), 'an absolute artifact path is required');
  const info = await lstat(file); assert(info.isFile() && !info.isSymbolicLink(), 'artifact must be a regular file');
  const sha = createHash('sha256'); for await (const chunk of createReadStream(file)) sha.update(chunk);
  return {path: file, bytes: info.size, fileSha256: sha.digest('hex')};
}
async function verify(ref) {
  const actual = await bind(ref.path); assert.equal(actual.fileSha256, ref.fileSha256, 'artifact bytes changed: ' + ref.path);
  if (ref.bytes !== undefined) assert.equal(actual.bytes, ref.bytes, 'artifact size changed');
  return actual;
}
const isStructureView = view => view?.schemaVersion === DIGEST_STRUCTURE_VIEW_VERSION;
const assertDevelopmentView = view => isStructureView(view) ? assertDigestStructureDrawingViewV001(view) : assertOrchestrationDrawingViewV001(view);
const developmentScope = (view, range = null) => isStructureView(view)
  ? createDigestStructureRenderScopeV001(view, range) : createOrchestrationRenderScopeV001(view, range);
function finite(element, canvas) {
  assert(!(element.presentationPulse && element.presentationMotion), 'caption cannot have two finite programs');
  if (element.presentationMotion) return {kind: 'motion',
    program: getPresentationCaptionMotionProgramV001({element, canvas}),
    states: buildPresentationCaptionMotionStateElementsV001({element, canvas})};
  if (element.presentationPulse) return {kind: 'pulse',
    program: getPresentationPulseProgramV001({element, canvas}),
    states: buildPresentationPulseStateElementsV001({element, canvas})};
  return {kind: 'static', program: null, states: [{state: 'static', element}]};
}

/** Pure derivation: neither a second layout plan nor a new effect selection. */
export function buildPresentationDevProxyStructureV001({view, profileId, range = null}) {
  const profile = assertPresentationDevProxyProfileV001(profileId); assertDevelopmentView(view);
  const derived = developmentScope(view, range), plan = derived.resolvedPlan;
  assertPresentationDevProxySourceCanvasV001(plan.canvas);
  const captions = plan.elements.map(element => ({captionId: element.instructionId,
    element: clone(element), ...clone(finite(element, plan.canvas))}));
  return {schemaVersion: 'presentation-dev-proxy-structure-v001', profile: clone(profile),
    viewSha256: view.viewSha256, projectionSha256: view.projection.projectionSha256,
    fourSavedSha256: clone(view.fourSavedSha256), scope: clone(derived.scope), renderRange: clone(derived.renderRange),
    sourcePlanCanonicalSha256: hash(plan), normalPlanCanonicalSha256: hash(derived.normalPlan),
    captions, stateCount: captions.reduce((sum, row) => sum + row.states.length, 0),
    finalPixelQc: profile.finalPixelQc, humanQuality: profile.humanQuality};
}

function checkMedia(observed, structure, audio) {
  same(observed.video, {codecName: 'h264', ...structure.profile.outputCanvas,
    frameCount: structure.scope.frameCount}, 'proxy media dimensions, rate or frame count differ');
  assert(observed.audio && audio && observed.audio.codecName === 'aac', 'proxy requires separately verified AAC');
  for (const name of ['codecName', 'sampleRate', 'channelLayout', 'packetPayloadSha256'])
    assert.equal(observed.audio[name], audio[name], 'proxy audio differs: ' + name);
}
export function assertPresentationDevProxyAlphaBoundsV001({element, canvas, profileId, observation}) {
  const profile = assertPresentationDevProxyProfileV001(profileId), bounds = observation?.alphaBounds;
  assert(observation?.alphaMax > 0 && bounds, 'development overlay is empty');
  assert(['left', 'top', 'right', 'bottom'].every(key => Number.isFinite(bounds[key]))
    && bounds.right > bounds.left && bounds.bottom > bounds.top, 'development alpha bounds are invalid');
  const {width, height} = profile.outputCanvas, safe = Object.fromEntries(Object.entries(canvas.safeAreaPx)
    .map(([key, value]) => [key, value * profile.pixelScale]));
  if (element.visualState.position.preset === 'top-band') {
    assert(bounds.left === 0 && bounds.top === 0 && bounds.right === width && bounds.bottom <= height,
      'development top-band bounds differ');
  } else assert(bounds.left >= safe.left && bounds.top >= safe.top
    && bounds.right <= width - safe.right && bounds.bottom <= height - safe.bottom, 'development overlay exceeds physical safe area');
  return {alphaMax: observation.alphaMax, alphaBounds: clone(bounds)};
}
function sourceRefs(view) {
  if (isStructureView(view)) return view.structureSourceReferences;
  const source = view.sourceRefs;
  return [source.planRef, source.timelineRef, source.mediaRef, source.decisionInputRef,
    source.pulseTimingEvidence.sourceRef, source.pulseTimingEvidence.candidatesRef, source.pulseTimingEvidence.peaksRef];
}
function toolOptions(tools) {
  for (const name of ['ffmpegPath', 'ffprobePath', 'imageMagickPath', 'remotionPath', 'chromiumPath', 'tsxPath'])
    assert(path.isAbsolute(tools?.[name] ?? ''), 'explicit tool required: ' + name);
  return {...tools, layoutInspectorPath: path.join(directory, 'inspect_presentation_render_layout_v001.ts')};
}
export function buildPresentationDevProxyRangeArgumentsV001({sourcePath, outputPath, recipe}) {
  return ['-hide_banner', '-nostdin', '-v', 'error', '-n', '-i', sourcePath,
    '-map', '0:v:0', '-map', '0:a:0', '-vf', recipe.videoFilter, '-af', recipe.audioFilter,
    // A NUT intermediate has no MP4 edit list for a negative H264 decode clock.
    // Keep presentation sample/frame zero without shifting PCM to accommodate B frames.
    '-c:v', 'libx264', '-preset', 'fast', '-crf', '20', '-pix_fmt', 'yuv420p', '-bf', '0',
    '-c:a', 'pcm_f32le', '-ar', String(recipe.sampleRate), '-ac', '2', '-map_metadata', '-1', '-f', 'nut', outputPath];
}
function audioArguments({sourcePath, outputPath, recipe}) {
  return ['-hide_banner', '-nostdin', '-v', 'error', '-n', '-i', sourcePath, '-map', '0:a:0', '-vn',
    '-af', `asettb=expr=1/${recipe.sampleRate},asetpts=N`, '-c:a', 'aac', '-b:a', '192k',
    '-ar', String(recipe.sampleRate), '-ac', '2', '-movie_timescale', '30', '-movflags', '+faststart', '-map_metadata', '-1', '-f', 'mp4', outputPath];
}
async function executionBinding(view, tools) {
  const originalRules = await buildEditedOrchestrationDrawingRulesRefV001({candidateVersion: view.candidateExecution?.version ?? null});
  const toolBindings = Object.fromEntries(await Promise.all(Object.entries(tools).map(async ([role, command]) =>
    [role, {command, executable: await bind(await realpath(command))}])));
  const refs = await Promise.all([...ownNames.map(name => path.join(directory, name)),
    process.execPath].map(bind));
  return {originalRules, developmentImplementation: refs, toolBindings};
}
async function verifyExecutionBinding(implementation, tools) {
  await verifyEditedOrchestrationDrawingRulesRefV001(implementation.originalRules);
  for (const ref of implementation.developmentImplementation) await verify(ref);
  same(Object.keys(implementation.toolBindings).sort(), Object.keys(tools).sort(), 'tool role coverage differs');
  for (const [role, command] of Object.entries(tools)) {
    assert.equal(implementation.toolBindings[role].command, command, 'tool launch path differs');
    same(await bind(await realpath(command)), implementation.toolBindings[role].executable, 'tool launch target changed: ' + role);
  }
}
export function assertPresentationDevProxyBackgroundBindingV001({view, manifest, background}) {
  assert.equal(background.status, 'passed'); assert.equal(background.projectionSha256, view.projection.projectionSha256);
  assert.equal(background.displayFrameCount, view.projection.displayFrameCount);
  assert.equal(background.outputs.background.path, manifest.sourceRef.path);
  assert.equal(background.outputs.background.fileSha256, manifest.sourceRef.fileSha256);
  const clock = manifest.sourceClock;
  assert.equal(clock.kind, 'projected-background'); assert.equal(clock.inputFps, 30);
  assert.equal(clock.logicalStartFrame, 0, 'full projected background must start at zero');
  assert.equal(clock.inputFrameCount, background.displayFrameCount);
  assert.equal(clock.logicalEndFrameExclusive, background.displayFrameCount);
  assert.equal(clock.projectionSha256, view.projection.projectionSha256);
  assert.equal(clock.sourceClockSha256, view.projection.sourceClockSha256);
  assert.equal(clock.audio.sampleRate, view.projection.sourceClock.playbackSampleRate);
  assert.equal(clock.audio.channels, 2);
}
async function loadInput({drawingEvidenceRef, profileId, range, baseProxyManifestRef, backgroundProofRef, tools,
  structureVerification = 'saved-receipt'}) {
  assertPresentationDevProxyProfileV001(profileId);
  await verify(drawingEvidenceRef); const evidence = await json(drawingEvidenceRef.path);
  const view = evidence.schemaVersion === 'digest-structure-drawing-evidence-v001'
    ? await readDigestStructureDrawingEvidenceV001({evidenceRef: drawingEvidenceRef})
    : restoreOrchestrationDrawingViewEvidenceV001(evidence);
  const structure = buildPresentationDevProxyStructureV001({view, profileId, range});
  for (const ref of sourceRefs(view)) await verify(ref);
  await verify(baseProxyManifestRef); await verify(backgroundProofRef);
  const baseManifest = await json(baseProxyManifestRef.path), background = await json(backgroundProofRef.path);
  let proxy;
  if (isStructureView(view)) {
    proxy = await readPresentationDevProxyStructureBackgroundV001({manifestRef: baseProxyManifestRef, profileId,
      tools: {ffmpegPath: tools.ffmpegPath, ffprobePath: tools.ffprobePath}, expectedProjection: view.projection,
      verification: structureVerification});
    same(background, proxy.backgroundProof, 'structure background proof differs');
    assert.equal(background.projectionSha256, view.projection.projectionSha256);
    assert.equal(background.displayFrameCount, view.projection.displayFrameCount);
  } else {
    assertPresentationDevProxyBackgroundBindingV001({view, manifest: baseManifest, background});
    proxy = await readPresentationDevProxyMediaV001({manifestPath: baseProxyManifestRef.path,
      sourceRef: baseManifest.sourceRef, sourceClock: baseManifest.sourceClock, profileId,
      ffmpegPath: tools.ffmpegPath, ffprobePath: tools.ffprobePath});
  }
  return {view, structure, background, proxy, baseManifest};
}
function recordsFromStates(structure, stateRecords) {
  let offset = 0;
  return structure.captions.map(caption => {
    const states = stateRecords.slice(offset, offset + caption.states.length); offset += states.length;
    const original = {element: clone(caption.element)};
    if (caption.kind === 'static') return {...original, pngPath: states[0].png.path};
    return {...original, [caption.kind === 'motion' ? 'motionStates' : 'pulseStates']:
      states.map((row, i) => ({state: caption.states[i].state, element: clone(caption.states[i].element), pngPath: row.png.path}))};
  });
}

export function buildPresentationDevProxyRangeRecipeV001({sourceClock, scope}) {
  assert.equal(sourceClock.kind, 'projected-background'); assert.equal(sourceClock.inputFps, 30);
  assert(scope.startFrame >= sourceClock.logicalStartFrame && scope.endFrameExclusive <= sourceClock.logicalEndFrameExclusive);
  const startFrame = scope.startFrame - sourceClock.logicalStartFrame;
  const endFrameExclusive = scope.endFrameExclusive - sourceClock.logicalStartFrame;
  const sampleRate = sourceClock.audio.sampleRate, samplesPerFrame = sampleRate / 30;
  assert(Number.isSafeInteger(samplesPerFrame));
  return {sourceRange: {startFrame: sourceClock.logicalStartFrame, endFrameExclusive: sourceClock.logicalEndFrameExclusive},
    displayRange: {startFrame: scope.startFrame, endFrameExclusive: scope.endFrameExclusive},
    inputStartFrame: startFrame, inputEndFrameExclusive: endFrameExclusive, frameCount: scope.frameCount,
    inputStartSample: startFrame * samplesPerFrame, inputEndSampleExclusive: endFrameExclusive * samplesPerFrame,
    logicalSampleCount: scope.frameCount * samplesPerFrame, sampleRate,
    videoFilter: `trim=start_frame=${startFrame}:end_frame=${endFrameExclusive},setpts=PTS-STARTPTS`,
    audioFilter: `atrim=start_sample=${startFrame * samplesPerFrame}:end_sample=${endFrameExclusive * samplesPerFrame},asettb=expr=1/${sampleRate},asetpts=N`};
}
async function audioPayload({file, filter, tools, processObserver, label}) {
  const result = await runPresentationRendererChildProcessV001(tools.ffmpegPath,
    ['-hide_banner', '-nostdin', '-v', 'error', '-i', file, '-map', '0:a:0', '-vn',
      ...(filter ? ['-af', filter] : []), '-c:a', 'pcm_f32le', '-f', 'hash', '-hash', 'sha256', '-'],
    {processObserver, observationLabel: label});
  const value = result.stdout.toString('utf8').trim(); assert(/^SHA256=[a-f0-9]{64}$/.test(value)); return value.slice(7);
}
async function frameClock({file, frameCount, tools, processObserver = null}) {
  const result = await runPresentationRendererChildProcessV001(tools.ffprobePath,
    ['-v', 'error', '-select_streams', 'v:0', '-show_streams', '-show_frames',
      '-show_entries', 'stream=time_base:frame=best_effort_timestamp', '-of', 'json', file],
    {processObserver, observationLabel: 'proxy-frame-clock'});
  const observation = JSON.parse(result.stdout.toString('utf8'));
  assert.equal(observation.streams.length, 1); assert.equal(observation.frames.length, frameCount);
  const [numerator, denominator] = observation.streams[0].time_base.split('/').map(BigInt);
  for (const [index, frame] of observation.frames.entries())
    assert.equal(BigInt(frame.best_effort_timestamp) * numerator * 30n, BigInt(index) * denominator,
      'proxy decoded frame PTS differs from its 30fps index');
  return {status: 'passed', frameCount, fps: 30, timeBase: observation.streams[0].time_base,
    firstPts: String(observation.frames[0].best_effort_timestamp), lastPts: String(observation.frames.at(-1).best_effort_timestamp),
    decodedFrameClockCanonicalSha256: hash(observation), rule: 'every-decoded-PTS-equals-frame-index-over-fps'};
}
async function prepareRange({input, structure, outputDirectory, audioMediaRef, tools, processObserver}) {
  const recipe = buildPresentationDevProxyRangeRecipeV001({sourceClock: input.baseManifest.sourceClock, scope: structure.scope});
  const rangeDirectory = path.join(outputDirectory, 'range'); await mkdir(rangeDirectory);
  const basePath = path.join(rangeDirectory, 'background.nut'), audioPath = path.join(rangeDirectory, 'audio.m4a');
  // Use the verified float32 source of the saved projection. Packet-copy seeks
  // cannot represent arbitrary caption/frame boundaries without changing time.
  assert.equal(input.baseManifest.audio.source.codec, 'pcm_f32le', 'projected range requires preserved float32 PCM');
  const args = buildPresentationDevProxyRangeArgumentsV001({sourcePath: input.proxy.mediaRef.path, outputPath: basePath, recipe});
  await runPresentationRendererChildProcessV001(tools.ffmpegPath, args, {processObserver, observationLabel: 'proxy-range-cut'});
  const sourcePcmSha256 = await audioPayload({file: input.proxy.mediaRef.path, filter: recipe.audioFilter, tools,
    processObserver, label: 'proxy-source-range-pcm'});
  const rangePcmSha256 = await audioPayload({file: basePath, filter: null, tools, processObserver, label: 'proxy-range-pcm'});
  assert.equal(rangePcmSha256, sourcePcmSha256, 'range PCM differs from the exact source sample interval');
  const videoClock = await frameClock({file: basePath, frameCount: recipe.frameCount, tools, processObserver});
  const audioArgs = audioArguments({sourcePath: basePath, outputPath: audioPath, recipe});
  await runPresentationRendererChildProcessV001(tools.ffmpegPath, audioArgs, {processObserver, observationLabel: 'proxy-range-aac'});
  if (audioMediaRef !== null) await verify(audioMediaRef);
  const audioClock = await inspectOrchestrationEncodedAudioV001({audioPath, logicalSampleCount: recipe.logicalSampleCount,
    sampleRate: recipe.sampleRate, ...tools});
  return {schemaVersion: 'presentation-dev-proxy-range-v001', sourceProxyRef: input.proxy.mediaRef, recipe,
    videoAndPcm: await bind(basePath), audio: await bind(audioPath), audioClock, videoClock,
    sourcePcmSha256, rangePcmSha256, rangeCommand: {command: tools.ffmpegPath, args},
    audioCommand: {command: tools.ffmpegPath, args: audioArgs},
    suppliedOriginalAacRef: audioMediaRef, audioUse: 'exact source PCM range, one local AAC encode, packet copy at final mux; original AAC unchanged'};
}

/** A saved result must rederive every caption/state/clock and keep its dev scope. */
export function validatePresentationDevProxyStructureV001({completion, view}) {
  assert.equal(completion.schemaVersion, VERSION); assert.equal(completion.status, 'development-proxy-ready');
  const structure = buildPresentationDevProxyStructureV001({view, profileId: completion.profileId, range: completion.range});
  same(completion.structure, structure, 'saved proxy structure changed');
  same(completion.profile, structure.profile, 'saved profile changed');
  assert.equal(completion.finalPixelQc, 'not-run-dev-only'); assert.equal(completion.humanQuality, 'not-evaluated');
  assert.equal(completion.structuralQc.status, 'passed');
  assert.equal(completion.stateRecords.length, structure.stateCount, 'state coverage differs');
  const expected = structure.captions.flatMap(caption => caption.states.map(state => ({captionId: caption.captionId, ...state})));
  const builder = buildPresentationRendererOverlayAdapterV001({remotionPath: completion.tools.remotionPath,
    chromiumPath: completion.tools.chromiumPath, processObserver: {run() {throw Error('pure props builder');}}}).buildProps;
  const paths = new Set();
  completion.stateRecords.forEach((row, index) => {
    const wanted = expected[index]; assert.equal(row.captionId, wanted.captionId); assert.equal(row.state, wanted.state);
    same(row.element, wanted.element, 'finite state or clock changed');
    assert.equal(row.propsCanonicalSha256, hash(row.props));
    assert.equal(row.props.instructionId, wanted.captionId);
    same(row.props.canvas, view.resolvedPlan.canvas, 'logical canvas changed');
    for (const key of ['text', 'indexedLines', 'visualState']) same(row.props[key], wanted.element[key], 'source drawing property changed: ' + key);
    same(row.props.presentationColorRange ?? null, wanted.element.presentationColorRange ?? null, 'Color scope changed');
    const sourceProps = builder(wanted.element, developmentScope(view, completion.range).resolvedPlan, completion.registry);
    const needsCalibration = wanted.element.visualState.position.preset === 'top-band'
      || isPresentationPanelBackgroundV002(wanted.element.visualState.background);
    assert.equal(row.calibration !== null, needsCalibration, 'source visible-center calibration coverage differs');
    if (row.calibration !== null) sourceProps.renderVisibleCenterCorrectionPx = resolveVisibleCenterOffsetsV001({
      containerBounds: row.calibration.containerBounds, lineBounds: row.calibration.lines.map(line => line.alphaBounds)});
    same(row.props, sourceProps, 'source props, font or visible-center correction changed');
    assert(!paths.has(row.png.path), 'duplicate state output'); paths.add(row.png.path);
    same(row.pngCanvas, structure.profile.outputCanvas, 'state physical canvas changed');
    assertPresentationDevProxyAlphaBoundsV001({element: wanted.element, canvas: view.resolvedPlan.canvas,
      profileId: completion.profileId, observation: row.alphaObservation});
  });
  assert.equal(completion.logicalPlanCanonicalSha256, structure.sourcePlanCanonicalSha256);
  same(completion.localMedia.recipe, buildPresentationDevProxyRangeRecipeV001({sourceClock: completion.baseSourceClock, scope: structure.scope}), 'saved local range differs');
  same(completion.compositorArguments, buildPresentationCompositeArgumentsV001({baseMediaPath: completion.localMedia.videoAndPcm.path,
    plan: developmentScope(view, completion.range).resolvedPlan,
    overlayRecords: recordsFromStates(structure, completion.stateRecords), expectedFrameCount: structure.scope.frameCount,
    serializePngAndFilters: true, audioMediaPath: completion.localMedia.audio.path, renderRange: structure.renderRange}), 'saved compositor command differs');
  checkMedia(completion.outputMedia, structure, completion.inputAudio);
  return {status: 'passed', captionCount: structure.captions.length, stateCount: structure.stateCount,
    finalPixelQc: 'not-run-dev-only', humanQuality: 'not-evaluated'};
}

export async function renderPresentationDevProxyV001({drawingEvidenceRef, profileId, baseProxyManifestRef,
  backgroundProofRef, outputDirectory, range = null, audioMediaRef = null, tools: requestedTools,
  onProgress = () => {}}) {
  assertPresentationDevProxyProfileV001(profileId); const tools = toolOptions(requestedTools);
  const input = await loadInput({drawingEvidenceRef, profileId, range, baseProxyManifestRef, backgroundProofRef, tools});
  const {view, structure} = input, plan = developmentScope(view, range).resolvedPlan;
  const start = performance.now(), timings = {}, guarded = assertIgnoredPresentationOutputDirectoryV001({repositoryRoot: repo, outputDirectory});
  await mkdir(outputDirectory);
  const processObserver = createPresentationRendererProcessObserverV001({observationDirectory: path.join(outputDirectory, 'processes')});
  let session, calibrationAdapter;
  try {
    const implementation = await executionBinding(view, tools);
    const registry = implementation.originalRules.candidateExecution?.registry
      ?? await json(path.join(directory, 'registries/presentation/normal-landscape-preset-registry-v001/preset-registry.json'));
    const buildProps = buildPresentationRendererOverlayAdapterV001({...tools, processObserver}).buildProps;
    const states = structure.captions.flatMap(caption => caption.states.map(state => ({captionId: caption.captionId, ...clone(state)})));
    const props = states.map(state => buildProps(state.element, plan, registry));
    const layoutInput = path.join(outputDirectory, 'layout-input.json'), layoutOutput = path.join(outputDirectory, 'layout-output.json');
    await save(layoutInput, {canvas: plan.canvas, overlays: props});
    const layoutStart = performance.now();
    await runPresentationRendererChildProcessV001(tools.tsxPath, [tools.layoutInspectorPath, layoutInput, layoutOutput],
      {processObserver, observationLabel: 'proxy-logical-layout', env: {NODE_PATH: path.join(repo, 'runner/node_modules')}});
    const layout = await json(layoutOutput); assert.equal(layout.status, 'passed', 'source logical layout failed');
    assert.equal(layout.items.length, states.length);
    let offset = 0;
    for (const caption of structure.captions) {
      const items = layout.items.slice(offset, offset + caption.states.length); offset += caption.states.length;
      assert(items.every(row => row.instructionId === caption.captionId));
      if (caption.kind === 'motion') assertPresentationCaptionMotionLayoutsV001({element: caption.element, canvas: plan.canvas, layoutItems: items});
      if (caption.kind === 'pulse') assertPresentationPulseAnchorsV001(items);
    }
    timings.logicalLayoutMilliseconds = performance.now() - layoutStart;
    const overlays = path.join(outputDirectory, 'overlays'); await mkdir(overlays);
    session = createPresentationDevProxyOverlaySessionV001({repositoryRoot: repo,
      entryPoint: path.join(directory, 'presentation_renderer_entry_v001.tsx'), publicDir: path.join(repo, 'runner/public'),
      remotionPath: tools.remotionPath, chromiumPath: tools.chromiumPath, processObserver, profileId});
    const stateRecords = [], drawStart = performance.now();
    for (const [index, state] of states.entries()) {
      await onProgress({phase: 'proxy-overlays', index, count: states.length});
      let actualProps = props[index], calibration = null;
      if (state.element.visualState.position.preset === 'top-band' || isPresentationPanelBackgroundV002(state.element.visualState.background)) {
        calibrationAdapter ??= createPresentationRendererOverlayJobV001({...tools, processObserver});
        const lines = [];
        for (const line of state.element.indexedLines) {
          const file = path.join(overlays, `${index}-calibration-${line.lineIndex}.png`);
          await calibrationAdapter.renderLineMask(actualProps, line.lineIndex, file);
          const inspected = await inspectOverlayPngWithToolV001({instructionId: state.captionId, pngPath: file,
            imageMagickPath: tools.imageMagickPath, processObserver, observationLabelPrefix: 'proxy-source-calibration'});
          assert(inspected.alphaBounds, 'source calibration mask is empty');
          lines.push({lineIndex: line.lineIndex, file: await bind(file), alphaBounds: inspected.alphaBounds});
        }
        const wrapper = layout.items[index].wrapper;
        const containerBounds = {left: wrapper.left, top: wrapper.top, right: wrapper.left + wrapper.width, bottom: wrapper.top + wrapper.height};
        calibration = {coordinateSpace: 'saved-1080p', containerBounds, lines};
        actualProps = {...actualProps, renderVisibleCenterCorrectionPx: resolveVisibleCenterOffsetsV001({containerBounds,
          lineBounds: lines.map(row => row.alphaBounds)})};
      }
      const pngPath = path.join(overlays, `${index}.png`);
      await session.render(actualProps, pngPath);
      const alphaObservation = assertPresentationDevProxyAlphaBoundsV001({element: state.element, canvas: plan.canvas, profileId,
        observation: await inspectOverlayPngWithToolV001({instructionId: state.captionId, pngPath,
          imageMagickPath: tools.imageMagickPath, processObserver, observationLabelPrefix: 'proxy-physical-overlay'})});
      stateRecords.push({...clone(state), props: actualProps, propsCanonicalSha256: hash(actualProps),
        png: await bind(pngPath), pngCanvas: clone(structure.profile.outputCanvas), alphaObservation, calibration});
    }
    await session.close(); session = null; await calibrationAdapter?.close(); calibrationAdapter = null;
    timings.overlayMilliseconds = performance.now() - drawStart;
    const rangeStart = performance.now();
    const localMedia = await prepareRange({input, structure, outputDirectory, audioMediaRef, tools, processObserver});
    timings.rangePreparationMilliseconds = performance.now() - rangeStart;
    const baseMediaPath = localMedia.videoAndPcm.path, audioPath = localMedia.audio.path;
    const audioSource = await inspectRenderedMediaWithToolsV001(audioPath, {...tools, processObserver});
    const audioClock = await inspectOrchestrationEncodedAudioV001({audioPath,
      logicalSampleCount: structure.scope.playbackEndSampleExclusive - structure.scope.playbackStartSample,
      sampleRate: view.projection.sourceClock.playbackSampleRate, ...tools});
    const records = recordsFromStates(structure, stateRecords), videoPath = path.join(outputDirectory, 'development-proxy.mp4');
    const compositeOptions = {baseMediaPath, plan, overlayRecords: records, expectedFrameCount: structure.scope.frameCount,
      outputPath: videoPath, ffmpegPath: tools.ffmpegPath, processObserver, serializePngAndFilters: true,
      audioMediaPath: localMedia.audio.path, renderRange: structure.renderRange};
    const compositeStart = performance.now(); await onProgress({phase: 'proxy-composite'});
    await composePresentationMediaV001(compositeOptions); timings.compositeMilliseconds = performance.now() - compositeStart;
    const outputMedia = await inspectRenderedMediaWithToolsV001(videoPath, {...tools, processObserver});
    checkMedia(outputMedia, structure, audioSource.audio);
    const outputVideoClock = await frameClock({file: videoPath, frameCount: structure.scope.frameCount, tools, processObserver});
    const outputAudioClock = await inspectOrchestrationEncodedAudioV001({audioPath: videoPath,
      logicalSampleCount: audioClock.logicalDecodedSampleCount, sampleRate: audioClock.sampleRate, ...tools});
    assert.equal(outputAudioClock.packetPayloadSha256, audioClock.packetPayloadSha256);
    const completion = {schemaVersion: VERSION, status: 'development-proxy-ready', profileId, profile: clone(structure.profile),
      drawingEvidenceRef, baseProxyManifestRef, backgroundProofRef, audioMediaRef, tools, range, guarded,
      structure, logicalPlanCanonicalSha256: hash(plan), stateRecords, layoutRef: await bind(layoutOutput), registry,
      localMedia, baseSourceClock: input.baseManifest.sourceClock,
      implementation, sourceReferences: sourceRefs(view), outputVideo: await bind(videoPath), outputMedia, outputVideoClock,
      inputAudio: audioSource.audio, inputAudioClock: audioClock, outputAudioClock,
      compositorArguments: buildPresentationCompositeArgumentsV001(compositeOptions),
      structuralQc: {status: 'passed', scope: 'source decisions/clocks/state order, logical layout, output dimensions/frame count/audio'},
      finalPixelQc: 'not-run-dev-only', humanQuality: 'not-evaluated',
      timings: {...timings, elapsedMilliseconds: performance.now() - start}, processTimings: processObserver.getPerformance()};
    validatePresentationDevProxyStructureV001({completion, view});
    for (const ref of completion.sourceReferences) await verify(ref);
    await verifyExecutionBinding(implementation, tools);
    const completionRef = await save(path.join(outputDirectory, 'completion.json'), completion);
    return {completion, completionRef, mediaRef: completion.outputVideo};
  } catch (error) {
    await save(path.join(outputDirectory, 'failure.json'), {schemaVersion: 'presentation-dev-proxy-failure-v001',
      status: 'incomplete', profileId, drawingEvidenceRef, message: String(error.message), timings,
      finalPixelQc: 'not-run-dev-only'}); throw error;
  } finally {await session?.close(); await calibrationAdapter?.close();}
}

export async function readPresentationDevProxyV001({completionRef}) {
  await verify(completionRef); const completion = await json(completionRef.path);
  const tools = toolOptions(completion.tools);
  const {view, structure, baseManifest, proxy} = await loadInput({...completion, tools,
    structureVerification: 'independent-observation'});
  validatePresentationDevProxyStructureV001({completion, view});
  same(completion.baseSourceClock, baseManifest.sourceClock, 'saved background clock differs');
  same(completion.localMedia.sourceProxyRef, proxy.mediaRef, 'saved local media source differs');
  same(completion.localMedia.rangeCommand, {command: tools.ffmpegPath,
    args: buildPresentationDevProxyRangeArgumentsV001({sourcePath: proxy.mediaRef.path, outputPath: completion.localMedia.videoAndPcm.path,
      recipe: completion.localMedia.recipe})}, 'saved range command differs');
  same(completion.localMedia.audioCommand, {command: tools.ffmpegPath,
    args: audioArguments({sourcePath: completion.localMedia.videoAndPcm.path, outputPath: completion.localMedia.audio.path,
      recipe: completion.localMedia.recipe})}, 'saved audio command differs');
  await verifyExecutionBinding(completion.implementation, tools);
  const actualRegistry = completion.implementation.originalRules.candidateExecution?.registry
    ?? await json(path.join(directory, 'registries/presentation/normal-landscape-preset-registry-v001/preset-registry.json'));
  same(completion.registry, actualRegistry, 'saved proxy registry differs');
  await verify(completion.layoutRef); const layout = await json(completion.layoutRef.path); assert.equal(layout.status, 'passed');
  assert.equal(layout.items.length, completion.stateRecords.length);
  for (const row of completion.stateRecords) {
    await verify(row.png); const header = await readFile(row.png.path);
    assert.equal(header.readUInt32BE(16), 960); assert.equal(header.readUInt32BE(20), 540);
    const alpha = await inspectOverlayPngWithToolV001({instructionId: row.captionId, pngPath: row.png.path, imageMagickPath: tools.imageMagickPath});
    same(assertPresentationDevProxyAlphaBoundsV001({element: row.element, canvas: view.resolvedPlan.canvas,
      profileId: completion.profileId, observation: alpha}), row.alphaObservation, 'saved physical alpha observation differs');
    for (const line of row.calibration?.lines ?? []) {
      await verify(line.file);
      const actual = await inspectOverlayPngWithToolV001({instructionId: row.captionId, pngPath: line.file.path,
        imageMagickPath: tools.imageMagickPath});
      same(actual.alphaBounds, line.alphaBounds, 'source calibration pixel bounds changed');
    }
  }
  for (const ref of [completion.localMedia.videoAndPcm, completion.localMedia.audio]) await verify(ref);
  assert.equal(completion.localMedia.sourcePcmSha256, completion.localMedia.rangePcmSha256);
  const pcm = await audioPayload({file: completion.localMedia.videoAndPcm.path, filter: null, tools,
    processObserver: null, label: 'proxy-reread-range-pcm'});
  assert.equal(pcm, completion.localMedia.rangePcmSha256);
  const sourcePcm = await audioPayload({file: proxy.mediaRef.path, filter: completion.localMedia.recipe.audioFilter,
    tools, processObserver: null, label: 'proxy-reread-source-pcm'});
  assert.equal(pcm, sourcePcm, 'saved local PCM no longer matches the source sample interval');
  const inputAudioClock = await inspectOrchestrationEncodedAudioV001({audioPath: completion.localMedia.audio.path,
    logicalSampleCount: completion.localMedia.recipe.logicalSampleCount, sampleRate: completion.localMedia.recipe.sampleRate, ...tools});
  same(inputAudioClock, completion.inputAudioClock, 'saved encoded local audio changed');
  if (completion.audioMediaRef !== null) await verify(completion.audioMediaRef);
  await verify(completion.outputVideo);
  const observed = await inspectRenderedMediaWithToolsV001(completion.outputVideo.path, tools);
  same(observed, completion.outputMedia, 'saved proxy media observation differs');
  checkMedia(observed, structure, completion.inputAudio);
  same(await frameClock({file: completion.outputVideo.path, frameCount: structure.scope.frameCount, tools}),
    completion.outputVideoClock, 'saved decoded frame clock differs');
  const audio = await inspectOrchestrationEncodedAudioV001({audioPath: completion.outputVideo.path,
    logicalSampleCount: structure.scope.playbackEndSampleExclusive - structure.scope.playbackStartSample,
    sampleRate: view.projection.sourceClock.playbackSampleRate, ...tools});
  same(audio, completion.outputAudioClock, 'saved proxy audio clock differs');
  await verify(completionRef);
  return {status: 'development-proxy-ready', completion, completionRef, mediaRef: completion.outputVideo,
    ...(isStructureView(view) ? {structureInputVerification: proxy.verification,
      structureIndependentObservation: proxy.independentVerification} : {}),
    finalPixelQc: 'not-run-dev-only', humanQuality: 'not-evaluated'};
}
