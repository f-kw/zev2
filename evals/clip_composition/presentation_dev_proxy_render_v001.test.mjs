import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFile, mkdtemp, rm} from 'node:fs/promises';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import os from 'node:os';
import path from 'node:path';
import {fixture} from './presentation_orchestration_v001.test.mjs';
import {canonicalJson} from './presentation_caption_contract_v002.mjs';
import {createOrchestrationContextV001, createOrchestrationJudgmentInputV001, fixOrchestrationJudgmentV001,
  resolveOrchestrationDrawingViewV001, exportOrchestrationDrawingViewEvidenceV001,
  restoreOrchestrationDrawingViewEvidenceV001} from './presentation_orchestration_v001.mjs';
import {PRESENTATION_RENDERER_IMPLEMENTED_LAYOUT_RULES_V001} from './presentation_renderer_plan_v002.mjs';
import {buildPresentationRendererOverlayAdapterV001, buildPresentationCompositeArgumentsV001} from './render_presentation_v002.mjs';
import {createOrchestrationRenderScopeV001} from './presentation_orchestration_render_scope_v001.mjs';
import {buildPresentationDevProxyStructureV001, validatePresentationDevProxyStructureV001,
  buildPresentationDevProxyRangeRecipeV001, assertPresentationDevProxyBackgroundBindingV001,
  assertPresentationDevProxyAlphaBoundsV001, renderPresentationDevProxyV001,
  buildPresentationDevProxyRangeArgumentsV001} from './presentation_dev_proxy_render_v001.mjs';

const profileId = 'dev-proxy-540p-v001', clone = structuredClone;
const sha = value => createHash('sha256').update(value).digest('hex'), hash = value => sha(canonicalJson(value));
const registry = JSON.parse(await readFile(new URL('./registries/presentation/normal-landscape-preset-registry-v001/preset-registry.json', import.meta.url), 'utf8'));
const tools = {remotionPath: '/fixture/remotion', chromiumPath: '/fixture/chromium'};
function savedView(sampleRate = 48000) {
  const f = fixture({sampleRate});
  f.plan.layoutRules = clone(PRESENTATION_RENDERER_IMPLEMENTED_LAYOUT_RULES_V001);
  for (const element of f.plan.elements) element.visualState = clone(registry.presets[0].visualStates[0]);
  f.source.planBytes = JSON.stringify(f.plan) + '\n'; f.source.planRef.fileSha256 = sha(f.source.planBytes);
  f.source.captionContext.baselineRef = {...f.source.planRef, canonicalSha256: hash(f.plan)};
  const context = createOrchestrationContextV001(f.source);
  const input = createOrchestrationJudgmentInputV001({context, evidence: f.evidence});
  const reply = clone(f.reply); reply.inputSha256 = input.inputSha256;
  Object.assign(reply.captions[0], {semanticRole: 'normal', allowedPresets: [{preset: 'normal'}]});
  Object.assign(reply.captions[1], {semanticRole: 'vocal-energy', allowedPresets: [{preset: 'pulse', anchorPeakId: 'peak-1'}]});
  Object.assign(reply.captions[2], {semanticRole: 'reaction', allowedPresets: [{preset: 'shake'}]});
  for (const row of reply.connections) Object.assign(row, {semanticRole: 'continuation', allowedPresets: ['normal-cut']});
  const state = fixOrchestrationJudgmentV001({context, input, replyBytes: JSON.stringify(reply)});
  return resolveOrchestrationDrawingViewV001({context, state});
}
function backgroundFor(view) {
  const sourceRef = {path: '/fixture/background.nut', bytes: 1, fileSha256: sha('background')};
  const sourceClock = {schemaVersion: 'presentation-dev-proxy-source-clock-v001', kind: 'projected-background',
    inputFps: 30, inputFrameCount: view.projection.displayFrameCount, logicalStartFrame: 0,
    logicalEndFrameExclusive: view.projection.displayFrameCount, sourceClockSha256: view.projection.sourceClockSha256,
    projectionSha256: view.projection.projectionSha256, audio: {sampleRate: view.projection.sourceClock.playbackSampleRate, channels: 2}};
  return {manifest: {sourceRef, sourceClock}, background: {status: 'passed', projectionSha256: view.projection.projectionSha256,
    displayFrameCount: view.projection.displayFrameCount, outputs: {background: sourceRef}}};
}
function structuralCompletion(view, range = null) {
  const structure = buildPresentationDevProxyStructureV001({view, profileId, range});
  const plan = createOrchestrationRenderScopeV001(view, range).resolvedPlan;
  const builder = buildPresentationRendererOverlayAdapterV001({...tools, processObserver: {run() {assert.fail('pure fixture');}}}).buildProps;
  let index = 0;
  const stateRecords = structure.captions.flatMap(caption => caption.states.map(state => {
    const props = builder(state.element, plan, registry);
    return {captionId: caption.captionId, ...clone(state), props, propsCanonicalSha256: hash(props),
      png: {path: '/fixture/state-' + index++ + '.png', fileSha256: sha('fixture')}, pngCanvas: clone(structure.profile.outputCanvas),
      calibration: null, alphaObservation: {alphaMax: 1, alphaBounds: {left: 100, top: 100, right: 200, bottom: 200}}};
  }));
  const baseSourceClock = backgroundFor(view).manifest.sourceClock;
  const localMedia = {recipe: buildPresentationDevProxyRangeRecipeV001({sourceClock: baseSourceClock, scope: structure.scope}),
    videoAndPcm: {path: '/fixture/range.nut'}, audio: {path: '/fixture/audio.m4a'}};
  let cursor = 0;
  const records = structure.captions.map(caption => {
    const states = stateRecords.slice(cursor, cursor + caption.states.length); cursor += states.length;
    return caption.kind === 'static' ? {element: caption.element, pngPath: states[0].png.path}
      : {element: caption.element, [caption.kind === 'motion' ? 'motionStates' : 'pulseStates']:
        states.map(row => ({state: row.state, element: row.element, pngPath: row.png.path}))};
  });
  const inputAudio = {codecName: 'aac', sampleRate: view.projection.sourceClock.playbackSampleRate,
    channelLayout: 'stereo', packetPayloadSha256: sha('audio')};
  return {schemaVersion: 'presentation-dev-proxy-completion-v001', status: 'development-proxy-ready',
    profileId, profile: structure.profile, range, structure, tools, registry, stateRecords,
    logicalPlanCanonicalSha256: hash(plan), baseSourceClock, localMedia, inputAudio,
    outputMedia: {video: {codecName: 'h264', ...structure.profile.outputCanvas, frameCount: structure.scope.frameCount}, audio: inputAudio},
    compositorArguments: buildPresentationCompositeArgumentsV001({baseMediaPath: localMedia.videoAndPcm.path, plan,
      overlayRecords: records, expectedFrameCount: structure.scope.frameCount, serializePngAndFilters: true,
      audioMediaPath: localMedia.audio.path, renderRange: structure.renderRange}),
    structuralQc: {status: 'passed'}, finalPixelQc: 'not-run-dev-only', humanQuality: 'not-evaluated'};
}

