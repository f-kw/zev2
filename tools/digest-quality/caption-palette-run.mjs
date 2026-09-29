/** Saved 7B -> finite palette candidate -> local 540p proof.
 * No model call, new target selection, full render or old artifact mutation. */
import assert from 'node:assert/strict';
import {readFile,mkdir,statfs} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {canonicalSha256} from './clock.mjs';
import {bindDigestStructureFileV001 as bind,verifyDigestStructureFileV001 as verify,saveDigestStructureFileV001 as save,
  readDigestStructureDrawingEvidenceV001} from './digest-structure-evidence.mjs';
import {CAPTION_PALETTE_V001,createCaptionPaletteAutoV001,createCaptionPaletteOverridesV001,
  editCaptionPaletteOverrideV001,exportCaptionPaletteStateV001,restoreCaptionPaletteStateV001} from './caption-palette-policy.mjs';
import {captionPaletteSourceV001,saveCaptionPaletteDrawingEvidenceV001,readCaptionPaletteDrawingEvidenceV001} from './caption-palette-view.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const output=path.join(root,'runtime/artifacts/caption-palette-20260929-v001');
const previous=path.join(root,'runtime/artifacts/digest-structure-20260929-v001');
const json=async p=>JSON.parse(await readFile(p,'utf8'));
const write=(file,data)=>save(path.join(output,file),data);
const sourceRef=()=>bind(path.join(previous,'drawing-evidence.json'));
const ranges={yellow:{startFrame:2138,endFrameExclusive:2328},
  cyan:{startFrame:17094,endFrameExclusive:17275},override:{startFrame:17094,endFrameExclusive:17275},
  normal:{startFrame:17094,endFrameExclusive:17275},reset:{startFrame:17094,endFrameExclusive:17275}};
const prefix='new-material-digest-20260926-v001-instruction-instruction-';
const selected=new Map([
  ['000171',{paletteId:'light-sky-blue',reason:'先行する「チームプレイ」と対になる「ソロプレイ」を、この会話内だけ水色で区別する。'}],
  ['000194',{paletteId:'light-sky-blue',reason:'「現代でも通用」から「デジタル化」へ続く同じ時代対応の説明として水色を固定する。'}],
  ['000197-readability-02',{paletteId:'light-sky-blue',reason:'先行する「現代でも通用」と同じ時代対応の説明を継続し、水色を固定する。'}],
].map(([id,v])=>[prefix+id,v]));

