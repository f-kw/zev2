import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readFile, mkdtemp, rm} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import {canonicalSha256} from './clock.mjs';
import {prepareDigestStructureNewCaptionsV001, buildDigestStructureNewCaptionsV001,
  restoreDigestStructureNewCaptionsV001, saveDigestStructureNewCaptionsV001} from './digest-structure-new-captions.mjs';
import {PRESENTATION_RENDERER_IMPLEMENTED_LAYOUT_RULES_V001} from '../../evals/clip_composition/presentation_renderer_plan_v002.mjs';
import {createOrchestrationProjectionV001} from '../../evals/clip_composition/presentation_orchestration_projection_v001.mjs';
import {createHash} from 'node:crypto';
import {mapPresentationSourceIntervalV002} from '../../evals/clip_composition/presentation_base_media_timeline_v004.mjs';

const hash = b => createHash('sha256').update(b).digest('hex'), clone = structuredClone;
const seal = body => ({...body, canonicalSha256: canonicalSha256(body)});
const registry = JSON.parse(await readFile(new URL('../../evals/clip_composition/registries/presentation/normal-landscape-preset-registry-v001/preset-registry.json', import.meta.url), 'utf8'));
function fixture() {
  const visualState = clone(registry.presets[0].visualStates[0]);
  Object.assign(visualState.textStyle, {fontSizePx: 144, borderWidthPx: 4, glowWidthPx: 4, borderColor: '#2F4F4F', glowColor: '#2F4F4F'});
  const transcript = {segments: [
    {id: 1, text: '赤', startMs: 1000, endMs: 1010}, {id: 2, text: 'い犬が', startMs: 1010, endMs: 2000},
    {id: 3, text: '走る', startMs: 2000, endMs: 3000}, {id: 4, text: 'ありがとう', startMs: 6000, endMs: 7000},
    {id: 5, text: 'さようなら', startMs: 7000, endMs: 8000}]};
  const baseTimeline = {schemaVersion: 'presentation-base-media-timeline-v003', timelineId: 'timeline-fixture',
    sourceProvenance: 'fixture', sourceRef: 'source-fixture', sourceFrameClock: {inputFrameRate: '60/1', logicalFrameRate: '30/1',
      extractionRuleId: 'source-frame-60fps-global-even-v001', decodedFrameCount: 600, containerStartTimeMs: 0,
      videoStreamTimeBase: '1/60', videoFirstPts: 0, videoPtsStep: 1, videoPresentationOffsetMs: 0},
    baseMedia: {artifactId: 'base-fixture', path: 'base-media.mp4', fileSha256: 'a'.repeat(64), frameRate: '30/1', expectedFrameCount: 120},
    segments: [{segmentId: 'segment-0001', sourceStartMs: 1000, sourceEndMs: 3000, sourceStartFrame30: 30, sourceEndFrame30: 90, outputStartFrame: 0, outputEndFrame: 60},
      {segmentId: 'segment-0002', sourceStartMs: 6000, sourceEndMs: 8000, sourceStartFrame30: 180, sourceEndFrame30: 240, outputStartFrame: 60, outputEndFrame: 120}]};
  return {transcript, baseTimeline, projection: null, registry,
    segments: [{role: 'intro', segmentId: 'segment-0001', startSourceSegmentId: 1, endSourceSegmentId: 3, sourceStartMs: 1000, sourceEndMs: 3000},
      {role: 'closure', segmentId: 'segment-0002', startSourceSegmentId: 4, endSourceSegmentId: 5, sourceStartMs: 6000, sourceEndMs: 8000}],
    semanticDecisions: [{role: 'intro', parts: ['赤い犬が', '走る'], reason: '主語句と述語句', required: false},
      {role: 'closure', parts: ['ありがとう', 'さようなら'], reason: '謝辞と別れ', required: false}],
    normalTemplate: {canvas: {width: 1920, height: 1080, fps: 30, safeAreaPx: {left: 4, right: 4, top: 40, bottom: 40}},
      layoutRules: {...clone(PRESENTATION_RENDERER_IMPLEMENTED_LAYOUT_RULES_V001), horizontalSafeMarginRatio: 0},
      element: {kind: 'speech-caption', visualState, presetId: registry.presets[0].presetId,
        appliedPresetId: registry.presets[0].presetId, transition: {entry: {type: 'alpha-fade', frames: 4}, exit: {type: 'alpha-fade', frames: 4}}}}};
}
function measured(prepared) {
  return seal({schemaVersion: 'digest-structure-new-caption-widths-v001', origin: 'synthetic-test',
    preparedSha256: prepared.canonicalSha256, requestsSha256: canonicalSha256(prepared.measurementRequests), refs: [],
    rows: prepared.measurementRequests.map(r => ({key: r.key, fullWidthPx: r.props.text === '赤い犬が走る' || r.props.text === 'ありがとうさようなら' ? 2000 : 1000}))});
}
const build = input => {const prepared = prepareDigestStructureNewCaptionsV001(input); return buildDigestStructureNewCaptionsV001({prepared, measurements: measured(prepared)});};

