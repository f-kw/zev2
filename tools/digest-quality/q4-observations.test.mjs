import test from 'node:test';
import assert from 'node:assert/strict';
import {buildQ4ObservationUnits,summarizeQ4CaptionPlacement,observeQ4Candidates} from './q4-observations.mjs';
import {measurePcmIntervals} from './measure-pcm.mjs';

const range=(startFrame,endFrameExclusive)=>({startFrame,endFrameExclusive});
const box=(left,top,right,bottom)=>({left,top,right,bottom});
function fixture() {
  const caption=(id,start,end,role='Normal',lines=1)=>({captionId:id,text:'保存字幕'+id,range:range(start,end),lineCount:lines,
    background:role==='Panel accent'?'graph-paper':null,selection:{role},segmentId:'s2'});
  const captions=[caption('previous',103,110),caption('target',114,120,'Panel accent',2),caption('following',125,133)];
  const segments=[{segmentId:'s1',sourceStartFrame30:1000,sourceEndFrame30:1100,outputStartFrame:0,outputEndFrame:100},
    {segmentId:'s2',sourceStartFrame30:3000,sourceEndFrame30:3100,outputStartFrame:100,outputEndFrame:200}];
  const timeline={sourceRef:'saved-source',baseMedia:{expectedFrameCount:200},sourceFrameClock:{inputFrameRate:'60/1',
    logicalFrameRate:'30/1',extractionRuleId:'source-frame-60fps-global-even-v001'},segments};
  const originalClock={schemaVersion:'q4-c-all-original-clock-v001',fps:30,frameCount:200,playbackSampleRate:48000,
    observationSampleRate:16000,playbackSampleCount:320000,connectionPolicy:'preserve-normal-cut',insertedFrameCount:0,
    spans:segments.map(s=>({...s,audioSamples:{sourceStart:s.sourceStartFrame30*1600,sourceEnd:s.sourceEndFrame30*1600,
      outputStart:s.outputStartFrame*1600,outputEnd:s.outputEndFrame*1600}}))};
  return {candidate:{id:'Q4-C002',target:captions[1],range:range(100,135),includedCaptions:structuredClone(captions)},captions,timeline,originalClock};
}

test('short-clock partition includes every caption-free interval and maps exact saved 48kHz and even native frames',()=>{
  const value=fixture(),units=buildQ4ObservationUnits(value);
  assert.deepEqual(units.map(u=>u.kind),['no-caption','caption','no-caption','caption','no-caption','caption','no-caption']);
  assert.deepEqual(units.map(u=>u.range),[range(0,3),range(3,10),range(10,14),range(14,20),range(20,25),range(25,33),range(33,35)]);
  const target=units.find(u=>u.isTarget);
  assert.equal(target.caption.text,'保存字幕target');assert.deepEqual(target.digestRange,range(114,120));
  assert.deepEqual(target.localAudio,{sampleRate:48000,startSample:22400,endSampleExclusive:32000});
  assert.deepEqual(target.originalSource.logical30fps,range(3014,3020));
  assert.deepEqual(target.originalSource.native60fps,{firstFrameIndex:6028,frameIndexStep:2,lastFrameIndex:6038,endBoundaryFrameIndex:6040});
  assert.deepEqual(target.originalSource.audio,{sampleRate:48000,startSample:4822400,endSampleExclusive:4832000});
  assert.deepEqual(units[0].savedObservationAudio.startSample,{numerator:160000,denominator:3});
});

test('48kHz stereo measures the whole six-frame target and every gap independently, without downmixing or a quality threshold',()=>{
  const units=buildQ4ObservationUnits(fixture()),pcm=Buffer.alloc((35*1600+512)*2*4);
  for(let i=0;i<35*1600;i++){pcm.writeFloatLE(0.25,i*8);pcm.writeFloatLE(-0.5,i*8+4);}
  // Decoder tail is deliberately large and must not enter any display interval.
  for(let i=35*1600;i<35*1600+512;i++){pcm.writeFloatLE(8,i*8);pcm.writeFloatLE(-8,i*8+4);}
  const result=measurePcmIntervals(pcm,{channels:2,sampleRate:48000,fpsNum:30,fpsDen:1,units});
  assert.equal(result.decodedSampleCount,56512);assert.equal(result.intervals.length,7);
  const target=result.intervals.find(u=>u.unitId==='target');assert.equal(target.sampleCount,9600);
  assert.equal(target.channelMetrics[0].rootMeanSquare,0.25);assert.equal(target.channelMetrics[1].rootMeanSquare,0.5);
  assert(result.intervals.every(u=>u.channelMetrics.every(c=>c.fullScaleOrAboveSamples===0)));
  assert.equal(result.intervals.reduce((n,u)=>n+u.sampleCount,0),56000);
  assert.equal(result.intervals.at(-1).channelMetrics[0].followingSample,8,'saved boundary sample is decoder tail, not part of the interval aggregates');
});

