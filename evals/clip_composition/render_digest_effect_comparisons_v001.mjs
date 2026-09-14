#!/usr/bin/env node
// Three short, fixed comparisons. This is a caller of the existing overlay and
// composition engine; all effect resolution is shared with the production entry.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {spawn} from 'node:child_process';
import {mkdir, readFile, writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {buildPresentationRendererOverlayAdapterV001,
  composePresentationMediaV001} from './render_presentation_v002.mjs';
import {createPresentationRendererProcessObserverV001} from './presentation_renderer_process_observation_v001.mjs';
import {resolvePresentationEffectsV001} from './presentation_effects_v001.mjs';
import {inspectOverlayPngWithToolV001, inspectRenderedMediaWithToolsV001} from './presentation_renderer_qc_v002.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const source = path.resolve(root, process.argv[2]);
const destination = path.resolve(root, process.argv[3]);
const read = async p => JSON.parse(await readFile(p, 'utf8'));
const save = (p, value) => writeFile(p, JSON.stringify(value, null, 2) + '\n', {flag: 'wx'});
const digest = value => createHash('sha256').update(value).digest('hex');
const run = (command, args) => new Promise((resolve, reject) => {
  const child = spawn(command, args, {stdio: ['ignore', 'pipe', 'pipe']});
  const stderr = [], stdout = [];
  child.stdout.on('data', data => stdout.push(data)); child.stderr.on('data', data => stderr.push(data));
  child.on('error', reject); child.on('close', (code, signal) => code === 0 && !signal
    ? resolve(Buffer.concat(stdout)) : reject(new Error(Buffer.concat(stderr).toString())));
});
await mkdir(destination, {recursive: false});
await mkdir(path.join(destination, 'scratch'));
const plan = await read(path.join(source, 'style-94-v001/common-plan.json'));
const registry = await read(path.join(source, 'style-94-v001/preset-registry.json'));
const baseTimeline = await read(path.join(source, 'base-media/timeline.json'));
const baseMediaPath = path.join(source, 'base-media/base-media.mp4');
const admission = await read(path.join(source, 'caption-bridge-admission-v001.json'));
const ffmpegPath = admission.runtimeBindings.ffmpeg.path;
const ffprobePath = admission.runtimeBindings.ffprobe.path;
const imageMagickPath = admission.runtimeBindings.imageMagick.path;
const processObserver = createPresentationRendererProcessObserverV001({observationDirectory: path.join(destination, 'scratch', 'process-observations')});
const overlay = buildPresentationRendererOverlayAdapterV001({
  remotionPath: admission.runtimeBindings.remotion.path, chromiumPath: admission.runtimeBindings.chromium.path, processObserver});
const caption = n => `digest-v1-phase2-20260913-v001-bridge-caption-${String(n).padStart(6, '0')}`;
const cases = [
  {id: 'emphasis', start: 3197, end: 3558, effects: {captions: [{captionId: caption(45), preset: 'emphasis'}]}},
  {id: 'reaction', start: 562, end: 723, effects: {captions: [{captionId: caption(9), preset: 'reaction'}]}},
  {id: 'black', start: 1708, end: 1919, effects: {connections: [{beforeSegmentId: 'segment-0001', afterSegmentId: 'segment-0002', transition: 'black'}]}},
];
const result = {sourcePlanSha256: digest(await readFile(path.join(source, 'style-94-v001/common-plan.json'))),
  sourceTimelineSha256: digest(await readFile(path.join(source, 'base-media/timeline.json'))),
  sourceBaseMedia: baseMediaPath, counterfactualQcExecuted: false, comparisons: [], changedCaptionRasterChecks: []};
const pngCache = new Map();
for (const item of cases) {
  const clipBase = path.join(destination, 'scratch', `${item.id}-base.mp4`);
  // A lossless video excerpt makes A/B use identical source pixels. The audio
  // excerpt is encoded once to AAC for MP4 copy in the unchanged composition.
  await run(ffmpegPath, ['-hide_banner', '-loglevel', 'error', '-n', '-ss', String(item.start / 30), '-i', baseMediaPath,
    '-t', String((item.end - item.start) / 30), '-map', '0:v:0', '-map', '0:a:0',
    '-vf', `trim=end_frame=${item.end - item.start},setpts=PTS-STARTPTS`,
    '-af', `atrim=end_sample=${(item.end - item.start) * 1600},asetpts=PTS-STARTPTS`,
    '-c:v', 'libx264', '-qp', '0', '-preset', 'ultrafast', '-c:a', 'aac', clipBase]);
  const clipPlan = {...plan, elements: plan.elements.filter(e => e.endFrameExclusive > item.start && e.startFrame < item.end).map(e => {
    assert(e.startFrame >= item.start && e.endFrameExclusive <= item.end, 'comparison window must preserve complete captions and their fades');
    return {...e, startFrame: e.startFrame - item.start, endFrameExclusive: e.endFrameExclusive - item.start};
  })};
  const clipTimeline = {segments: baseTimeline.segments.filter(s => s.outputEndFrame > item.start && s.outputStartFrame < item.end).map(s => ({
    ...s, outputStartFrame: Math.max(item.start, s.outputStartFrame) - item.start,
    outputEndFrame: Math.min(item.end, s.outputEndFrame) - item.start,
  }))};
  const pair = {id: item.id, baseWindow: {startFrame: item.start, endFrameExclusive: item.end}, effects: item.effects, clips: []};
  for (const [side, effects] of [['A', undefined], ['B', item.effects]]) {
    const resolved = resolvePresentationEffectsV001({plan: clipPlan, baseTimeline: clipTimeline,
      expectedFrameCount: item.end - item.start, effects});
    const records = [];
    for (const element of resolved.plan.elements) {
      const props = overlay.buildProps(element, resolved.plan, registry);
      const key = digest(JSON.stringify(props));
      if (!pngCache.has(key)) {
        const pngPath = path.join(destination, 'scratch', `${key}.png`);
        await overlay.renderStill(props, pngPath);
        pngCache.set(key, pngPath);
        if (element.presentationPreset) {
          const inspection = await inspectOverlayPngWithToolV001({instructionId: element.instructionId, pngPath, imageMagickPath});
          const b = inspection.alphaBounds, c = plan.canvas, safe = c.safeAreaPx;
          assert(b && b.left >= safe.left && b.top >= safe.top
            && b.right <= c.width - safe.right && b.bottom <= c.height - safe.bottom, 'changed caption exceeds safe area');
          result.changedCaptionRasterChecks.push({captionId: element.instructionId, preset: element.presentationPreset, pngPath, inspection});
        }
      }
      records.push({element, pngPath: pngCache.get(key)});
    }
    const outputPath = path.join(destination, `${item.id}-${side}.mp4`);
    await composePresentationMediaV001({baseMediaPath: clipBase, ...resolved, overlayRecords: records,
      timelineAudio: resolved.presentationTimeline ? {sampleRate: 48000, channelLayout: 'stereo'} : null,
      outputPath, ffmpegPath});
    const media = await inspectRenderedMediaWithToolsV001(outputPath, {ffprobePath, ffmpegPath});
    const probe = JSON.parse((await run(ffprobePath, ['-v', 'error', '-count_frames', '-show_streams', '-of', 'json', outputPath])).toString());
    const frames = Number(probe.streams.find(s => s.codec_type === 'video').nb_read_frames);
    assert.equal(frames, resolved.expectedFrameCount);
    assert.equal(media.video.width, 1920); assert.equal(media.video.height, 1080); assert.equal(media.video.fps, 30);
    assert.equal(media.audio.codecName, 'aac');
    assert(Math.abs(media.audio.durationMs - frames * 1000 / 30) <= 1024 * 1000 / 48000);
    await save(path.join(destination, 'scratch', `${item.id}-${side}-resolved.json`), resolved);
    pair.clips.push({side, path: outputPath, fileSha256: digest(await readFile(outputPath)), frames, media,
      presentationTimeline: resolved.presentationTimeline});
    console.log(`${item.id} ${side}: ${frames} frames completed`);
  }
  result.comparisons.push(pair);
}
assert.equal(result.changedCaptionRasterChecks.length, 2);
await save(path.join(destination, 'comparison-record.json'), result);
console.log('3 comparisons / 6 clips completed');