test('explicit proxy preserves source decisions and every finite-state clock through save/reload and partial range', () => {
  const view = savedView(), before = exportOrchestrationDrawingViewEvidenceV001(view);
  const range = {startFrame: 136, endFrameExclusive: 260};
  const structure = buildPresentationDevProxyStructureV001({view, profileId, range});
  assert.deepEqual(structure.captions.map(row => row.kind), ['pulse', 'motion']);
  assert.equal(structure.captions[0].element.startFrame, 120);
  assert.equal(structure.captions[1].element.startFrame, 240);
  const restored = restoreOrchestrationDrawingViewEvidenceV001(JSON.parse(JSON.stringify(before)));
  assert.deepEqual(buildPresentationDevProxyStructureV001({view: restored, profileId, range}), structure);
  assert.deepEqual(exportOrchestrationDrawingViewEvidenceV001(view), before);
  const completion = structuralCompletion(view, range);
  assert.equal(validatePresentationDevProxyStructureV001({completion, view}).status, 'passed');
  assert.equal(completion.finalPixelQc, 'not-run-dev-only');
  assert(completion.compositorArguments.join(' ').includes('(N+16)'));
  assert(!completion.compositorArguments.includes('-ss'));
});

test('unknown, absent and final profile never enter the development drawing path', async () => {
  const view = savedView();
  for (const invalid of [undefined, '', 'unknown', 'final-1080p-v001']) {
    assert.throws(() => buildPresentationDevProxyStructureV001({view, profileId: invalid}));
    await assert.rejects(renderPresentationDevProxyV001({profileId: invalid}));
  }
});

test('source projection origin, end, frame rate and audio clock must match the passed full background', () => {
  const view = savedView(), input = backgroundFor(view);
  assertPresentationDevProxyBackgroundBindingV001({view, ...input});
  for (const mutate of [m => {m.sourceClock.logicalStartFrame += 100; m.sourceClock.logicalEndFrameExclusive += 100;},
    m => m.sourceClock.inputFrameCount--, m => m.sourceClock.inputFps = 60,
    m => m.sourceClock.projectionSha256 = sha('another'), m => m.sourceClock.audio.sampleRate = 44100,
    m => m.sourceRef = {...m.sourceRef, fileSha256: sha('other video')}]) {
    const changed = clone(input); mutate(changed.manifest);
    assert.throws(() => assertPresentationDevProxyBackgroundBindingV001({view, ...changed}));
  }
});

