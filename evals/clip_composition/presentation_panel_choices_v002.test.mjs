import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdtemp, readFile, writeFile, rm, access} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {PRESENTATION_PANEL_PRESETS_V002, PRESENTATION_PANEL_ASSETS_V002,
  getPresentationPanelPresetV002, isPresentationPanelBackgroundV002,
  getPresentationPanelAssetV002, omitPresentationPanelPlateForInspectionV002} from './presentation_panel_presets_v002.mjs';
import {AUTO_PRESENTATION_RULES_REF_V008, sha256AutoPresentationV001,
  createAutoPresentationOverridesV001, editAutoPresentationOverrideV001,
  resolveAutoPresentationV001} from './presentation_auto_effects_v001.mjs';
import {loadAutoPresentationContextV001, loadAutoPresentationV001,
  saveFixedAutoPresentationV001, saveAutoPresentationOverridesV001} from './presentation_auto_effects_io_v001.mjs';
import {orchestrationCaptionChoiceToSelectionV001, createOrchestrationContextV001,
  createOrchestrationJudgmentInputV001, fixOrchestrationJudgmentV001,
  editOrchestrationOverrideV001, resolveOrchestrationDrawingViewV001}
  from './presentation_orchestration_v001.mjs';
import {editingTargetListV001, editingTargetDetailsV001} from './presentation_editing_state_v001.mjs';
import {inspectAutoPresentationCaptionsV001, formatAutoPresentationCaptionRowsV001}
  from './edit_auto_presentation_v001.mjs';

// Synthetic storage/model fixtures only. No browser, native drawing or human-quality claims.
const hash = value => createHash('sha256').update(value).digest('hex');
const bytes = value => JSON.stringify(value, null, 2) + '\n';
const clone = value => structuredClone(value);
const variants = [['panel', 'plain'], ['panel-graph-paper', 'graph-paper'], ['panel-comic-frame', 'comic-frame']];
const planFixture = () => ({schemaVersion:'presentation-output-common-core-plan-v001',
  canvas:{width:1920,height:1080,fps:30,safeAreaPx:{top:40,right:80,bottom:40,left:80}},
  provenance:{purpose:'synthetic-panel-storage-test'},
  elements:['短文','横長の字幕を固定した例','複数行の\n字幕例'].map((text,index)=>({
    instructionId:`caption-${index+1}`,kind:'speech-caption',text,
    indexedLines:text.split('\n').map((line,lineIndex)=>({lineIndex,text:line})),
    startFrame:index*120,endFrameExclusive:index*120+90,displayFrameCount:90,
    sourceMapping:{sourceSegment:index},visualState:{
      textStyle:{fontSizePx:96,fontColor:'#FFFFFF',borderColor:'#000000',borderWidthPx:3,glowWidthPx:0},
      position:{preset:'bottom-center',alignment:'center',offsetXPercent:0,offsetYPercent:0},
      background:{color:'#00000000'},animation:{preset:'fixed-test-fade',durationFrames:4},
    },
  }))});
async function storageFixture(automaticPreset='panel') {
  const directory=await mkdtemp(path.join(tmpdir(),'zev-panel-choices-test-'));
  const baselinePath=path.join(directory,'normal.json'),decisionInputPath=path.join(directory,'decision.json'),autoProposalPath=path.join(directory,'auto.json');
  await writeFile(baselinePath,bytes(planFixture()));
  await writeFile(decisionInputPath,bytes({schemaVersion:'presentation-focus-decision-input-v005',pulseTimingEvidence:null}));
  const loaded=await loadAutoPresentationContextV001({baselinePath,decisionInputPath});
  const proposal={schemaVersion:'auto-presentation-proposal-v001',context:clone(loaded.context),
    targetCaptionIds:loaded.baselinePlan.elements.map(row=>row.instructionId),completion:'complete',
    effects:[{captionId:'caption-2',...orchestrationCaptionChoiceToSelectionV001({preset:automaticPreset})}],exceptions:[]};
  const autoProposal=await saveFixedAutoPresentationV001({baselinePath,decisionInputPath,proposal,outputPath:autoProposalPath});
  return {directory,baselinePath,decisionInputPath,autoProposalPath,autoProposal,...loaded};
}
const resolved=loaded=>resolveAutoPresentationV001({baselinePlan:loaded.baselinePlan,...loaded.autoPresentation});
function assertContentUnchanged(before,after) {
  assert.equal(after.text,before.text);assert.deepEqual(after.indexedLines,before.indexedLines);
  for(const key of ['startFrame','endFrameExclusive','displayFrameCount','sourceMapping'])assert.deepEqual(after[key],before[key]);
  assert.deepEqual(after.visualState.position,before.visualState.position);assert.deepEqual(after.visualState.animation,before.visualState.animation);
  assert.equal(after.visualState.textStyle.fontSizePx,before.visualState.textStyle.fontSizePx);
}

