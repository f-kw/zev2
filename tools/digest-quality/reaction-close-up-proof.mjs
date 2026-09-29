/** One local 540p framing proof. Saved overlays and all caption decisions stay immutable. */
import assert from 'node:assert/strict';
import {mkdir,readFile,realpath} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {canonicalSha256 as hash} from './clock.mjs';
import {bindDigestStructureFileV001 as bind,verifyDigestStructureFileV001 as verify,saveDigestStructureFileV001 as save} from './digest-structure-evidence.mjs';
import {readCaptionPaletteDrawingEvidenceV001 as readView,createCaptionPaletteRenderScopeV001 as scopeFor} from './caption-palette-view.mjs';
import {createReactionCloseUpCandidateV001 as create,validateReactionCloseUpCandidateV001 as valid,editReactionCloseUpV001 as edit,resolveReactionCloseUpV001 as resolve,reactionCloseUpFilterV001 as filter} from './reaction-close-up-policy.mjs';
import {buildPresentationDevProxyRangeArgumentsV001 as rangeArgs,buildPresentationDevProxyRangeRecipeV001 as rangeRecipe,assertPresentationDevProxyAlphaBoundsV001 as checkBounds} from '../../evals/clip_composition/presentation_dev_proxy_render_v001.mjs';
import {composePresentationMediaV001 as compose,buildPresentationCompositeArgumentsV001 as compositeArgs,runPresentationRendererChildProcessV001 as child} from '../../evals/clip_composition/render_presentation_v002.mjs';
import {inspectRenderedMediaWithToolsV001 as inspectMedia,inspectOverlayPngWithToolV001 as inspectPng} from '../../evals/clip_composition/presentation_renderer_qc_v002.mjs';
import {inspectOrchestrationEncodedAudioV001 as inspectAudio} from '../../evals/clip_composition/presentation_orchestration_background_v001.mjs';
import {assertIgnoredPresentationOutputDirectoryV001 as guardOutput} from '../../evals/clip_composition/presentation_output_directory_v001.mjs';
import {verifyEditedOrchestrationDrawingRulesRefV001 as verifyRules} from '../../evals/clip_composition/presentation_orchestration_edited_render_v001.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const base=path.join(root,'runtime/artifacts'),old=path.join(base,'digest-structure-20260929-v001'),palette=path.join(base,'caption-palette-20260929-v001');
const json=async p=>JSON.parse(await readFile(p,'utf8'));
const same=(a,b)=>assert.deepEqual(a,b);
const window={startFrame:9708,endFrameExclusive:9918};
const own=['reaction-close-up-policy.mjs','reaction-close-up-proof.mjs'];
const run=async(tool,args)=>child(tool,args,{});
const capture=async(tool,args)=>(await run(tool,args)).stdout.toString('utf8');
async function pcm(file,tools,af){return (await capture(tools.ffmpegPath,['-v','error','-i',file,'-map','0:a:0','-vn',...(af?['-af',af]:[]),'-c:a','pcm_f32le','-f','hash','-hash','sha256','-'])).trim();}
async function clock(file,tools){const v=JSON.parse(await capture(tools.ffprobePath,['-v','error','-select_streams','v:0','-show_frames','-show_streams','-show_entries','stream=time_base:frame=best_effort_timestamp','-of','json',file]));assert.equal(v.frames.length,210);const [n,d]=v.streams[0].time_base.split('/').map(BigInt);v.frames.forEach((f,i)=>assert.equal(BigInt(f.best_effort_timestamp)*n*30n,BigInt(i)*d));return hash(v);}
async function frameHashes(file,tools){const text=await capture(tools.ffmpegPath,['-v','error','-i',file,'-map','0:v:0','-an','-pix_fmt','yuv420p','-f','framemd5','-']);return text.split('\n').filter(l=>l&&!l.startsWith('#')).map(l=>l.split(',').at(-1).trim());}
async function inputs(){
 const evidenceRef=await bind(path.join(palette,'drawing-evidence.json')),view=await readView({evidenceRef});
 const priorRef=await bind(path.join(old,'candidate/completion.json')),prior=await json(priorRef.path),job=await json(path.join(palette,'job.json'));
 await verify(job.evidenceRef);same(job.evidenceRef,evidenceRef);await verify(prior.outputVideo);await verify(prior.baseProxyManifestRef);
 const manifest=await json(prior.baseProxyManifestRef.path),source=await bind(path.join(old,'background/background-proxy.nut'));
 assert.equal(source.fileSha256,'9b310ba3533890aab5c9f84ba242cbd4785f29825da1f16972e6a1483e987bdb');
 same(manifest.sourceClock.projectionSha256,view.projection.projectionSha256);
 const span=view.projection.retainedSpans.find(s=>s.segmentId==='segment-0003');assert(span);
 const scope=scopeFor(view,window),candidate=create({sourceViewSha256:view.viewSha256,sourceMediaSha256:source.fileSha256,
  mainRange:{startFrame:span.displayStartFrame,endFrameExclusive:span.displayEndFrameExclusive},window,
  interval:{startFrame:9771,endFrameExclusive:9853},reason:'本編2の既存字幕000119「うわあああああ」に合わせた明示的技術見本。右下の固定配信位置を4フレームで確認。表情の自動検出ではない。'});
 const states=scope.resolvedPlan.elements.map(e=>{const rows=prior.stateRecords.filter(s=>s.captionId===e.instructionId);assert.equal(rows.length,1,'proof only reuses observed static states');same(rows[0].element,e);assert.equal(rows[0].state,'static');return rows[0];});
 assert.equal(states.length,6);assert(states.some(s=>s.captionId.endsWith('000119')));
 for(const s of states){await verify(s.png);checkBounds({element:s.element,canvas:scope.resolvedPlan.canvas,profileId:prior.profileId,observation:s.alphaObservation});}
 await verifyRules(prior.implementation.originalRules);
 for(const ref of prior.implementation.developmentImplementation)await verify(ref);
 const implementation=await Promise.all([...own.map(p=>path.join(root,'tools/digest-quality',p)),process.execPath,...Object.values(job.tools).map(p=>p)].map(async p=>bind(await realpath(p))));
 return {evidenceRef,view,priorRef,prior,source,manifest,scope,candidate,states,tools:job.tools,implementation};
}
function composition(input,background,audio,video){return {baseMediaPath:background,plan:input.scope.resolvedPlan,overlayRecords:input.states.map(s=>({element:s.element,pngPath:s.png.path})),expectedFrameCount:210,outputPath:video,ffmpegPath:input.tools.ffmpegPath,serializePngAndFilters:true,audioMediaPath:audio,renderRange:input.scope.renderRange};}
async function observe(file,input,recipe){const media=await inspectMedia(file,input.tools);same(media.video,{codecName:'h264',width:960,height:540,fps:30,frameCount:210});return {media,clock:await clock(file,input.tools),audio:await inspectAudio({audioPath:file,logicalSampleCount:recipe.logicalSampleCount,sampleRate:recipe.sampleRate,...input.tools})};}
export async function runReactionProofV001(destination){
 guardOutput({repositoryRoot:root,outputDirectory:destination});
 assert(destination.startsWith(path.join(base,'reaction-close-up-20260929-v001')+path.sep),'explicit local proof area only');
 await mkdir(destination);const started=performance.now(),startedAt=new Date().toISOString();
 try{
  const input=await inputs(),{tools,candidate}=input;await save(path.join(destination,'candidate.json'),candidate);
  const recipe=rangeRecipe({sourceClock:input.manifest.sourceClock,scope:input.scope.scope});
  const background=path.join(destination,'source-range.nut'),audio=path.join(destination,'audio.m4a');
  const cut=rangeArgs({sourcePath:input.source.path,outputPath:background,recipe});await run(tools.ffmpegPath,cut);
  const sourcePcm=await pcm(input.source.path,tools,recipe.audioFilter);assert.equal(await pcm(background,tools),sourcePcm);await clock(background,tools);
  const audioArgs=['-hide_banner','-nostdin','-v','error','-n','-i',background,'-map','0:a:0','-vn','-af',`asettb=expr=1/${recipe.sampleRate},asetpts=N`,'-c:a','aac','-b:a','192k','-ar',String(recipe.sampleRate),'-ac','2','-movie_timescale','30','-movflags','+faststart','-map_metadata','-1','-f','mp4',audio];
  await run(tools.ffmpegPath,audioArgs);
  const initial=edit(candidate,null,'reaction-close-up'),normal=edit(candidate,initial,'Normal'),reset=edit(candidate,normal,'Reset');
  const rows=[];for(const [name,state] of Object.entries({candidate:initial,normal,reset})){
   const begin=performance.now(),stateRef=await save(path.join(destination,name+'-state.json'),state),saved=await json(stateRef.path);same(saved,state);
   const cropped=path.join(destination,name+'-background.nut'),video=path.join(destination,name+'.mp4');
   const cropArgs=['-hide_banner','-nostdin','-v','error','-n','-i',background,'-filter_complex',filter(candidate,saved),'-map','[v]','-map','0:a:0','-c:v','ffv1','-level','3','-pix_fmt','yuv420p','-c:a','copy','-map_metadata','-1','-f','nut',cropped];
   assert.notEqual(cropped,background,'input and output must differ');
   await run(tools.ffmpegPath,cropArgs);assert.equal(await pcm(cropped,tools),sourcePcm);await clock(cropped,tools);
   const args=composition(input,cropped,audio,video);await compose(args);
   rows.push({name,stateRef,resolved:resolve(candidate,saved),background:await bind(cropped),video:await bind(video),cropArgs,compositorArguments:compositeArgs(args),observation:await observe(video,input,recipe),seconds:(performance.now()-begin)/1000});
  }
  assert.equal(rows[0].video.fileSha256,rows[2].video.fileSha256,'Reset must regenerate the candidate byte for byte');
  rows.forEach(r=>same(r.observation.audio,rows[0].observation.audio));
  const normalHashes=await frameHashes(rows[1].background.path,tools),closeHashes=await frameHashes(rows[0].background.path,tools);
  same(normalHashes,await frameHashes(background,tools));assert.equal(normalHashes.length,210);
  const changed=closeHashes.flatMap((v,i)=>v===normalHashes[i]?[]:[i]);same(changed,Array.from({length:82},(_,i)=>i+63));
  const receipt={schemaVersion:'reaction-close-up-proof-v001',status:'local-technical-proof-ready',startedAt,endedAt:new Date().toISOString(),seconds:(performance.now()-started)/1000,
   candidateRef:await bind(path.join(destination,'candidate.json')),evidenceRef:input.evidenceRef,priorRef:input.priorRef,source:input.source,implementation:input.implementation,
   scope:input.scope.scope,sourcePlanSha256:hash(input.scope.resolvedPlan),states:input.states,recipe,rangeArguments:cut,audioArguments:audioArgs,sourcePcm,
   normalBackground:await bind(background),audio:await bind(audio),rows,backgroundFrameChecks:{frameCount:210,changedFrames:changed,normalSha256:hash(normalHashes),candidateSha256:hash(closeHashes)},
   productionDefaultChanged:false,humanQuality:'not-evaluated',finalPixelQc:'not-run-local-540p-proof'};
  for(const r of input.implementation)await verify(r);await verify(input.prior.outputVideo);await verify(input.source);
  return save(path.join(destination,'completion.json'),receipt);
 }catch(e){await save(path.join(destination,'failure.json'),{status:'incomplete',message:e.message,stack:e.stack,startedAt,endedAt:new Date().toISOString()});throw e;}
}
export async function readReactionProofV001(completionRef){
 await verify(completionRef);const c=await json(completionRef.path);assert.equal(c.schemaVersion,'reaction-close-up-proof-v001');assert.equal(c.status,'local-technical-proof-ready');
 const input=await inputs();same(c.evidenceRef,input.evidenceRef);same(c.priorRef,input.priorRef);same(c.source,input.source);same(c.implementation,input.implementation);
 for(const ref of c.implementation)await verify(ref);await verify(c.candidateRef);const candidate=await json(c.candidateRef.path);valid(candidate);same(candidate,input.candidate);
 same(c.scope,input.scope.scope);assert.equal(c.sourcePlanSha256,hash(input.scope.resolvedPlan));same(c.states,input.states);same(c.recipe,rangeRecipe({sourceClock:input.manifest.sourceClock,scope:input.scope.scope}));
 for(const s of c.states){await verify(s.png);same(checkBounds({element:s.element,canvas:input.scope.resolvedPlan.canvas,profileId:input.prior.profileId,observation:await inspectPng({instructionId:s.captionId,pngPath:s.png.path,...input.tools})}),s.alphaObservation);}
 await verify(c.normalBackground);await verify(c.audio);assert.equal(await pcm(input.source.path,input.tools,c.recipe.audioFilter),c.sourcePcm);assert.equal(await pcm(c.normalBackground.path,input.tools),c.sourcePcm);
 same(c.rangeArguments,rangeArgs({sourcePath:input.source.path,outputPath:c.normalBackground.path,recipe:c.recipe}));
 same(c.rows.map(r=>r.name),['candidate','normal','reset']);
 let state=null;for(const [i,row] of c.rows.entries()){
  await verify(row.stateRef);const saved=await json(row.stateRef.path);state=edit(candidate,state,['reaction-close-up','Normal','Reset'][i]);same(saved,state);same(row.resolved,resolve(candidate,saved));
  assert.notEqual(row.background.path,c.normalBackground.path);
  same(row.cropArgs,['-hide_banner','-nostdin','-v','error','-n','-i',c.normalBackground.path,'-filter_complex',filter(candidate,saved),'-map','[v]','-map','0:a:0','-c:v','ffv1','-level','3','-pix_fmt','yuv420p','-c:a','copy','-map_metadata','-1','-f','nut',row.background.path]);
  await verify(row.background);await verify(row.video);same(row.compositorArguments,compositeArgs(composition(input,row.background.path,c.audio.path,row.video.path)));
  same(await observe(row.video.path,input,c.recipe),row.observation);assert.equal(await pcm(row.background.path,input.tools),c.sourcePcm);await clock(row.background.path,input.tools);
 }
 same(c.rows[0].observation.audio,c.rows[1].observation.audio);same(c.rows[0].observation.audio,c.rows[2].observation.audio);assert.equal(c.rows[0].video.fileSha256,c.rows[2].video.fileSha256);
 const nh=await frameHashes(c.rows[1].background.path,input.tools),ch=await frameHashes(c.rows[0].background.path,input.tools);same(nh,await frameHashes(c.normalBackground.path,input.tools));same(c.backgroundFrameChecks,{frameCount:210,changedFrames:ch.flatMap((v,i)=>v===nh[i]?[]:[i]),normalSha256:hash(nh),candidateSha256:hash(ch)});
 same(c.backgroundFrameChecks.changedFrames,Array.from({length:82},(_,i)=>i+63));await verify(completionRef);
 return {status:'passed',completionRef,frameCount:210,changedBackgroundFrames:82,unchangedBackgroundFrames:128,unchangedCaptionPngs:6,resetByteIdentical:true,audioClockIdentical:true,sourcePlanSha256:c.sourcePlanSha256,humanQuality:'not-evaluated',finalPixelQc:'not-run-local-540p-proof'};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const [command,target]=process.argv.slice(2);assert(target);const start=performance.now();
 const result=command==='run'?await runReactionProofV001(path.resolve(target)):command==='read'?await readReactionProofV001(await bind(path.resolve(target))):assert.fail('run <new-directory> | read <completion.json>');
 console.log(JSON.stringify({result,seconds:(performance.now()-start)/1000,parentMaxRssBytes:process.resourceUsage().maxRSS*1024},null,2));
}
