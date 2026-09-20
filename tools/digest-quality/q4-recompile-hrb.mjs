/** Explicit Q4 technical recompile of immutable HRB-001 semantic decisions. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {loadAutoPresentationContextV001} from '../../evals/clip_composition/presentation_auto_effects_io_v001.mjs';
import {sha256AutoPresentationV001} from '../../evals/clip_composition/presentation_auto_effects_v001.mjs';
import {createOrchestrationContextV001,recompileOrchestrationPanelBackgroundsV002,
  resolveOrchestrationDrawingViewV001,exportOrchestrationDrawingViewEvidenceV001,
  restoreOrchestrationDrawingViewEvidenceV001} from '../../evals/clip_composition/presentation_orchestration_v001.mjs';
import {assertIgnoredPresentationOutputDirectoryV001} from '../../evals/clip_composition/presentation_output_directory_v001.mjs';

const repo=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const save=(file,value)=>writeFile(file,JSON.stringify(value,null,2)+'\n',{flag:'wx'});
const omit=(value,keys)=>Object.fromEntries(Object.entries(value).filter(([key])=>!keys.includes(key)));
export async function recompileHrbQ4(outputDirectory) {
  assertIgnoredPresentationOutputDirectoryV001({repositoryRoot:repo,outputDirectory});
  const oldDir=path.join(repo,'docs/reports/digest-presentation-orchestration-stage3-inputs-20260918');
  const names={selectionRecordBytes:'selectionRecord.json',inputBytes:'fresh-input.json',replyBytes:'raw-ai-response-v001.json'};
  const original={},refs=[];
  for(const [key,name]of Object.entries(names)) {
    const file=path.join(oldDir,name),bytes=await readFile(file,'utf8');
    original[key]=bytes;original[key.replace('Bytes','FileSha256')]=hash(bytes);
    refs.push({path:file,fileSha256:hash(bytes)});
  }
  const oldSourceBytes=await readFile(path.join(oldDir,'source-bindings.json'),'utf8'),oldSource=JSON.parse(oldSourceBytes);
  refs.push({path:path.join(oldDir,'source-bindings.json'),fileSha256:hash(oldSourceBytes)});
  const loaded=await loadAutoPresentationContextV001({baselinePath:oldSource.planRef.path,
    decisionInputPath:oldSource.captionContext.decisionInputRef.path});
  assert.deepEqual(omit(loaded.context,['renderingRulesRef']),omit(oldSource.captionContext,['renderingRulesRef']));
  const source={...oldSource,captionContext:loaded.context};
  const context=createOrchestrationContextV001(source);
  const state=recompileOrchestrationPanelBackgroundsV002({context,original});
  const old=JSON.parse(original.selectionRecordBytes),oldAutos={};
  for(const name of ['captionAuto','connectionAuto']) {
    const file=path.join(oldDir,name+'.json'),bytes=await readFile(file,'utf8');
    oldAutos[name]=JSON.parse(bytes);refs.push({path:file,fileSha256:hash(bytes)});
    assert.equal(sha256AutoPresentationV001(oldAutos[name]),old[name+'Sha256'],'old automatic plan differs from fixed record');
  }
  const oldAuto=oldAutos.captionAuto;
  assert.deepEqual(state.connectionAuto,oldAutos.connectionAuto);
  for(const before of old.captions) {
    const after=state.selectionRecord.captions.find(row=>row.captionId===before.captionId);
    assert.deepEqual(after.selection,before.selection,'expression selection changed');
  }
  assert.deepEqual(state.captionAuto.proposal.effects.filter(row=>row.role!=='Panel accent'),
    oldAuto.proposal.effects.filter(row=>row.role!=='Panel accent'));
  assert.deepEqual(state.captionAuto.proposal.exceptions,oldAuto.proposal.exceptions);
  const view=resolveOrchestrationDrawingViewV001({context,state});
  assert.equal(view.projection.displayFrameCount,4867);
  assert.equal(state.captionOverrides.entries.length,0);assert.equal(state.connectionOverrides.entries.length,0);
  const proof=exportOrchestrationDrawingViewEvidenceV001(view);
  assert.deepEqual(restoreOrchestrationDrawingViewEvidenceV001(JSON.parse(JSON.stringify(proof))),view);
  await mkdir(outputDirectory);
  for(const [name,value]of Object.entries(state))await save(path.join(outputDirectory,name+'.json'),value);
  await save(path.join(outputDirectory,'source-bindings.json'),source);
  await save(path.join(outputDirectory,'drawing-evidence.json'),proof);
  const panels=view.effectiveSelections.filter(row=>row.selection.role==='Panel accent').map(row=>{
    const element=view.resolvedPlan.elements.find(element=>element.instructionId===row.captionId);
    return {...row,text:element.text,startFrame:element.startFrame,endFrameExclusive:element.endFrameExclusive};
  });
  assert(panels.length>0,'Q4 HRB replay must preserve the original Panel selections');
  const chosen=panels.find(row=>row.selection.presentation!=='provisional-panel')??null;
  const preRender={schemaVersion:'digest-quality-q4-hrb-pre-render-v001',selectionRecordedBeforeAnyNewImage:true,
    criteria:'原固定案のPanelを維持し、新背景が選ばれた最初の字幕を一件確認。全件無地ならQ1と同じ描画事実だけを再証明する動画を作らない。',
    selectedCaption:chosen,allAutomaticPanels:panels,manualSelection:false,
    renderRequired:chosen!==null,range:chosen?{startFrame:chosen.startFrame,endFrameExclusive:chosen.endFrameExclusive}:null,
    reason:chosen?'新しく自動選択された背景の実動画への接続を確認する。':'全3件で無地を自動選択。背景を手補充せず、Q1で成立した同じ描画の再生成は省く。自動案の局所性・保存・二段階選択は記録で検証し、別Digestの実選択と実動画へ進む。'};
  await save(path.join(outputDirectory,'pre-render-selection.json'),preRender);
  const lineage={schemaVersion:'digest-quality-q4-hrb-recompile-v001',kind:'technical-recompile',originalRefs:refs,
    oldRenderingRules:oldSource.captionContext.renderingRulesRef,newRenderingRules:loaded.context.renderingRulesRef,
    expressionSelectionsPreserved:true,nonPanelChoicesPreserved:true,connectionChoicesPreserved:true,
    panelBackgroundPolicy:['plain','graph-paper','comic-frame'],freshAiJudgment:false,humanQualityApproved:false,
    viewSha256:view.viewSha256,selectionRecordSha256:state.selectionRecord.recordSha256};
  await save(path.join(outputDirectory,'lineage.json'),lineage);
  for(const ref of refs)assert.equal(hash(await readFile(ref.path)),ref.fileSha256);
  return {lineage,preRender};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  recompileHrbQ4(path.resolve(process.argv[2])).then(value=>console.log(JSON.stringify(value,null,2)))
    .catch(error=>{console.error(error.stack);process.exitCode=1;});
}
