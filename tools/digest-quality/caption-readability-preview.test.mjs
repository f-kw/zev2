import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdtemp,mkdir,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {READABILITY_PREVIEW_V001,makeReadabilityPreviewPlanV001,
  verifyReadabilityPreviewStateV001,verifyReadabilityPreviewRastersV001} from './caption-readability-preview.mjs';
import {buildCaptionReadabilityPlanV001,captionReadabilityPlanSha256V001,
  captionReadabilityMeasurementContextSha256V001} from './caption-readability-plan.mjs';
import {indexExplicitLinesV001,PRESENTATION_RENDERER_CHARACTER_WIDTH_RULE_V001}
  from '../../evals/clip_composition/presentation_renderer_text_layout_v001.mjs';
import {buildPresentationPulseStateElementsV001} from '../../evals/clip_composition/presentation_pulse_v001.mjs';
import {buildPresentationCaptionMotionStateElementsV001} from '../../evals/clip_composition/presentation_caption_motion_v001.mjs';

const clone=structuredClone;
const sha=b=>createHash('sha256').update(b).digest('hex');
function fixture() {
  const original={schemaVersion:'saved-final',canvas:{width:1920,height:1080,fps:30,safeAreaPx:{left:80,right:80,top:40,bottom:40}},
    layoutRules:{characterWidthRule:PRESENTATION_RENDERER_CHARACTER_WIDTH_RULE_V001,horizontalSafeMarginRatio:0.04},
    elements:[{instructionId:'caption-000053',kind:'speech-caption',text:'赤い犬が走る',
      indexedLines:indexExplicitLinesV001(['赤い犬が走る']).indexedLines,
      startFrame:10,endFrameExclusive:100,displayFrameCount:90,targetProvenance:{sourceAtomIds:['a','b']},
      transition:{entry:{frames:4},exit:{frames:4}},
      visualState:{textStyle:{fontSizePx:96,fontAssetId:'line-seed-jp-extra-bold-v001'},layout:{maxLines:2},
        position:{preset:'bottom-center',alignment:'center',offsetXPercent:0,offsetYPercent:-6}}}]};
  const atoms=[{atomId:'a',text:'赤い犬が',startFrame:10,endFrameExclusive:50,
    sourceSpans:[{sourceStartMs:1000,sourceEndMs:2000,timelineSegmentId:'segment'}]},
  {atomId:'b',text:'走る',startFrame:50,endFrameExclusive:100,
    sourceSpans:[{sourceStartMs:2000,sourceEndMs:4000,timelineSegmentId:'segment'}]}];
  const source={sourceBindings:{projectionSha256:'clock-sha'},captions:[{captionId:'caption-000053',atoms}]};
  const normalPlan=makeReadabilityPreviewPlanV001(original);normalPlan.schemaVersion='presentation-output-common-core-plan-v001';
  Object.assign(normalPlan.elements[0],{sourceStartMs:1000,sourceEndMs:4000,timelineSegmentId:'segment'});
  const evidence={schemaVersion:'caption-readability-evidence-v001',sourcePlanSha256:captionReadabilityPlanSha256V001(normalPlan),
    clockId:'clock-sha',maxWidthPx:1912,captions:[{captionId:'caption-000053',
      measurementContextSha256:captionReadabilityMeasurementContextSha256V001(normalPlan,'caption-000053'),
      atoms:atoms.map(({sourceSpans,...a})=>({...a,...sourceSpans[0]})),boundaries:[],
      measurements:[{startAtomIndex:0,endAtomIndexExclusive:2,singleLineWidthPx:900,twoLine:null}],effect:{kind:'normal'}}]};
  const resolution=buildCaptionReadabilityPlanV001({normalPlan,evidence});
  return {original,source,profile:clone(READABILITY_PREVIEW_V001),normalPlan,evidence,resolution,
    prepared:{profile:clone(READABILITY_PREVIEW_V001),clockId:'clock-sha',summary:clone(resolution.summary),
      status:'layout-preflight-passed-raster-and-human-not-yet-checked'},plan:clone(resolution.normalPlan)};
}
test('saved preview is restored without changing inputs or requiring a new artifact field',()=>{
  const input=fixture(),snapshot=clone(input);
  assert.deepEqual(verifyReadabilityPreviewStateV001(input).plan,input.plan);
  assert.deepEqual(input,snapshot);
});
for(const [name,change,match] of [
  ['candidate plan changed',x=>x.plan.elements[0].visualState.textStyle.fontSizePx++,/candidate plan/],
  ['unsplit plan changed',x=>x.normalPlan.elements[0].text+='変更',/unsplit plan/],
  ['atom clock changed',x=>x.evidence.captions[0].atoms[0].endFrameExclusive--,/source atoms/],
  ['source atom changed',x=>x.source.captions[0].atoms[0].text='違う',/source atoms/],
  ['preview profile changed',x=>x.profile.normalFontSizePx=96,/profile/],
  ['resolution changed',x=>x.resolution= {...x.resolution,summary:{...x.resolution.summary,splitParents:9}},/saved readability/],
])test(name+' is rejected before rendering',()=>{
  const input=clone(fixture());change(input);assert.throws(()=>verifyReadabilityPreviewStateV001(input),match);
});

