import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {mkdtemp, rm} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import test from 'node:test';
import {resolvePresentationEffectsV001 as resolve} from './presentation_effects_v001.mjs';
import {buildPresentationCompositeArgumentsV001 as argsFor, executeValidatedPresentationDrawAndQcV001} from './render_presentation_v002.mjs';
import {evaluatePresentationRendererQcV002, inspectRenderedMediaWithToolsV001} from './presentation_renderer_qc_v002.mjs';

const plan = {canvas: {width: 64, height: 36, fps: 30}, elements: [0, 1, 2].map(i => ({
  instructionId: `c${i}`, kind: 'speech-caption', text: `caption ${i}`, indexedLines: [{text: `caption ${i}`}],
  startFrame: i * 30, endFrameExclusive: i * 30 + 30, displayFrameCount: 30,
  visualState: {textStyle: {fontSizePx: 94, fontColor: '#FFFDF8', fontAssetId: 'existing'},
    position: {preset: 'bottom-center'}},
}))};
const baseTimeline = {segments: [0, 1, 2].map(i => ({segmentId: `s${i}`,
  outputStartFrame: i * 30, outputEndFrame: i * 30 + 30, sourceStartFrame30: i * 100}))};
const input = {plan, baseTimeline, expectedFrameCount: 90};
const connection = (i, transition = 'black') => ({beforeSegmentId: `s${i}`, afterSegmentId: `s${i + 1}`, transition});

test('audio-only QC requires packet identity for copies and the declared duration and codec after edits', () => {
  const canvas = plan.canvas;
  const mediaInspection = {durationMs: 3800, video: {...canvas, frameCount: 114},
    audio: {codecName: 'aac', sampleRate: 48000, durationMs: 3800, packetPayloadSha256: 'new'}};
  const check = expectedAudio => evaluatePresentationRendererQcV002({plan: {elements: [], canvas},
    applicationResults: [], overlayInspections: [], canvas, expectedFrameCount: 114, mediaInspection, expectedAudio,
    requireFinalVisibility: false});
  assert.equal(check({present: true, codecName: 'aac', packetPayloadSha256: 'old'}).status, 'failed');
  const edited = {present: true, mode: 'timeline-insertions', codecName: 'aac', sampleRate: 48000, durationMs: 3800};
  assert.equal(check(edited).status, 'passed');
  for (const changed of [{durationMs: 3400}, {sampleRate: 44100}, {codecName: 'opus'}]) {
    assert.equal(check({...edited, ...changed}).status, 'failed');
  }
});

test('no selections and explicit normal preserve the existing plan and compositor arguments', () => {
  const captured = execFileSync('git', ['show', '3a3270be35246b8335b45b61dc5be8bd1b5d8b21:evals/clip_composition/render_presentation_v002.mjs'], {encoding: 'utf8'});
  const begin = captured.indexOf('export const buildPresentationCompositeArgumentsV001 =');
  const end = captured.indexOf('\nconst composite =', begin);
  const before = vm.runInNewContext(captured.slice(begin, end).replace('export const', 'const') + '\nbuildPresentationCompositeArgumentsV001;');
  for (const effects of [undefined, {}, {captions: [{captionId: 'c0', preset: 'normal'}], connections: [connection(0, 'normal-cut')]}]) {
    const resolved = resolve({...input, effects});
    assert.equal(resolved.plan, plan);
    assert.equal(resolved.presentationTimeline, null);
    const argsInput = {...resolved, baseMediaPath: '/base.mp4', overlayRecords: plan.elements.map(element => ({element, pngPath: '/caption.png'}))};
    assert.deepEqual(argsFor(argsInput), Array.from(before(argsInput)));
  }
});

test('preset changes only its selected display property; text, IDs, boundaries and position stay intact', () => {
  for (const [preset, property, value] of [['emphasis', 'fontColor', '#FFD65A'], ['reaction', 'fontSizePx', 128]]) {
    const result = resolve({...input, effects: {captions: [{captionId: 'c1', preset}]}});
    assert.equal(result.plan.elements[0], plan.elements[0]);
    assert.equal(result.plan.elements[2], plan.elements[2]);
    const expected = structuredClone(plan.elements[1]);
    expected.presentationPreset = preset;
    expected.visualState.textStyle[property] = value;
    assert.deepEqual(result.plan.elements[1], expected);
  }
});

test('invalid and duplicate selections, nonadjacent connections and crossing captions fail closed', () => {
  const bad = [
    {captions: null}, {connections: null},
    {captions: [{captionId: 'missing', preset: 'emphasis'}]},
    {captions: [{captionId: 'c0', preset: 'free', fontSizePx: 100}]},
    {captions: [{captionId: 'c0', preset: 'normal'}, {captionId: 'c0', preset: 'reaction'}]},
    {connections: [{...connection(0), afterSegmentId: 's2'}]},
    {connections: [connection(0), connection(0)]},
    {connections: [{...connection(0), transition: 'fade'}]},
    {connections: [{...connection(0), duration: 12}]},
  ];
  for (const effects of bad) assert.throws(() => resolve({...input, effects}), /presentation effects/);
  assert.throws(() => resolve({...input, plan: {...plan, elements: [{...plan.elements[0], endFrameExclusive: 31}]},
    effects: {connections: [connection(0)]}}), /crosses/);
});