async function prepare(probePath,brightPath) {
  assert(probePath&&brightPath,'passed actual pixel and bright-background records required');
  const probeRef=await bind(path.resolve(probePath)),probe=await json(probeRef.path);
  assert.equal(probe.status,'passed','actual pixel/background verification must complete before palette adoption');
  assert.equal(probe.schemaVersion,'caption-palette-pixel-probe-v001');
  assert.deepEqual(probe.palettes.filter(p=>CAPTION_PALETTE_V001.colors.some(c=>c.paletteId===p.paletteId)).map(({paletteId,color})=>({paletteId,fontColor:color})),
    CAPTION_PALETTE_V001.colors.map(({paletteId,fontColor})=>({paletteId,fontColor})),'probe palette differs from adopted registry');
  const ref=await sourceRef(),completionRef=await bind(path.join(previous,'candidate/completion.json'));
  for(const required of [ref,completionRef])assert(probe.inputs.some(r=>r.path===required.path&&r.fileSha256===required.fileSha256&&r.bytes===required.bytes),
    'probe did not use the bound 7B source/completion');
  for(const input of probe.inputs)await verify(input);
  const oldCompletion=await json(completionRef.path);assert.deepEqual(oldCompletion.drawingEvidenceRef,ref);
  const brightRef=await bind(path.resolve(brightPath)),bright=await json(brightRef.path);
  assert.equal(bright.status,'passed');assert.equal(bright.schemaVersion,'caption-palette-bright-background-v001');
  assert.deepEqual(bright.palettes.map(({paletteId,color})=>({paletteId,fontColor:color})),
    CAPTION_PALETTE_V001.colors.map(({paletteId,fontColor})=>({paletteId,fontColor})));
  for(const required of [probeRef,completionRef])assert(bright.inputs.some(r=>r.path===required.path&&r.fileSha256===required.fileSha256),
    'bright-background probe is from a different execution');
  for(const input of bright.inputs)await verify(input);
  // The report records a developer-selected candidate, not human adoption.
  const view=await readDigestStructureDrawingEvidenceV001({evidenceRef:ref}),source=captionPaletteSourceV001(view);
  const choices=view.effectiveSelections.filter(row=>row.selection.role==='Focus').map(row=>({captionId:row.captionId,
    ...(selected.get(row.captionId)??{paletteId:'yellow',reason:'保存済みの強調語句と範囲を維持。別色を付ける明確な文脈上の根拠は弱いため既存Yellowとする。'})}));
  assert.equal(choices.length,18);assert.equal(choices.filter(row=>selected.has(row.captionId)).length,selected.size);
  const automatic=createCaptionPaletteAutoV001({source,choices}),overrides=createCaptionPaletteOverridesV001({source,automatic});
  const saved=exportCaptionPaletteStateV001({source,automatic,overrides});
  const evidence=await saveCaptionPaletteDrawingEvidenceV001({sourceEvidenceRef:ref,saved,
    outputStatePath:path.join(output,'palette-state.json'),outputEvidencePath:path.join(output,'drawing-evidence.json')});
  const oldJob=await json(path.join(previous,'job.json')),background=(await json(path.join(previous,'background-result.json'))).result;
  const job={schemaVersion:'caption-palette-run-v001',startedAt:new Date().toISOString(),
    head:execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim(),
    palette:CAPTION_PALETTE_V001,probeRef,brightRef,sourceEvidenceRef:ref,evidenceRef:evidence.evidenceRef,stateRef:evidence.stateRef,
    profileId:oldJob.profileId,tools:oldJob.tools,baseProxyManifestRef:background.manifestRef,
    backgroundProofRef:background.backgroundProofRef,ranges,
    preservedVideoRef:await bind(path.join(previous,'candidate/development-proxy.mp4')),
    judgmentOrigin:'explicit-fixed-contextual-palette-choice',humanQuality:'not-evaluated',productionDefaultChanged:false};
  await write('job.json',job);
  const changed=evidence.view.resolvedPlan.elements.flatMap((e,i)=>{
    const prior=view.resolvedPlan.elements[i],copy=structuredClone(e);
    if(copy.presentationColorRange)copy.presentationColorRange.fontColor=prior.presentationColorRange.fontColor;
    assert.deepEqual(copy,prior,'non-color content changed');
    return canonicalSha256(e)===canonicalSha256(prior)?[]:[{captionId:e.instructionId,text:e.text,
      selectedText:Array.from(e.text).slice(e.presentationColorRange.startCodePoint,e.presentationColorRange.endCodePointExclusive).join(''),
      startFrame:e.startFrame,endFrameExclusive:e.endFrameExclusive,paletteId:choices.find(c=>c.captionId===e.instructionId).paletteId}];});
  assert.equal(changed.length,3);assert.deepEqual(evidence.view.projection,view.projection);
  await write('candidate-verification.json',{status:'passed',captionCount:265,colorCount:18,newColorCount:0,removedColorCount:0,
    changedColors:changed,unchangedCaptionCount:262,sourceViewSha256:view.viewSha256,paletteViewSha256:evidence.view.viewSha256,
    preservedProjectionSha256:view.projection.projectionSha256,unchangedNormalPlanSha256:canonicalSha256(view.projectedNormalPlan),
    humanQuality:'not-evaluated',productionDefaultChanged:false});
  return {evidenceRef:evidence.evidenceRef,changedColors:changed};
}
/** Finite one-caption operations for saved palette candidates. Always creates
 * a new record; Reset removes the override and uses the saved auto color. */