async function rasterFixture(t) {
  const output=await mkdtemp(path.join(tmpdir(),'zev-readability-reread-'));
  t.after(()=>rm(output,{recursive:true,force:true}));await mkdir(path.join(output,'raster'));
  const plan=fixture().plan;
  const normal=plan.elements[0];
  const color={...clone(normal),instructionId:'caption-000137',presentationColorRange:{startCodePoint:0,endCodePointExclusive:2,fontColor:'#FFD65A'}};
  const motion={...clone(normal),instructionId:'caption-000095',presentationMotion:{presentation:'provisional-bounce',presetVersion:'presentation-caption-motion-readability-v001'}};
  plan.elements.push(color,motion);
  const registry={fontAssets:[{fontAssetId:'line-seed-jp-extra-bold-v001',fileName:'LINESeedJP_A_OTF_Eb.otf'}]};
  const records=[],checks=[];
  const write=async(element,label)=>{
    const pngPath=path.join(output,'raster',label+'.png'),bytes=Buffer.from('test raster '+label);
    await writeFile(pngPath,bytes);
    const props={schemaVersion:'presentation-renderer-overlay-props-v001',canvas:plan.canvas,
      instructionId:element.instructionId,text:element.text,indexedLines:element.indexedLines,
      ...(element.presentationColorRange?{presentationColorRange:element.presentationColorRange}:{}),
      visualState:element.visualState,layoutRules:plan.layoutRules,fontFamilyName:'zev-renderer-line-seed-jp-extra-bold-v001',
      fontFileName:'LINESeedJP_A_OTF_Eb.otf',inspectionLineIndex:null};
    const alphaBounds={left:100,right:1000,top:800,bottom:1000};
    checks.push({label,captionId:element.instructionId,props,alphaBounds,sha256:sha(bytes)});
    return {element,pngPath,sha256:sha(bytes),inspection:{alphaBounds}};
  };
  for(const [i,e] of plan.elements.entries()) {
    if(e.presentationMotion){const states=[];
      for(const s of buildPresentationCaptionMotionStateElementsV001({element:e,canvas:plan.canvas}))states.push({state:s.state,...await write(s.element,`${i}-${s.state}`)});
      records.push({element:e,pngPath:states[0].pngPath,motionStates:states});
    }else records.push(await write(e,String(i)));
  }
  const pulse=clone(normal);Object.assign(pulse,{instructionId:'7a-synthetic-pulse',startFrame:0,endFrameExclusive:90,displayFrameCount:90,
    presentationPulse:{presentation:'provisional-pulse',presetVersion:'presentation-pulse-readability-v001',anchorPeakId:'synthetic',anchorFrame:30}});
  for(const s of buildPresentationPulseStateElementsV001({element:pulse,canvas:plan.canvas}))await write(s.element,'synthetic-pulse-'+s.state);
  const cyan=clone(color);cyan.presentationColorRange.fontColor='#87CEFA';await write(cyan,'comparison-only-cyan');
  await writeFile(path.join(output,'raster','independent-repeat.png'),Buffer.from('test raster 0'));
  return {output,plan,registry,records,verification:{status:'passed',representatives:['000053','000137','000095'],checks},
    resolution:{captionMappings:plan.elements.map(e=>({parentCaptionId:e.instructionId,children:[{captionId:e.instructionId}]}))}};
}
test('raster reread checks every finite state and rejects replaced PNG bytes',async t=>{
  const input=await rasterFixture(t);
  assert.equal((await verifyReadabilityPreviewRastersV001(input)).status,'passed');
  await writeFile(input.records[2].motionStates[3].pngPath,'different bytes');
  await assert.rejects(()=>verifyReadabilityPreviewRastersV001(input),/PNG bytes changed/);
});
test('raster metadata cannot detach from the restored caption or lose a motion state',async t=>{
  const input=await rasterFixture(t),altered=clone(input);
  altered.records[0].element=clone(altered.records[0].element);altered.records[0].element.text='変更';
  await assert.rejects(()=>verifyReadabilityPreviewRastersV001(altered),/raster caption differs/);
  const missing=clone(input);missing.records[2].motionStates.pop();
  await assert.rejects(()=>verifyReadabilityPreviewRastersV001(missing),/state coverage/);
});