test('new roles preserve text, zero-frame atoms and exact source clocks through existing 7A partitioning', () => {
  const input = fixture(), before = clone(input), saved = build(input);
  assert.deepEqual(input, before); assert.equal(saved.status, 'synthetic-test-only');
  assert.deepEqual(saved.normalPlan.elements.map(e => e.text), ['赤い犬が', '走る', 'ありがとう', 'さようなら']);
  assert.deepEqual(saved.normalPlan.elements.map(e => [e.startFrame, e.endFrameExclusive]), [[0,30],[30,60],[60,90],[90,120]]);
  assert.equal(saved.sourceAtoms[0].atoms[0].startFrame, saved.sourceAtoms[0].atoms[0].endFrameExclusive);
  assert.deepEqual(saved.normalPlan, saved.resolvedPlan);
  assert.deepEqual(saved.normalPlan.elements.flatMap(e => e.targetProvenance.sourceAtomIds),
    ['7b-intro-source-1','7b-intro-source-2','7b-intro-source-3','7b-closure-source-4','7b-closure-source-5']);
  assert.equal(saved.humanQuality, 'not-evaluated'); assert.equal(saved.rasterClipping, 'not-evaluated');
});

test('fresh-process restore rejects altered source, measurement, plan and unknown/main roles', () => {
  const input = fixture(), saved = build(input);
  assert.deepEqual(restoreDigestStructureNewCaptionsV001({input, saved}), saved);
  const child = spawnSync(process.execPath, ['--input-type=module', '-e',
    `import fs from 'node:fs';import {restoreDigestStructureNewCaptionsV001 as r} from ${JSON.stringify(new URL('./digest-structure-new-captions.mjs', import.meta.url).href)};process.stdout.write(JSON.stringify(r(JSON.parse(fs.readFileSync(0,'utf8')))));`],
    {input: JSON.stringify({input, saved}), encoding: 'utf8', maxBuffer: 4 * 1024 * 1024});
  assert.equal(child.status, 0, child.stderr); assert.deepEqual(JSON.parse(child.stdout), saved);
  for (const mutate of [i=>i.transcript.segments[0].text='青',i=>i.transcript.segments[1].startMs++,
    i=>i.semanticDecisions[0].parts=['違う'],i=>i.segments[0].role='main',i=>i.segments[0].segmentId='wrong',
    i=>i.normalTemplate.element.visualState.textStyle.fontSizePx=96,
    i=>i.baseTimeline.segments[1].outputStartFrame++]) {
    const changed=clone(input);mutate(changed);assert.throws(()=>restoreDigestStructureNewCaptionsV001({input:changed,saved}));
  }
  for (const mutate of [s=>s.normalPlan.elements[0].text='別',s=>s.measurements.rows.pop(),s=>s.resolution.captionMappings.reverse()]) {
    const changed=clone(saved);mutate(changed);assert.throws(()=>restoreDigestStructureNewCaptionsV001({input,saved:changed}));
  }
});

test('optional exact projection adds only connection shift and binds original timeline bytes', () => {
  const input=fixture(), prepared=prepareDigestStructureNewCaptionsV001(input);
  const timelineBytes=Buffer.from(JSON.stringify(input.baseTimeline)+'\n'),planBytes=Buffer.from(JSON.stringify(prepared.normalPlan)+'\n');
  input.projection=createOrchestrationProjectionV001({digestRef:{version:'fixture',sha256:'b'.repeat(64)},
    planRef:{path:'/fixture/plan.json',fileSha256:hash(planBytes)},timelineRef:{path:'/fixture/timeline.json',fileSha256:hash(timelineBytes)},
    mediaRef:{path:'/fixture/base.mp4',fileSha256:'a'.repeat(64)},planBytes,timelineBytes,playbackSampleRate:44100,
    observationSampleRate:16000,connections:[{connectionId:'connection-01',preset:'black-separator',presetVersion:'v001'}]});
  input.baseTimelineBytes=timelineBytes;
  const projected=build(input);
  assert.equal(projected.prepared.clock,'digest-display');
  assert.deepEqual(projected.normalPlan.elements.map(e=>[e.startFrame,e.endFrameExclusive]),[[0,30],[30,60],[72,102],[102,132]]);
  const changed=clone(input);changed.baseTimelineBytes=Buffer.from('{}');
  assert.throws(()=>prepareDigestStructureNewCaptionsV001(changed),/timeline bytes/);
});