test('Panel has exactly three immutable choices with distinct local artwork and shared text/padding',()=>{
  const presets=variants.map(([preset])=>getPresentationPanelPresetV002(orchestrationCaptionChoiceToSelectionV001({preset}).presentation));
  assert.equal(Object.keys(PRESENTATION_PANEL_PRESETS_V002).length,3);
  assert.equal(Object.keys(PRESENTATION_PANEL_ASSETS_V002).length,2);
  for(const preset of presets){assert.ok(Object.isFrozen(preset));assert.deepEqual(preset.textStyle,presets[0].textStyle);
    assert.deepEqual({...preset.background,panelPresetId:null},{...presets[0].background,panelPresetId:null});
    assert.ok(isPresentationPanelBackgroundV002(preset.background));}
  assert.equal(getPresentationPanelAssetV002(presets[0].background),null);
  const assets=presets.slice(1).map(preset=>getPresentationPanelAssetV002(preset.background));
  assert.notEqual(assets[0].assetId,assets[1].assetId);assert.notEqual(assets[0].svg,assets[1].svg);
  assert.equal(assets[0].sizing,'tile');assert.equal(assets[1].sizing,'stretch');
  for(const asset of assets){assert.match(asset.origin,/Original SVG authored locally/);assert.match(asset.dataUrl,/^data:image\/svg\+xml/);
    assert.equal(decodeURIComponent(asset.dataUrl.split(',')[1]),asset.svg);
    assert.doesNotMatch(asset.svg,/<script|<image|href=|url\(/i);}
});
test('finite background rejects arbitrary paths, drawing fields, unknown IDs and changed geometry',()=>{
  for(const [preset] of variants){
    const choice=orchestrationCaptionChoiceToSelectionV001({preset}),background=getPresentationPanelPresetV002(choice.presentation).background;
    for(const invalid of [{...background,path:'/arbitrary/image.png'},{...background,panelPresetId:'other'},
      {...background,paddingXPx:25},{...background,color:'#FF0000'},{...background,backgroundImage:'https://example.com/a.png'}])
      assert.throws(()=>isPresentationPanelBackgroundV002(invalid),/finite managed preset/);
    assert.throws(()=>orchestrationCaptionChoiceToSelectionV001({preset,path:'/arbitrary/image.png'}),/fields/);
  }
  assert.throws(()=>orchestrationCaptionChoiceToSelectionV001({preset:'panel-other'}),/unknown/);
  assert.throws(()=>getPresentationPanelPresetV002('__proto__'),/unknown/);
});
test('inspection-only plate omission retains Panel geometry without asset paint and cannot enter saved choices',()=>{
  for(const [preset] of variants){
    const selection=orchestrationCaptionChoiceToSelectionV001({preset});
    const original=getPresentationPanelPresetV002(selection.presentation).background;
    const omitted=omitPresentationPanelPlateForInspectionV002(original);
    assert.ok(isPresentationPanelBackgroundV002(omitted));assert.equal(getPresentationPanelAssetV002(omitted),null);
    assert.equal(omitted.color,'transparent');assert.equal(omitted.inspectionPlateOmitted,true);
    const {color,inspectionPlateOmitted,...geometry}=omitted;
    assert.deepEqual(geometry,Object.fromEntries(Object.entries(original).filter(([key])=>key!=='color')));
    assert.throws(()=>isPresentationPanelBackgroundV002({...original,color:'transparent'}),/finite managed/);
    assert.throws(()=>isPresentationPanelBackgroundV002({...original,inspectionPlateOmitted:true}),/finite managed/);
    assert.throws(()=>orchestrationCaptionChoiceToSelectionV001({preset,inspectionPlateOmitted:true}),/fields/);
  }
});
test('three backgrounds persist and reload through production IO; Normal fixes and Reset restores exact automatic Panel',async()=>{
  for(const [automaticPreset,automaticId] of variants){
    const fixture=await storageFixture(automaticPreset);
    try{
      const automaticBytes=await readFile(fixture.autoProposalPath,'utf8');
      const base={baselinePlan:fixture.baselinePlan,context:fixture.context,autoProposal:fixture.autoProposal};
      let overrides=createAutoPresentationOverridesV001(base),serial=0;
      const saveReload=async value=>{
        const overridesPath=path.join(fixture.directory,`override-${++serial}.json`);
        await saveAutoPresentationOverridesV001({...fixture,overrides:value,outputPath:overridesPath});
        return loadAutoPresentationV001({...fixture,overridesPath});
      };
      for(const [preset,id] of variants){
        overrides=editAutoPresentationOverrideV001({...base,overrides,captionId:'caption-2',selection:orchestrationCaptionChoiceToSelectionV001({preset})});
        const loaded=await saveReload(overrides),view=resolved(loaded),target=view.plan.elements[1];
        assert.equal(target.visualState.background.panelPresetId,id);assertContentUnchanged(fixture.baselinePlan.elements[1],target);
        assert.deepEqual(view.plan.elements.filter(row=>row.instructionId!=='caption-2'),fixture.baselinePlan.elements.filter(row=>row.instructionId!=='caption-2'));
        overrides=loaded.autoPresentation.overrides;
      }
      overrides=editAutoPresentationOverrideV001({...base,overrides,captionId:'caption-2',selection:'Normal'});
      const normal=await saveReload(overrides);assert.deepEqual(resolved(normal).plan,fixture.baselinePlan);
      assert.equal(normal.autoPresentation.overrides.entries[0].role,'Normal');
      overrides=editAutoPresentationOverrideV001({...base,overrides:normal.autoPresentation.overrides,captionId:'caption-2',selection:'Reset'});
      const reset=await saveReload(overrides);assert.equal(reset.autoPresentation.overrides.entries.length,0);
      assert.equal(resolved(reset).plan.elements[1].visualState.background.panelPresetId,automaticId);
      assert.equal(await readFile(fixture.autoProposalPath,'utf8'),automaticBytes);
    }finally{await rm(fixture.directory,{recursive:true,force:true});}
  }
});
test('unchanged source with old rendering rule binding is rejected on read and before save',async()=>{
  const fixture=await storageFixture('panel-graph-paper');
  try{
    const base={baselinePlan:fixture.baselinePlan,context:fixture.context,autoProposal:fixture.autoProposal};
    const overrides=createAutoPresentationOverridesV001(base);
    const stale=clone(overrides);stale.context.renderingRulesRef={version:'auto-presentation-rules-v007',contentSha256:hash('test-only-old-rules')};
    const outputPath=path.join(fixture.directory,'must-not-save.json');
    await assert.rejects(saveAutoPresentationOverridesV001({...fixture,overrides:stale,outputPath}),/context|rules/i);
    await assert.rejects(access(outputPath),{code:'ENOENT'});
    const oldContext={...fixture.context,renderingRulesRef:stale.context.renderingRulesRef};
    assert.throws(()=>resolveAutoPresentationV001({baselinePlan:fixture.baselinePlan,context:oldContext}),/rendering rules version differs/);
    const overridesPath=path.join(fixture.directory,'edited-stale.json');await writeFile(overridesPath,bytes(stale));
    await assert.rejects(loadAutoPresentationV001({...fixture,overridesPath}),/context|rules/i);
    const arbitrary=clone(overrides);arbitrary.entries=[{captionId:'caption-2',role:'Panel accent',presentation:'provisional-panel-graph-paper',scope:'whole-caption',imagePath:'/arbitrary.png'}];
    await assert.rejects(saveAutoPresentationOverridesV001({...fixture,overrides:arbitrary,outputPath}),/finite|fields|digest|hash/i);
    await assert.rejects(access(outputPath),{code:'ENOENT'});
  }finally{await rm(fixture.directory,{recursive:true,force:true});}
});
function orchestrationFixture(){
  const plan=planFixture(),planBytes=bytes(plan),ref=(name,content=name)=>({path:'/synthetic/'+name,fileSha256:hash(content)}),mediaRef=ref('base.mp4');
  const timelineBytes=bytes({schemaVersion:'presentation-base-media-timeline-v003',baseMedia:{frameRate:'30/1',expectedFrameCount:360,fileSha256:mediaRef.fileSha256},
    segments:plan.elements.map((row,index)=>({segmentId:`segment-${index}`,outputStartFrame:index*120,outputEndFrame:(index+1)*120,sourceStartFrame30:index*1000,sourceEndFrame30:index*1000+120}))});
  const decisionInputBytes=bytes({schemaVersion:'presentation-focus-decision-input-v005',pulseTimingEvidence:null});
  const source={digestRef:{version:'synthetic-panel-choice-v001',sha256:hash('test-digest')},planRef:ref('normal.json',planBytes),timelineRef:ref('timeline.json',timelineBytes),mediaRef,
    planBytes,timelineBytes,playbackSampleRate:48000,observationSampleRate:16000,decisionInputBytes,
    captionContext:{baselineRef:{...ref('normal.json',planBytes),canonicalSha256:sha256AutoPresentationV001(plan)},decisionInputRef:ref('decision.json',decisionInputBytes),renderingRulesRef:clone(AUTO_PRESENTATION_RULES_REF_V008),pulseTimingEvidence:null}};
  const context=createOrchestrationContextV001(source);
  const evidence={productionPurpose:'Test-only Panel persistence and public selection',captions:plan.elements.map((row,index)=>({captionId:row.instructionId,text:row.text,contextId:`context-${index}`,startFrame:row.startFrame,endFrameExclusive:row.endFrameExclusive,eligiblePulsePeakIds:[]})),
    contexts:plan.elements.map((_row,index)=>({contextId:`context-${index}`,description:'test only'})),observations:[],audioEvidence:null,audioCandidates:[]};
  const input=createOrchestrationJudgmentInputV001({context,evidence});
  const reply={schemaVersion:'presentation-orchestration-judgment-v002',inputSha256:input.inputSha256,completion:'complete',
    captions:plan.elements.map(row=>({captionId:row.instructionId,status:'resolved',semanticRole:'focus',allowedPresets:[{preset:'panel',allowedBackgroundPresets:['plain']}],reason:'Test-only automatic plain panel',evidenceIds:[row.instructionId]})),
    connections:context.connectionIds.map(connectionId=>({connectionId,status:'resolved',semanticRole:'continuation',allowedPresets:['normal-cut'],reason:'Test-only normal connection',evidenceIds:[connectionId]}))};
  const state=fixOrchestrationJudgmentV001({context,input,replyBytes:bytes(reply)});
  return {source,context,state,plan};
}
test('one-item orchestration and UI payload retain background choice; Normal and Reset do not affect other captions/connections',async()=>{
  const fixture=orchestrationFixture(),initial=resolveOrchestrationDrawingViewV001(fixture);
  const stable=bytes(fixture.state);
  let state=fixture.state;
  for(const [preset,id] of variants){
    state=editOrchestrationOverrideV001({...fixture,state,kind:'caption',itemId:'caption-2',selection:{preset}});
    // JSON round-trip is distinct from native save/applicability; it checks the persisted state representation.
    state=JSON.parse(bytes(state));const view=resolveOrchestrationDrawingViewV001({...fixture,state});
    const snapshot={...fixture,state,view,revision:view.viewSha256};
    const target=editingTargetListV001(snapshot).captions.find(row=>row.id==='caption-2');
    assert.equal(target.preset,preset);assert.equal(target.hasOverride,true);
    const details=await editingTargetDetailsV001(snapshot,'caption','caption-2');assert.deepEqual(details.selection,{preset});
    assert.deepEqual(details.options.filter(option=>option.value.startsWith('panel')).map(option=>option.value),variants.map(row=>row[0]));
    assert.equal(view.resolvedPlan.elements[1].visualState.background.panelPresetId,id);
    assert.deepEqual(view.resolvedPlan.elements.filter(row=>row.instructionId!=='caption-2'),initial.resolvedPlan.elements.filter(row=>row.instructionId!=='caption-2'));
    assert.deepEqual(state.connectionOverrides,fixture.state.connectionOverrides);assert.deepEqual(state.connectionAuto,fixture.state.connectionAuto);
  }
  state=editOrchestrationOverrideV001({...fixture,state,kind:'caption',itemId:'caption-2',selection:'Normal'});
  assert.equal(resolveOrchestrationDrawingViewV001({...fixture,state}).resolvedPlan.elements[1].visualState.background.panelPresetId,undefined);
  state=editOrchestrationOverrideV001({...fixture,state,kind:'caption',itemId:'caption-2',selection:'Reset'});
  assert.deepEqual(resolveOrchestrationDrawingViewV001({...fixture,state}).resolvedPlan,initial.resolvedPlan);
  assert.equal(bytes(fixture.state),stable);
});
test('CLI show retains finite background name after saving each choice',async()=>{
  for(const [preset] of variants){const fixture=await storageFixture(preset);
    try{const loaded=await loadAutoPresentationV001(fixture);const rows=inspectAutoPresentationCaptionsV001({...loaded,query:{captionId:'caption-2'}});
      const text=formatAutoPresentationCaptionRowsV001(rows);assert.match(text,new RegExp(getPresentationPanelPresetV002(orchestrationCaptionChoiceToSelectionV001({preset}).presentation).label.replace(/[()]/g,'\\$&')));
    }finally{await rm(fixture.directory,{recursive:true,force:true});}}
});