test('range cutting derives exact frame and PCM sample boundaries for both existing sample rates', () => {
  for (const sampleRate of [44100, 48000]) {
    const view = savedView(sampleRate), structure = buildPresentationDevProxyStructureV001({view, profileId,
      range: {startFrame: 7, endFrameExclusive: 233}});
    const recipe = buildPresentationDevProxyRangeRecipeV001({sourceClock: backgroundFor(view).manifest.sourceClock, scope: structure.scope});
    assert.equal(recipe.inputStartSample, 7 * sampleRate / 30);
    assert.equal(recipe.inputEndSampleExclusive, 233 * sampleRate / 30);
    assert.equal(recipe.logicalSampleCount, 226 * sampleRate / 30);
    assert.equal(recipe.videoFilter, 'trim=start_frame=7:end_frame=233,setpts=PTS-STARTPTS');
    assert(!recipe.audioFilter.includes('duration'));
  }
});

test('structural reader rejects state omission/order/clock/text/font/audio mutations and final-QC promotion', () => {
  const view = savedView(), completion = structuralCompletion(view);
  for (const mutate of [p => p.stateRecords.pop(), p => p.stateRecords.reverse(),
    p => p.stateRecords[0].element.startFrame++, p => p.stateRecords[0].props.text += '変更',
    p => {p.stateRecords[0].props.fontFileName = 'unapproved.ttf'; p.stateRecords[0].propsCanonicalSha256 = hash(p.stateRecords[0].props);},
    p => p.stateRecords[1].png.path = p.stateRecords[0].png.path,
    p => p.outputMedia.video.width = 1920, p => p.outputMedia.video.frameCount--,
    p => p.outputMedia.audio = {...p.outputMedia.audio, packetPayloadSha256: sha('wrong audio')},
    p => p.localMedia.recipe.inputStartSample++, p => p.compositorArguments.push('-ss', '1'),
    p => p.finalPixelQc = 'passed', p => p.humanQuality = 'approved']) {
    const changed = clone(completion); mutate(changed);
    assert.throws(() => validatePresentationDevProxyStructureV001({completion: changed, view}));
  }
});

test('actual alpha observations reject empty and physically out-of-area overlays without a tolerance', () => {
  const view = savedView(), element = view.resolvedPlan.elements[0], canvas = view.resolvedPlan.canvas;
  const args = {element, canvas, profileId};
  assertPresentationDevProxyAlphaBoundsV001({...args, observation: {alphaMax: 1, alphaBounds: {left: 40, top: 20, right: 920, bottom: 520}}});
  for (const observation of [{alphaMax: 0, alphaBounds: null},
    {alphaMax: 1, alphaBounds: {left: 39, top: 20, right: 920, bottom: 520}},
    {alphaMax: 1, alphaBounds: {left: 40, top: 20, right: 921, bottom: 520}}])
    assert.throws(() => assertPresentationDevProxyAlphaBoundsV001({...args, observation}));
});

test('short NUT range retains frame and PCM origin with its explicit no-B-frame intermediate setting', async t => {
  const execute = promisify(execFile), root = await mkdtemp(path.join(os.tmpdir(), 'zev-proxy-range-clock-'));
  t.after(() => rm(root, {recursive: true}));
  const sourcePath = path.join(root, 'source.nut'), outputPath = path.join(root, 'range.nut');
  await execute('/opt/homebrew/bin/ffmpeg', ['-v', 'error', '-n', '-f', 'lavfi', '-i', 'testsrc2=size=32x32:rate=30:duration=1',
    '-f', 'lavfi', '-i', 'sine=frequency=440:sample_rate=48000:duration=1', '-c:v', 'ffv1', '-c:a', 'pcm_f32le', '-ac', '2', sourcePath]);
  const recipe = buildPresentationDevProxyRangeRecipeV001({sourceClock: {kind: 'projected-background', inputFps: 30,
    logicalStartFrame: 0, logicalEndFrameExclusive: 30, audio: {sampleRate: 48000}},
    scope: {startFrame: 7, endFrameExclusive: 23, frameCount: 16}});
  const args = buildPresentationDevProxyRangeArgumentsV001({sourcePath, outputPath, recipe});
  assert.equal(args[args.indexOf('-bf') + 1], '0');
  await execute('/opt/homebrew/bin/ffmpeg', args);
  const {stdout} = await execute('/opt/homebrew/bin/ffprobe', ['-v', 'error', '-show_streams', '-show_frames',
    '-show_entries', 'stream=index,codec_type,time_base:frame=media_type,best_effort_timestamp,nb_samples', '-of', 'json', outputPath]);
  const observed = JSON.parse(stdout), video = observed.frames.filter(frame => frame.media_type === 'video');
  const audio = observed.frames.filter(frame => frame.media_type === 'audio');
  const clock = observed.streams.find(stream => stream.codec_type === 'video').time_base.split('/').map(BigInt);
  assert.equal(video.length, 16);
  video.forEach((frame, i) => assert.equal(BigInt(frame.best_effort_timestamp) * clock[0] * 30n, BigInt(i) * clock[1]));
  assert.equal(audio[0].best_effort_timestamp, 0);
  assert.equal(audio.reduce((sum, frame) => sum + frame.nb_samples, 0), 16 * 1600);
  assert(!structuralCompletion(savedView()).compositorArguments.includes('-bf'), 'final MP4 encoder settings stay unchanged');
});