test('synthetic widths cannot be written as real measured evidence; missing spans are rejected', async t => {
  const input=fixture(),saved=build(input),root=await mkdtemp('/private/tmp/zev-new-caption-');
  t.after(()=>rm(root,{recursive:true,force:true}));
  await assert.rejects(saveDigestStructureNewCaptionsV001({input,saved,outputPath:root+'/captions.json'}),/synthetic widths/);
  const prepared=prepareDigestStructureNewCaptionsV001(input), measurements=measured(prepared);
  measurements.rows.pop();const {canonicalSha256:_,...body}=measurements;
  assert.throws(()=>buildDigestStructureNewCaptionsV001({prepared,measurements:seal(body)}),/coverage differs/);
});

test('an explicit two-line exception preserves a phrase whose short leading clause cannot form a faded caption', () => {
  const input=fixture(); input.transcript.segments[3].endMs=6100;input.transcript.segments[4].startMs=6100;
  input.semanticDecisions[1].twoLineExceptions=[{text:'ありがとうさようなら',lines:['ありがとう','さようなら'],reason:'先頭句が既存fadeより短いため一つの表示内で意味境界に改行'}];
  const prepared=prepareDigestStructureNewCaptionsV001(input),saved=buildDigestStructureNewCaptionsV001({prepared,measurements:measured(prepared)});
  assert.equal(saved.normalPlan.elements.length,3);
  assert.deepEqual(saved.normalPlan.elements.at(-1).indexedLines.map(l=>l.text),['ありがとう','さようなら']);
  assert.deepEqual([saved.normalPlan.elements.at(-1).startFrame,saved.normalPlan.elements.at(-1).endFrameExclusive],[60,120]);
  assert.deepEqual(restoreDigestStructureNewCaptionsV001({input,saved}),saved);
  const invalid=clone(input);invalid.semanticDecisions[1].twoLineExceptions[0].lines=['ありが','とうさようなら'];
  assert.throws(()=>prepareDigestStructureNewCaptionsV001(invalid),/cuts a source atom/);
  const unbound=clone(input);unbound.semanticDecisions[1].twoLineExceptions[0].lines=['別','文'];unbound.semanticDecisions[1].twoLineExceptions[0].text='別文';
  assert.throws(()=>prepareDigestStructureNewCaptionsV001(unbound),/not a finite semantic span/);
});

test('new NUT media keeps its actual path and identical clock mapping without claiming the old MP4 timeline contract', () => {
  const input=fixture(),baseline=build(input);
  input.baseTimeline.baseMedia.path='/new-output/base.nut';
  assert.equal(mapPresentationSourceIntervalV002(input.baseTimeline,1000,3000).status,'failed');
  const saved=build(input);
  assert.deepEqual(saved.normalPlan.elements,baseline.normalPlan.elements);
  assert.equal(input.baseTimeline.baseMedia.path,'/new-output/base.nut');
  assert.deepEqual(restoreDigestStructureNewCaptionsV001({input,saved}),saved);
  for (const mutate of [
    i=>i.baseTimeline.segments[1].sourceStartMs=2000,
    i=>i.baseTimeline.segments[1].sourceStartFrame30++,
    i=>i.baseTimeline.segments[1].outputStartFrame++,
    i=>i.baseTimeline.segments.reverse(),
    i=>i.baseTimeline.segments.push(clone(i.baseTimeline.segments[0])),
    i=>i.baseTimeline.sourceFrameClock.videoPresentationOffsetMs=1,
    i=>i.baseTimeline.sourceFrameClock.decodedFrameCount=60,
    i=>i.baseTimeline.baseMedia.expectedFrameCount++,
    i=>i.transcript.segments.splice(1,1),
  ]) {const changed=clone(input);mutate(changed);assert.throws(()=>prepareDigestStructureNewCaptionsV001(changed));}
  const shifted=clone(input);shifted.baseTimeline.sourceFrameClock.videoPresentationOffsetMs=100;
  shifted.baseTimeline.sourceFrameClock.videoFirstPts=6;
  shifted.transcript.segments.forEach(s=>{s.startMs+=100;s.endMs+=100;});
  shifted.segments.forEach(s=>{s.sourceStartMs+=100;s.sourceEndMs+=100;});
  shifted.baseTimeline.segments.forEach(s=>{s.sourceStartMs+=100;s.sourceEndMs+=100;});
  const projected=build(shifted);
  assert.deepEqual(projected.normalPlan.elements.map(s=>[s.startFrame,s.endFrameExclusive]),
    saved.normalPlan.elements.map(s=>[s.startFrame,s.endFrameExclusive]));
  assert.equal(projected.sourceAtoms[0].atoms[0].startFrame,projected.sourceAtoms[0].atoms[0].endFrameExclusive);
});