test('wrong audio clock, timeline mapping, missing neighbor or overlapping caption fails instead of guessing',()=>{
  for(const change of [v=>v.originalClock.playbackSampleRate=44100,
    v=>v.originalClock.spans[1].audioSamples.sourceStart++,v=>v.timeline.sourceFrameClock.inputFrameRate='30/1',
    v=>v.candidate.includedCaptions.pop(),v=>v.captions[1].range.startFrame=109]) {
    const value=fixture();change(value);assert.throws(()=>buildQ4ObservationUnits(value));
  }
});

function placementFixture() {
  const {candidate}=fixture();
  const inspections=candidate.includedCaptions.map(c=>({instructionId:c.captionId,lineAlphaBounds:c.lineCount===1
    ?[box(80,810,220,830)]:[box(90,810,210,830),box(80,840,220,860)],
    alphaBounds:box(70,800,230,870),lineRects:[box(80,800,220,830)],representativeFrame:c.range.startFrame,
    overlayFile:'overlays/'+c.captionId+'.png',overlaySha256:c.captionId+'-png',
    appliedOverlayPropsCanonicalSha256:c.captionId+'-props',visibilityComparisonBasis:'saved-common-qc'}));
  const sceneBindings=inspections.map(i=>({instructionId:i.instructionId,selectedKind:i.instructionId==='target'?'panel':'normal',
    states:[{pngSha256:i.overlaySha256,propsCanonicalSha256:i.appliedOverlayPropsCanonicalSha256,alphaBounds:i.alphaBounds}],
    alternates:i.instructionId==='target'?[{kind:'panel-plate-omitted',alphaBounds:box(80,810,220,860),pngSha256:'text-only-png'}]:[]}));
  return {candidate,done:{expectedFrameCount:35,finalQc:{status:'passed'},
    completedFrameQc:{status:'passed',inspections,evidence:{finiteState:{sceneBindings}}}}};
}

test('two-line Panel placement uses saved visible ink and plate-omitted evidence, not logical line-width estimates',()=>{
  const result=summarizeQ4CaptionPlacement(placementFixture()),panel=result[1];
  assert.deepEqual(panel.panel.visibleLineHorizontalCenterOffsetsPx,[0,0]);
  assert.equal(panel.panel.visibleTextUnionVerticalCenterOffsetPx,0);
  assert.deepEqual(panel.panel.visibleTextMarginsPx,{left:10,right:10,top:10,bottom:10});
  assert.equal(panel.representativeLocalFrame,14);assert.equal(result[0].panel,null);
  assert.equal(panel.background,'graph-paper');assert.equal(panel.panel.savedPlateOmittedTextBoundsMatch,true);
});

test('placement refuses changed native PNG, wrong plate-omitted text or missing common QC inspection',()=>{
  for(const change of [v=>v.done.completedFrameQc.evidence.finiteState.sceneBindings[1].states[0].pngSha256='other',
    v=>v.done.completedFrameQc.evidence.finiteState.sceneBindings[1].alternates[0].alphaBounds.left++,
    v=>v.done.completedFrameQc.inspections.pop(),v=>v.done.completedFrameQc.status='failed']) {
    const value=placementFixture();change(value);assert.throws(()=>summarizeQ4CaptionPlacement(value));
  }
});

test('observation cannot create output outside the Q4 generated area',async()=>{
  await assert.rejects(observeQ4Candidates({candidateDirectory:'/private/tmp/not-a-Q4-candidate',
    outputDirectory:'/private/tmp/must-not-be-created',originalClockPath:'/must-not-be-read'}),/Q4 managed directory/);
});
