import test from 'node:test';
import assert from 'node:assert/strict';
import {selectQ4Ranges,assertQ4CandidateCompletion} from './q4-candidates.mjs';

function input() {
  const elements=Array.from({length:325},(_,i)=>({instructionId:`c${i}`,kind:'speech-caption',text:`字幕${i}`,
    startFrame:i*100,endFrameExclusive:i*100+60,indexedLines:[{logicalWidth:10}]}));
  return {normalPlan:{elements},timeline:{segments:[{segmentId:'a',outputStartFrame:0,outputEndFrame:10000},
    {segmentId:'b',outputStartFrame:10000,outputEndFrame:44408}]},
    selectionRecord:{captions:elements.map(e=>({captionId:e.instructionId,status:'resolved'}))},
    view:{viewSha256:'test-only-view',projection:{displayFrameCount:44408,sourceClock:{playbackSampleRate:48000}},
      resolution:{connections:[{preset:'normal-cut'}]},
      effectiveSelections:elements.map(e=>({captionId:e.instructionId,selection:{role:'Normal'},hasOverride:false}))}};
}
function panel(value,index,width,lines=1,presentation='provisional-panel') {
  value.normalPlan.elements[index].indexedLines=Array.from({length:lines},()=>({logicalWidth:width}));
  value.view.effectiveSelections[index].selection={role:'Panel accent',presentation};
}

test('short ranges retain the original clock, stop context at segment edges, and do not enforce background coverage',()=>{
  const value=input();panel(value,0,2);panel(value,99,35);panel(value,200,34,2);
  const result=selectQ4Ranges(value);
  assert.equal(result.candidates.length,3);
  assert.deepEqual(result.candidates.map(c=>c.range),[
    {startFrame:0,endFrameExclusive:160},{startFrame:9800,endFrameExclusive:9960},{startFrame:19900,endFrameExclusive:20160}]);
  assert.deepEqual(result.backgroundsWithinSelectedRanges,['plain']);
  assert.deepEqual(result.automaticPanelBackgroundCounts,{'plain':3,'graph-paper':0,'comic-frame':0});
  assert.equal(result.manualPresentationOverrides,false);
  assert.deepEqual(result.candidates[1].includedCaptions.map(c=>c.captionId),['c98','c99']);
});

test('unsupported fallback is not counted as semantically Normal, and missing multiline cases stay absent',()=>{
  const value=input();panel(value,100,20);
  value.selectionRecord.captions.forEach(row=>row.status='unrepresentable');
  value.selectionRecord.captions[100].status='resolved';value.selectionRecord.captions[10].status='resolved';
  const result=selectQ4Ranges(value);
  assert.equal(result.candidates.length,2);
  assert.equal(result.candidates.find(c=>c.conditions.includes('normal-control')).target.captionId,'c10');
  assert.deepEqual(result.conditionsAbsent.map(c=>c.condition),['multi-line-panel']);
  assert.deepEqual(result.candidates.find(c=>c.target.captionId==='c100').conditions,['short-single-line-panel','wide-single-line-panel']);
});

test('ties use original order; changed connections, clocks and manual overrides cannot enter automatic selection',()=>{
  const value=input();panel(value,2,10);panel(value,3,10);panel(value,5,20,2);panel(value,6,20,2);
  const result=selectQ4Ranges(value);
  assert.deepEqual(result.candidates.map(c=>c.target.captionId),['c2','c5']);
  const manual=structuredClone(value);manual.view.effectiveSelections[2].hasOverride=true;
  assert.throws(()=>selectQ4Ranges(manual),/unchanged automatic result/);
  const otherClock=structuredClone(value);otherClock.view.projection.sourceClock.playbackSampleRate=44100;
  assert.throws(()=>selectQ4Ranges(otherClock));
  const otherCut=structuredClone(value);otherCut.view.resolution.connections[0].preset='soft-separator';
  assert.throws(()=>selectQ4Ranges(otherCut));
});

test('review rejects another drawing implementation, clock or unfinished frame inspection even with the same view and range',()=>{
  const candidate={range:{startFrame:200,endFrameExclusive:260}},drawingRulesRef={canonicalSha256:'fixed-rules'};
  const view={viewSha256:'saved-view',fourSavedSha256:{captionAuto:'saved-auto'},projection:{projectionSha256:'saved-clock'}};
  const done={schemaVersion:'presentation-edited-render-completion-v001',status:'passed',viewSha256:view.viewSha256,
    range:candidate.range,drawingRulesRef,fourSavedSha256:view.fourSavedSha256,projectionSha256:view.projection.projectionSha256,
    expectedFrameCount:60,outputMedia:{video:{frameCount:60}},finalQc:{status:'passed'},completedFrameQc:{status:'passed'},
    finalAudioClock:{status:'passed',sampleRate:48000,logicalDecodedSampleCount:96000},
    scope:{playbackStartSample:320000,playbackEndSampleExclusive:416000}};
  assertQ4CandidateCompletion({done,candidate,view,drawingRulesRef});
  for(const change of [d=>d.drawingRulesRef={canonicalSha256:'other-rules'},d=>d.finalAudioClock.sampleRate=44100,
    d=>d.scope.playbackStartSample=0,d=>d.completedFrameQc.status='failed',d=>d.expectedFrameCount=59]) {
    const changed=structuredClone(done);change(changed);
    assert.throws(()=>assertQ4CandidateCompletion({done:changed,candidate,view,drawingRulesRef}));
  }
});
