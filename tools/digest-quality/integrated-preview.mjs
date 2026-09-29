/** Explicit same-Digest 540p A/B execution. Frozen source readers stay untouched. */
import assert from 'node:assert/strict';
import {readFile,mkdir,realpath,statfs,appendFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {canonicalSha256 as hash} from './clock.mjs';
import {bindDigestStructureFileV001 as bind,verifyDigestStructureFileV001 as verify,saveDigestStructureFileV001 as save} from './digest-structure-evidence.mjs';
import {readIntegrationPreparationV001 as readPreparation,validateIntegrationDraftV001 as validateDraft,editIntegrationPreviewV001 as edit,resolveIntegrationPreviewV001 as resolve} from './integration-preparation.mjs';
import {createPresentationDevProxyOverlaySessionV001 as overlaySession} from '../../evals/clip_composition/presentation_dev_proxy_overlay_session_v001.mjs';
import {buildPresentationRendererOverlayAdapterV001 as adapter,composePresentationMediaV001 as compose,buildPresentationCompositeArgumentsV001 as compositeArgs,runPresentationRendererChildProcessV001 as child} from '../../evals/clip_composition/render_presentation_v002.mjs';
import {createPresentationRendererProcessObserverV001 as observer} from '../../evals/clip_composition/presentation_renderer_process_observation_v001.mjs';
import {inspectOverlayPngWithToolV001 as png,inspectRenderedMediaWithToolsV001 as media} from '../../evals/clip_composition/presentation_renderer_qc_v002.mjs';
import {assertPresentationDevProxyAlphaBoundsV001 as bounds} from '../../evals/clip_composition/presentation_dev_proxy_render_v001.mjs';
import {inspectOrchestrationEncodedAudioV001 as audioClock} from '../../evals/clip_composition/presentation_orchestration_background_v001.mjs';
import {assertPresentationCaptionMotionLayoutsV001 as motionLayouts} from '../../evals/clip_composition/presentation_caption_motion_v001.mjs';
import {assertPresentationPulseAnchorsV001 as pulseAnchors} from '../../evals/clip_composition/presentation_pulse_v001.mjs';
import {verifyEditedOrchestrationDrawingRulesRefV001 as rules} from '../../evals/clip_composition/presentation_orchestration_edited_render_v001.mjs';
import {assertIgnoredPresentationOutputDirectoryV001 as guard} from '../../evals/clip_composition/presentation_output_directory_v001.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..'),ev=path.join(root,'evals/clip_composition');
const area=path.join(root,'runtime/artifacts/integrated-preview-20260930-v001'),profileId='dev-proxy-540p-v001';
const preparationPath=path.join(root,'runtime/artifacts/integration-preparation-20260930-v001/attempt-002/completion.json');
const json=async p=>JSON.parse(await readFile(p,'utf8')),same=assert.deepEqual,clone=structuredClone;
const run=async(t,args,o=null,label='integrated-check')=>child(t,args,{...(o?{processObserver:o,observationLabel:label}:{})});
const capture=async(t,args,o,label)=>(await run(t,args,o,label)).stdout.toString('utf8');
const capacity=async()=>{const s=await statfs(root);return {at:new Date().toISOString(),availableBytes:s.bavail*s.bsize};};
export function integratedBackgroundArgsV001(draft,output) {
 validateDraft(draft);const c=draft.input.reaction,{startFrame:a,endFrameExclusive:b}=c.interval,n=draft.input.frameCount;
 const p=c.pixelCrop;assert.notEqual(draft.input.background.path,output);
 const f=`[0:v]split=3[a][b][c];[a]trim=start_frame=0:end_frame=${a},setpts=PTS-STARTPTS[pre];`+
 `[b]trim=start_frame=${a}:end_frame=${b},setpts=PTS-STARTPTS,crop=${p.width}:${p.height}:${p.left}:${p.top}:exact=1,scale=960:540:flags=lanczos,setsar=1[close];`+
 `[c]trim=start_frame=${b}:end_frame=${n},setpts=PTS-STARTPTS[post];[pre][close][post]concat=n=3:v=1:a=0[v]`;
 return ['-hide_banner','-nostdin','-v','error','-n','-i',draft.input.background.path,'-filter_complex',f,'-map','[v]','-map','0:a:0','-c:v','ffv1','-level','3','-pix_fmt','yuv420p','-c:a','copy','-map_metadata','-1','-f','nut',output];
}
async function frames(file,tools,o){const s=await capture(tools.ffmpegPath,['-v','error','-i',file,'-map','0:v:0','-an','-pix_fmt','yuv420p','-f','framemd5','-'],o,'integrated-background-frames');return s.split('\n').filter(l=>l&&!l.startsWith('#')).map(l=>l.split(',').at(-1).trim());}
async function pcm(file,tools,o){return (await capture(tools.ffmpegPath,['-v','error','-i',file,'-map','0:a:0','-vn','-c:a','pcm_f32le','-f','hash','-hash','sha256','-'],o,'integrated-pcm')).trim();}
async function clock(file,tools,count=17613,o){const v=JSON.parse(await capture(tools.ffprobePath,['-v','error','-select_streams','v:0','-show_streams','-show_frames','-show_entries','stream=time_base:frame=best_effort_timestamp','-of','json',file],o,'integrated-clock'));assert.equal(v.frames.length,count);const [n,d]=v.streams[0].time_base.split('/').map(BigInt);v.frames.forEach((f,i)=>assert.equal(BigInt(f.best_effort_timestamp)*n*30n,BigInt(i)*d));return {frameCount:count,ptsSha256:hash(v)};}
async function inputs(preparationRef) {
 const prepared=await readPreparation(preparationRef),receipt=await json(preparationRef.path),draft=await json(receipt.draftRef.path);validateDraft(draft);
 assert.equal(prepared.outlineChoice,null);const previous=await json(draft.input.refs.structure.path),job=await json(draft.input.refs.paletteJob.path);
 await rules(previous.implementation.originalRules);for(const r of previous.implementation.developmentImplementation)await verify(r);
 const tools={...job.tools,layoutInspectorPath:path.join(ev,'inspect_presentation_render_layout_v001.ts')};
 const implementation=await Promise.all([fileURLToPath(import.meta.url),process.execPath,...Object.values(tools),
  path.join(root,'docs/work-orders/ZEV_BUILD_LOOP_INTEGRATED_PREVIEW_20260930_v001.md')].map(async p=>bind(await realpath(p))));
 return {preparationRef,receipt,draft,previous,tools,implementation,registry:previous.registry};
}
function wanted(input,variant) {const saved=edit(input.draft,null,{outline:variant,framing:'Reset'});return {saved,...resolve(input.draft,saved)};}
function builtProps(input,derived){const build=adapter({...input.tools,processObserver:{run(){throw Error('props only');}}}).buildProps;
 return derived.states.map(s=>{let props=build(s.element,derived.plan,input.registry),calibration=null;
  if(s.element.visualState.background||s.element.visualState.position.preset==='top-band'){
   const prior=input.previous.stateRecords.find(r=>r.captionId===s.captionId&&r.state===s.state);assert(prior?.calibration);
   const old=clone(prior.props);delete old.renderVisibleCenterCorrectionPx;same(props,old,'Panel calibration inputs changed');
   props=clone(prior.props);calibration=clone(prior.calibration);
  }return {props,calibration};});
}
export function integratedRecordsV001(derived,rows){assert.equal(rows.length,derived.states.length);return derived.plan.elements.map(element=>{
 const states=rows.filter(r=>r.captionId===element.instructionId);assert(states.length);
 if(element.presentationMotion||element.presentationPulse)return {element,[element.presentationMotion?'motionStates':'pulseStates']:states.map(r=>({state:r.state,element:r.element,pngPath:r.png.path}))};
 assert.equal(states.length,1);return {element,pngPath:states[0].png.path};});}