export async function editSavedCaptionPaletteV001({evidenceRef,captionId,selection,outputDirectory}) {
  const before=await readCaptionPaletteDrawingEvidenceV001({evidenceRef}),receipt=await json(evidenceRef.path);
  const sourceView=await readDigestStructureDrawingEvidenceV001({evidenceRef:receipt.sourceEvidenceRef});
  const source=captionPaletteSourceV001(sourceView),saved=await json(receipt.stateRef.path);
  const state=restoreCaptionPaletteStateV001({source,saved});
  const overrides=editCaptionPaletteOverrideV001({source,...state,captionId,selection});
  const next=exportCaptionPaletteStateV001({source,automatic:state.automatic,overrides});
  await mkdir(outputDirectory);
  const after=await saveCaptionPaletteDrawingEvidenceV001({sourceEvidenceRef:receipt.sourceEvidenceRef,saved:next,
    outputStatePath:path.join(outputDirectory,'palette-state.json'),outputEvidencePath:path.join(outputDirectory,'drawing-evidence.json')});
  for(let i=0;i<before.resolvedPlan.elements.length;i++)if(before.resolvedPlan.elements[i].instructionId!==captionId)
    assert.deepEqual(after.view.resolvedPlan.elements[i],before.resolvedPlan.elements[i]);
  assert.deepEqual(after.view.projection,before.projection);assert.deepEqual(next.automatic,saved.automatic);
  return {evidenceRef:after.evidenceRef,stateRef:after.stateRef,viewSha256:after.view.viewSha256};
}
async function editProof() {
  const job=await json(path.join(output,'job.json')),captionId=prefix+'000197-readability-02';
  const override=await editSavedCaptionPaletteV001({evidenceRef:job.evidenceRef,captionId,
    selection:{paletteId:'yellow'},outputDirectory:path.join(output,'override')});
  const normal=await editSavedCaptionPaletteV001({evidenceRef:override.evidenceRef,captionId,
    selection:'Normal',outputDirectory:path.join(output,'normal')});
  const normalView=await readCaptionPaletteDrawingEvidenceV001({evidenceRef:normal.evidenceRef});
  assert.deepEqual(normalView.resolvedPlan.elements.find(e=>e.instructionId===captionId),
    normalView.projectedNormalPlan.elements.find(e=>e.instructionId===captionId));
  const reset=await editSavedCaptionPaletteV001({evidenceRef:normal.evidenceRef,captionId,
    selection:'Reset',outputDirectory:path.join(output,'reset')});
  const initial=await readCaptionPaletteDrawingEvidenceV001({evidenceRef:job.evidenceRef});
  const returned=await readCaptionPaletteDrawingEvidenceV001({evidenceRef:reset.evidenceRef});
  assert.deepEqual(initial.resolvedPlan,returned.resolvedPlan);assert.deepEqual(initial.effectiveSelections,returned.effectiveSelections);
  assert.equal(initial.paletteStateSha256,returned.paletteStateSha256);
  return {status:'passed',captionId,automaticPalette:'light-sky-blue',overridePalette:'yellow',override,normal,reset,
    resetPlanSha256:canonicalSha256(returned.resolvedPlan),automaticPlanSha256:canonicalSha256(initial.resolvedPlan)};
}
async function render(name) {
  assert(Object.hasOwn(ranges,name),'known local technical sample required');
  const {renderPresentationDevProxyPaletteV001}=await import('../../evals/clip_composition/presentation_dev_proxy_palette_render_v001.mjs');
  const job=await json(path.join(output,'job.json'));
  const evidenceRef=['override','normal','reset'].includes(name)?await bind(path.join(output,name,'drawing-evidence.json')):job.evidenceRef;
  return renderPresentationDevProxyPaletteV001({...job,drawingEvidenceRef:evidenceRef,outputDirectory:path.join(output,'clips',name),range:ranges[name],
    onProgress:row=>console.log(JSON.stringify(row))});
}
async function reread(name) {
  assert(Object.hasOwn(ranges,name));const {readPresentationDevProxyPaletteV001}=await import('../../evals/clip_composition/presentation_dev_proxy_palette_render_v001.mjs');
  return readPresentationDevProxyPaletteV001({completionRef:await bind(path.join(output,'clips',name,'completion.json'))});
}
async function stage(name,fn) {
  const started=performance.now(),startedAt=new Date().toISOString(),disk=await statfs(root);
  let value;
  try {value=await fn();} catch(error) {
    await write(name+'-failure.json',{stage:name,status:'incomplete',startedAt,endedAt:new Date().toISOString(),
      wallSeconds:(performance.now()-started)/1000,message:error.message,stack:error.stack});throw error;
  }
  const endedAt=new Date().toISOString();
  const record={stage:name,status:'passed',startedAt,endedAt,wallSeconds:(performance.now()-started)/1000,
    parentMaxRssBytes:process.resourceUsage().maxRSS*1024,memoryScope:'Node parent only',
    freeBytesBefore:disk.bavail*disk.bsize,result:value};
  const ref=await write(name+'-result.json',record);console.log(JSON.stringify({status:'passed',stage:name,wallSeconds:record.wallSeconds,ref}));
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  const [command,name,...args]=process.argv.slice(2);
  await mkdir(output,{recursive:true});
  if(command==='prepare')await stage('prepare',()=>prepare(name,args[0]));
  else if(command==='edit-proof')await stage('edit-proof',editProof);
  else if(command==='render') {await mkdir(path.join(output,'clips'),{recursive:true});await stage('render-'+name,()=>render(name));}
  else if(command==='reread')await stage('reread-'+name,()=>reread(name));
  else if(command==='edit'){
    const [captionId,operation,destination]=args;assert(destination,'edit <evidence.json> <caption-id> <palette-id|Normal|Reset> <new-output-directory>');
    const value=await editSavedCaptionPaletteV001({evidenceRef:await bind(path.resolve(name)),captionId,
      selection:['Normal','Reset'].includes(operation)?operation:{paletteId:operation},outputDirectory:path.resolve(destination)});
    console.log(JSON.stringify(value));
  } else throw Error('expected prepare <probe.json>, edit-proof, render/reread <local-name>, or edit');
}