test('two black insertions preserve source references and cumulatively move video, audio and captions', async () => {
  const effects = {connections: [connection(1), connection(0)]};
  const resolved = resolve({...input, effects});
  assert.equal(resolved.expectedFrameCount, 114);
  assert.deepEqual(resolved.plan.elements.map(e => [e.startFrame, e.endFrameExclusive, e.displayFrameCount]),
    [[0, 30, 30], [42, 72, 30], [84, 114, 30]]);
  for (const span of resolved.presentationTimeline.spans.filter(s => s.kind === 'black')) {
    assert.deepEqual(Object.keys(span).sort(), ['kind', 'beforeSegmentId', 'afterSegmentId', 'startFrame', 'endFrameExclusive'].sort());
  }
  const directory = await mkdtemp(path.join(os.tmpdir(), 'zev-effects-timeline-'));
  const ffmpeg = '/opt/homebrew/bin/ffmpeg';
  const run = args => execFileSync(ffmpeg, ['-hide_banner', '-loglevel', 'error', ...args], {maxBuffer: 8 * 1024 * 1024});
  try {
    const base = path.join(directory, 'base.nut'), output = path.join(directory, 'output.nut');
    run(['-f', 'lavfi', '-i', 'testsrc2=size=64x36:rate=30:duration=3', '-f', 'lavfi', '-i',
      'sine=frequency=440:sample_rate=48000:duration=3', '-c:v', 'ffv1', '-c:a', 'pcm_s16le', base]);
    const args = argsFor({...resolved, baseMediaPath: base, overlayRecords: [],
      timelineAudio: {sampleRate: 48000, channelLayout: 'mono'}, serializePngAndFilters: true});
    // Check the actual shared trim/concat graph without lossy encoder noise.
    run([...args, '-c:v', 'ffv1', '-c:a', 'pcm_s16le', output]);
    const video = file => run(['-i', file, '-map', '0:v', '-pix_fmt', 'yuv420p', '-f', 'rawvideo', '-']);
    const audio = file => run(['-i', file, '-map', '0:a', '-f', 's16le', '-']);
    const [bv, ov, ba, oa] = [video(base), video(output), audio(base), audio(output)];
    const frameBytes = 64 * 36 * 3 / 2, sampleBytes = 2, samplesPerFrame = 1600;
    assert.equal(ov.length, 114 * frameBytes);
    assert.equal(oa.length, 114 * samplesPerFrame * sampleBytes);
    for (const span of resolved.presentationTimeline.spans) {
      const v = ov.subarray(span.startFrame * frameBytes, span.endFrameExclusive * frameBytes);
      const a = oa.subarray(span.startFrame * samplesPerFrame * sampleBytes, span.endFrameExclusive * samplesPerFrame * sampleBytes);
      if (span.kind === 'base') {
        assert.deepEqual(v, bv.subarray(span.baseStartFrame * frameBytes, span.baseEndFrame * frameBytes));
        assert.deepEqual(a, ba.subarray(span.baseStartFrame * samplesPerFrame * sampleBytes, span.baseEndFrame * samplesPerFrame * sampleBytes));
      } else {
        const black = Buffer.concat([Buffer.alloc(64 * 36, 16), Buffer.alloc(64 * 36 / 2, 128)]);
        assert.deepEqual(v, Buffer.concat(Array(12).fill(black)));
        assert.deepEqual(a, Buffer.alloc(a.length));
      }
    }
    const rendererDirectory = await mkdtemp(path.resolve('evals/clip_composition/outputs/presentation/effects-common-test-'));
    try {
      const tools = {ffmpegPath: ffmpeg, ffprobePath: '/opt/homebrew/bin/ffprobe', imageMagickPath: '/opt/homebrew/bin/magick'};
      const baseMediaInspection = {media: await inspectRenderedMediaWithToolsV001(base, tools)};
      const drawn = await executeValidatedPresentationDrawAndQcV001({outputDirectory: path.join(rendererDirectory, 'render'),
        plan: {...plan, elements: []}, presetRegistry: {}, baseMediaPath: base, baseMediaInspection,
        expectedFrameCount: 90, baseTimeline, effects, runCounterfactualQc: false, toolPaths: tools,
        validatedLayoutInspection: {status: 'passed', items: []}, serializePngAndFilters: true});
      assert.equal(drawn.exitCode, 0, JSON.stringify(drawn));
      assert.equal(drawn.counterfactualQcExecuted, false);
      assert.equal(drawn.outputMedia.video.frameCount, 114);
      assert.equal(drawn.finalQc.status, 'passed');
    } finally {
      await rm(rendererDirectory, {recursive: true});
    }
  } finally {
    await rm(directory, {recursive: true});
  }
});