function composite(input,derived,rows,background,video,o){return {baseMediaPath:background,plan:derived.plan,overlayRecords:integratedRecordsV001(derived,rows),expectedFrameCount:17613,outputPath:video,ffmpegPath:input.tools.ffmpegPath,processObserver:o,serializePngAndFilters:true,audioMediaPath:input.draft.input.audio.path,renderRange:null};}
function validateRows(input,derived,rows) {
 const expected=builtProps(input,derived);assert.equal(rows.length,307);
 rows.forEach((r,i)=>{same({captionId:r.captionId,state:r.state,element:r.element},derived.states[i]);same(r.props,expected[i].props);same(r.calibration,expected[i].calibration);assert.equal(r.propsSha256,hash(r.props));bounds({element:r.element,canvas:derived.plan.canvas,profileId,observation:r.alpha});});
}
async function backgroundCheck(input,file,o){const old=await frames(input.draft.input.background.path,input.tools,o),now=await frames(file,input.tools,o);assert.equal(old.length,17613);assert.equal(now.length,17613);
 const changed=now.flatMap((h,i)=>h===old[i]?[]:[i]);same(changed,Array.from({length:82},(_,i)=>9771+i));
 const sourcePcm=await pcm(input.draft.input.background.path,input.tools,o);assert.equal(await pcm(file,input.tools,o),sourcePcm);
 const timing=await clock(file,input.tools,17613,o);
 return {changedFrames:changed,normalSha256:hash(old),framedSha256:hash(now),sourcePcm,clock:timing};}
