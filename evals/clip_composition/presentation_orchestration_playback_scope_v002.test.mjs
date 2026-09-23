import assert from 'node:assert/strict';
import test from 'node:test';
import {createHash} from 'node:crypto';
import {AUTO_PRESENTATION_RULES_REF_V008, sha256AutoPresentationV001} from './presentation_auto_effects_v001.mjs';
import {createOrchestrationContextV001, createOrchestrationJudgmentInputV001, fixOrchestrationJudgmentV001,
  resolveOrchestrationDrawingViewV001} from './presentation_orchestration_v001.mjs';
import {createOrchestrationRenderScopeV001} from './presentation_orchestration_render_scope_v001.mjs';

const bytes = value => JSON.stringify(value) + '\n';
const hash = value => createHash('sha256').update(value).digest('hex');
function viewFor(playbackSampleRate) {
  const plan = {schemaVersion:'presentation-output-common-core-plan-v001',canvas:{width:1920,height:1080,fps:30},
    elements:[{instructionId:'caption-test',kind:'speech-caption',text:'固定した通常字幕',
      indexedLines:[{lineIndex:0,text:'固定した通常字幕'}],startFrame:20,endFrameExclusive:70,displayFrameCount:50,
      visualState:{textStyle:{fontSizePx:94,fontColor:'#FFFFFF',borderColor:'#000000',borderWidthPx:8,glowWidthPx:0},
        position:{preset:'bottom-center',alignment:'center',offsetXPercent:0,offsetYPercent:-6},background:null}}]};
  plan.elements.push({...structuredClone(plan.elements[0]),instructionId:'caption-second',startFrame:75,endFrameExclusive:88,displayFrameCount:13});
  const planBytes=bytes(plan), mediaRef={path:'/synthetic/scope-media.mp4',fileSha256:hash('synthetic-media')};
  const planRef={path:'/synthetic/scope-plan.json',fileSha256:hash(planBytes)};
  const timelineBytes=bytes({schemaVersion:'presentation-base-media-timeline-v003',
    baseMedia:{frameRate:'30/1',expectedFrameCount:90,fileSha256:mediaRef.fileSha256},
    segments:[{segmentId:'one',outputStartFrame:0,outputEndFrame:72,sourceStartFrame30:120,sourceEndFrame30:192},
      {segmentId:'two',outputStartFrame:72,outputEndFrame:90,sourceStartFrame30:240,sourceEndFrame30:258}]});
  const decisionInputBytes=bytes({schemaVersion:'presentation-focus-decision-input-v005',pulseTimingEvidence:null});
  const context=createOrchestrationContextV001({digestRef:{version:'synthetic-clock',sha256:hash('synthetic-digest')},
    planRef,mediaRef,timelineRef:{path:'/synthetic/scope-timeline.json',fileSha256:hash(timelineBytes)},
    planBytes,timelineBytes,playbackSampleRate,observationSampleRate:16000,decisionInputBytes,
    captionContext:{baselineRef:{...planRef,canonicalSha256:sha256AutoPresentationV001(plan)},
      decisionInputRef:{path:'/synthetic/scope-decision.json',fileSha256:hash(decisionInputBytes)},
      renderingRulesRef:structuredClone(AUTO_PRESENTATION_RULES_REF_V008),pulseTimingEvidence:null}});
  const input=createOrchestrationJudgmentInputV001({context,evidence:{productionPurpose:'再生時計の有限2条件を区別する機械検査',
    captions:plan.elements.map(row=>({captionId:row.instructionId,text:row.text,contextId:'context-test',startFrame:row.startFrame,endFrameExclusive:row.endFrameExclusive,eligiblePulsePeakIds:[]})),
    contexts:[{contextId:'context-test',description:'合成の時計検査'}],observations:[],audioEvidence:null,audioCandidates:[]}});
  const state=fixOrchestrationJudgmentV001({context,input,replyBytes:bytes({schemaVersion:'presentation-orchestration-judgment-v002',
    inputSha256:input.inputSha256,completion:'complete',captions:plan.elements.map(row=>({captionId:row.instructionId,status:'resolved',semanticRole:'normal',
      allowedPresets:[{preset:'normal'}],reason:'合成検査の通常表示',evidenceIds:[row.instructionId]})),
    connections:context.connectionIds.map(connectionId=>({connectionId,status:'resolved',semanticRole:'continuation',allowedPresets:['normal-cut'],reason:'元の通常接続を保持',evidenceIds:[connectionId]}))})});
  return resolveOrchestrationDrawingViewV001({context,state});
}

for (const [rate, expectedStart, expectedEnd] of [[44100,44100,66150],[48000,48000,72000]]) {
  test(`範囲描画は媒体の${rate}Hzを維持し、字幕の元時計を動かさない`,()=>{
    const view=viewFor(rate), before=bytes(view.resolvedPlan);
    const scoped=createOrchestrationRenderScopeV001(view,{startFrame:30,endFrameExclusive:45});
    assert.equal(scoped.scope.playbackStartSample,expectedStart);
    assert.equal(scoped.scope.playbackEndSampleExclusive,expectedEnd);
    assert.equal(scoped.scope.playbackEndSampleExclusive-scoped.scope.playbackStartSample,rate/2);
    assert.deepEqual([scoped.resolvedPlan.elements[0].startFrame,scoped.resolvedPlan.elements[0].endFrameExclusive],[20,70]);
    assert.equal(scoped.resolvedPlan.elements[0].visualState.textStyle.fontSizePx,94);
    assert.equal(bytes(view.resolvedPlan),before);
    const full=createOrchestrationRenderScopeV001(view);
    assert.equal(full.scope.playbackStartSample,0); assert.equal(full.scope.playbackEndSampleExclusive,rate*3);
  });
}
test('未対応の再生時計を既存値へ黙って変更しない',()=>assert.throws(()=>viewFor(32000),/44100 or 48000/));