async function inspectOutput(input,video,o){const m=await media(video,{...input.tools,processObserver:o});same(m.video,{codecName:'h264',width:960,height:540,fps:30,frameCount:17613});
 const a=await audioClock({audioPath:video,logicalSampleCount:25891110,sampleRate:44100,...input.tools});
 const original=await audioClock({audioPath:input.draft.input.audio.path,logicalSampleCount:25891110,sampleRate:44100,...input.tools});same(a,original);
 return {media:m,clock:await clock(video,input.tools,17613,o),audio:a};}
export async function renderIntegratedPreviewV001(destination){
 assert(path.resolve(destination).startsWith(area+path.sep));guard({repositoryRoot:root,outputDirectory:destination});await mkdir(destination);
 const start=performance.now(),startedAt=new Date().toISOString(),o=observer({observationDirectory:path.join(destination,'processes')}),timings={},spaces=[];
 const log=async data=>{await appendFile(path.join(destination,'progress.jsonl'),JSON.stringify({at:new Date().toISOString(),...data})+'\n');console.log(JSON.stringify(data));};
 let session;try {
  spaces.push(await capacity());const input=await inputs(await bind(preparationPath));
  await save(path.join(destination,'inputs.json'),{preparationRef:input.preparationRef,implementation:input.implementation});
  const cache=new Map(),variants=[];
  session=overlaySession({repositoryRoot:root,entryPoint:path.join(ev,'presentation_renderer_entry_v001.tsx'),publicDir:path.join(root,'runner/public'),...input.tools,processObserver:o,profileId});
  for(const variant of ['A','B']) {
   spaces.push(await capacity());const d=wanted(input,variant),props=builtProps(input,d),dir=path.join(destination,variant);await mkdir(dir);await mkdir(path.join(dir,'overlays'));
   const layoutIn=path.join(dir,'layout-input.json'),layoutOut=path.join(dir,'layout-output.json');await save(layoutIn,{canvas:d.plan.canvas,overlays:props.map(p=>p.props)});
   const ls=performance.now();await child(input.tools.tsxPath,[input.tools.layoutInspectorPath,layoutIn,layoutOut],{processObserver:o,observationLabel:'integrated-layout',env:{NODE_PATH:path.join(root,'runner/node_modules')}});
   const layout=await json(layoutOut);assert.equal(layout.status,'passed');assert.equal(layout.items.length,307);
   let cursor=0;for(const e of d.plan.elements){const n=d.states.filter(s=>s.captionId===e.instructionId).length,items=layout.items.slice(cursor,cursor+n);cursor+=n;
    if(e.presentationMotion)motionLayouts({element:e,canvas:d.plan.canvas,layoutItems:items});if(e.presentationPulse)pulseAnchors(items);}
   const rows=[],violations=[],rs=performance.now();
   for(const [i,state]of d.states.entries()) {
    const {props:p,calibration}=props[i],key=hash(p);let record=cache.get(key),reusedFrom=null;
    if(record){await verify(record.png);same(record.props,p);reusedFrom=record.png.path;}
    else {const target=path.join(dir,'overlays',`${i}.png`);await session.render(p,target);record={props:p,png:await bind(target),alpha:await png({instructionId:state.captionId,pngPath:target,imageMagickPath:input.tools.imageMagickPath,processObserver:o})};cache.set(key,record);}
    try{bounds({element:state.element,canvas:d.plan.canvas,profileId,observation:record.alpha});}catch(e){violations.push({captionId:state.captionId,state:state.state,message:e.message,alpha:record.alpha});}
    rows.push({...state,...record,propsSha256:key,calibration,reusedFrom});if(i%25===0)await log({phase:'raster',variant,index:i,count:307,violations:violations.length});
   }
   const rowRef=await save(path.join(dir,'raster.json'),{variant,saved:d.saved,rows,violations,layoutRef:await bind(layoutOut),layoutMilliseconds:rs-ls,rasterMilliseconds:performance.now()-rs});
   variants.push({variant,rowRef,violations});await log({phase:'raster-complete',variant,violations:violations.length});
  }
  await session.close();session=null;timings.rasterFinishedMilliseconds=performance.now()-start;
  const background=path.join(destination,'shared-background.nut'),args=integratedBackgroundArgsV001(input.draft,background);
  spaces.push(await capacity());await log({phase:'shared-background'});const bs=performance.now();await run(input.tools.ffmpegPath,args,o,'integrated-background');
  const bgCheck=await backgroundCheck(input,background,o),backgroundRef=await bind(background);timings.backgroundMilliseconds=performance.now()-bs;
  const bgRef=await save(path.join(destination,'background.json'),{source:input.draft.input.background,output:backgroundRef,args,check:bgCheck,audio:input.draft.input.audio});
  const outputs=[];
  for(const v of variants){if(v.violations.length){outputs.push({...v,status:'raster-failed'});continue;}
   const d=wanted(input,v.variant),r=await json(v.rowRef.path);validateRows(input,d,r.rows);spaces.push(await capacity());await log({phase:'composite',variant:v.variant});
   const video=path.join(destination,v.variant,'integrated-preview.mp4'),cs=performance.now(),options=composite(input,d,r.rows,background,video,o);await compose(options);
   const observation=await inspectOutput(input,video,o);
   const completed={variant:v.variant,status:'development-preview-ready',rowRef:v.rowRef,video:await bind(video),observation,compositorArguments:compositeArgs(options),milliseconds:performance.now()-cs};
   await save(path.join(destination,v.variant,'completion.json'),completed);outputs.push(completed);await log({phase:'candidate-complete',variant:v.variant});
  }
  for(const ref of [...input.implementation,...input.receipt.protectedFiles])await verify(ref);await verify(input.preparationRef);spaces.push(await capacity());
  const result={schemaVersion:'digest-integrated-preview-v001',status:outputs.every(r=>r.status==='development-preview-ready')?'development-preview-ready':'incomplete',
   startedAt,endedAt:new Date().toISOString(),preparationRef:input.preparationRef,implementation:input.implementation,backgroundRef:bgRef,outputs,
   timings:{...timings,totalMilliseconds:performance.now()-start},capacity:spaces,processTimings:o.getPerformance(),
   profileId,outlineChoice:null,humanQuality:'not-reviewed',final1080pQc:'not-run',physicalRasterCount:cache.size,logicalRasterCount:614};
  return save(path.join(destination,'completion.json'),result);
 }catch(e){await save(path.join(destination,'failure.json'),{status:'incomplete',startedAt,endedAt:new Date().toISOString(),message:e.message,stack:e.stack,timings,capacity:spaces});throw e;}finally{await session?.close();}
}
export async function readIntegratedPreviewV001(completionRef){
 await verify(completionRef);const c=await json(completionRef.path);assert.equal(c.schemaVersion,'digest-integrated-preview-v001');assert.equal(c.status,'development-preview-ready');
 same(c.outputs.map(r=>r.variant),['A','B']);assert.equal(c.outlineChoice,null);assert.equal(c.final1080pQc,'not-run');assert.equal(c.humanQuality,'not-reviewed');
 const input=await inputs(c.preparationRef);same(input.implementation,c.implementation);for(const ref of c.implementation)await verify(ref);
 await verify(c.backgroundRef);const bg=await json(c.backgroundRef.path);same(bg.source,input.draft.input.background);same(bg.audio,input.draft.input.audio);await verify(bg.output);same(bg.args,integratedBackgroundArgsV001(input.draft,bg.output.path));same(await backgroundCheck(input,bg.output.path),bg.check);
 const observed=new Map();for(const v of c.outputs){await verify(v.rowRef);await verify(v.video);const r=await json(v.rowRef.path),d=wanted(input,v.variant);same(r.saved,d.saved);same(r.violations,[]);validateRows(input,d,r.rows);
  await verify(r.layoutRef);const layout=await json(r.layoutRef.path);assert.equal(layout.status,'passed');assert.equal(layout.items.length,307);
  for(const row of r.rows){await verify(row.png);let actual=observed.get(row.png.path);if(!actual){const header=await readFile(row.png.path);assert.equal(header.readUInt32BE(16),960);assert.equal(header.readUInt32BE(20),540);actual=await png({instructionId:row.captionId,pngPath:row.png.path,imageMagickPath:input.tools.imageMagickPath});observed.set(row.png.path,actual);}same(actual,row.alpha);bounds({element:row.element,canvas:d.plan.canvas,profileId,observation:actual});
   for(const line of row.calibration?.lines??[])await verify(line.file);}
  same(v.compositorArguments,compositeArgs(composite(input,d,r.rows,bg.output.path,v.video.path)));
  same(await inspectOutput(input,v.video.path),v.observation);
 }
 same(c.outputs[0].observation.audio,c.outputs[1].observation.audio);for(const ref of input.receipt.protectedFiles)await verify(ref);await verify(completionRef);
 return {status:'passed',videos:2,frameCountEach:17613,captionCountEach:265,stateCountEach:307,changedBackgroundFrames:82,
  logicalRasterCount:614,physicalRasterCount:observed.size,outlineChoice:null,final1080pQc:'not-run',humanQuality:'not-reviewed'};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const [command,target]=process.argv.slice(2);assert(target);const start=performance.now();
 const result=command==='run'?await renderIntegratedPreviewV001(path.resolve(target)):command==='read'?await readIntegratedPreviewV001(await bind(path.resolve(target))):assert.fail('run | read');
 console.log(JSON.stringify({result,seconds:(performance.now()-start)/1000,parentMaxRssBytes:process.resourceUsage().maxRSS*1024},null,2));
}
