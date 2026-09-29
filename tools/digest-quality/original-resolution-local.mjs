/** Fixed seven-second original-resolution integration. Native QC is a separate required stage. */
import assert from 'node:assert/strict';
import {mkdir,readFile,realpath,statfs,appendFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {canonicalSha256 as hash} from './clock.mjs';
import {bindDigestStructureFileV001 as bind,verifyDigestStructureFileV001 as verify,saveDigestStructureFileV001 as save} from './digest-structure-evidence.mjs';
import {readCaptionPaletteDrawingEvidenceV001 as readPalette} from './caption-palette-view.mjs';
import {validateIntegrationDraftV001 as valid,editIntegrationPreviewV001 as edit,resolveIntegrationPreviewV001 as resolve} from './integration-preparation.mjs';
import {scopeOrchestrationPlanV001 as scope} from '../../evals/clip_composition/presentation_orchestration_render_scope_v001.mjs';
import {derivePresentationDevProxyStructureRecipeV001 as sourceRecipe} from '../../evals/clip_composition/presentation_dev_proxy_structure_background_v001.mjs';
import {buildPresentationRendererOverlayAdapterV001 as adapter,composePresentationMediaV001 as compose,buildPresentationCompositeArgumentsV001 as compositeArgs,runPresentationRendererChildProcessV001 as child} from '../../evals/clip_composition/render_presentation_v002.mjs';
import {createPresentationOverlayRenderSessionV001 as overlaySession} from '../../evals/clip_composition/presentation_overlay_render_session_v001.mjs';
import {createPresentationRendererProcessObserverV001 as observer} from '../../evals/clip_composition/presentation_renderer_process_observation_v001.mjs';
import {inspectRenderedMediaWithToolsV001 as media,inspectOverlayPngWithToolV001 as png} from '../../evals/clip_composition/presentation_renderer_qc_v002.mjs';
import {inspectOrchestrationEncodedAudioV001 as audio} from '../../evals/clip_composition/presentation_orchestration_background_v001.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..'),ev=path.join(root,'evals/clip_composition');
const area=path.join(root,'runtime/artifacts/original-resolution-connection-20260930-v001');
const inventoryPath=path.join(root,'docs/reports/integrated-preview-20260930/final-output-inputs.json');
const json=async p=>JSON.parse(await readFile(p,'utf8')),same=assert.deepEqual;
export const ORIGINAL_LOCAL_RANGE=Object.freeze({startFrame:9708,endFrameExclusive:9918,fullFrameCount:17613});
const range=ORIGINAL_LOCAL_RANGE;
const space=async()=>{const s=await statfs(root);return {at:new Date().toISOString(),availableBytes:s.bavail*s.bsize};};

/** Preserve the saved global-even source frame extraction and continuous-origin audio decode. */
export function originalLocalRecipeV001({inventory,draft,inspection,baseManifest}) {
 valid(draft);same(range,draft.input.reaction.window.fullFrameCount?draft.input.reaction.window:{...draft.input.reaction.window,fullFrameCount:draft.input.frameCount});
 const full=sourceRecipe({sourceRef:inventory.source,inspection,segments:baseManifest.segments,profileId:'dev-proxy-540p-v001'});
 const span=draft.input.projection.retainedSpans.find(s=>s.displayStartFrame<=range.startFrame&&s.displayEndFrameExclusive>=range.endFrameExclusive);assert(span,'local range must fit one retained source span');
 const segment=baseManifest.segments.find(s=>s.segmentId===span.segmentId);assert(segment);same(segment,inventory.sourceRanges.find(s=>s.segmentId===span.segmentId));
 assert.equal(span.sourceStartFrame,segment.outputStartFrame);assert.equal(span.sourceEndFrameExclusive,segment.outputEndFrame);
 const first=segment.sourceStartFrame30+range.startFrame-span.displayStartFrame,end=first+210;
 const clock=full.sourceFrameClock,step=clock.ptsStep*2,startPts=first*step,endPts=end*step;
 const frameSourceMap=Array.from({length:210},(_,i)=>({displayFrame:range.startFrame+i,baseFrame:range.startFrame+i-span.shiftFrames,sourceFrame30:first+i,sourceFrame60:(first+i)*2,sourcePts:(first+i)*step}));
 const sampleStart=segment.audioSamples.sourceStart+(range.startFrame-span.displayStartFrame)*1470;
 assert.equal(sampleStart,first*1470);assert(end<=segment.sourceEndFrame30);
 const viewport=draft.input.reaction.viewport,canvas=draft.input.plan.canvas;
 const crop={left:viewport[0]*canvas.width,top:viewport[1]*canvas.height,width:(viewport[2]-viewport[0])*canvas.width,height:(viewport[3]-viewport[1])*canvas.height};
 Object.values(crop).forEach(v=>assert(Number.isSafeInteger(v)));same(crop,{left:320,top:180,width:1600,height:900});
 return {range,segmentId:span.segmentId,shiftFrames:span.shiftFrames,frameSourceMap,sourceFrame30:{start:first,end},
  sampleRate:44100,sourceSamples:{start:sampleStart,end:sampleStart+210*1470},logicalSampleCount:210*1470,
  seekSeconds:Math.floor(first/30),boundedEndSeconds:Math.ceil(end/30),
  videoFilter:`select='gte(pts,${startPts})*lt(pts,${endPts})*not(mod(pts-${clock.firstPts},${step}))',setpts=N/(30*TB),fps=30,setpts=N/(30*TB)`,
  audioFilter:`atrim=start_pts=${sampleStart}:end_pts=${sampleStart+210*1470},asettb=expr=1/44100,asetpts=N`,
  crop,closeStart:draft.input.reaction.interval.startFrame-range.startFrame,closeEnd:draft.input.reaction.interval.endFrameExclusive-range.startFrame,
  sourceExtraction:full.sourceFrameClock.extraction,audioDecode:full.audioDecode};
}
export async function originalLocalInputsV001() {
 const inventoryRef=await bind(inventoryPath),inventory=await json(inventoryPath);
 for(const ref of [inventory.source,inventory.sourceInspection,inventory.captionPreparation,...inventory.savedInputs,...inventory.entryPoints])await verify(ref);
 const draft=await json(inventory.captionPreparation.path);valid(draft);
 const palette=await readPalette({evidenceRef:draft.input.refs.palette});same(palette.resolvedPlan,draft.input.plan);same(palette.projection,draft.input.projection);
 const base=await json(inventory.savedInputs.find(r=>r.path.endsWith('/base-manifest.json')).path),inspection=await json(inventory.sourceInspection.path);
 const recipe=originalLocalRecipeV001({inventory,draft,inspection,baseManifest:base});
 const selection=edit(draft,null,{outline:'A',framing:'Reset'}),resolved=resolve(draft,selection),plan=scope(resolved.plan,range);
 const ids=new Set(plan.elements.map(e=>e.instructionId)),states=resolved.states.filter(s=>ids.has(s.captionId));assert.equal(ids.size,6);assert.equal(states.length,6);states.forEach(s=>assert.equal(s.state,'static'));
 const job=await json(draft.input.refs.paletteJob.path),prior=await json(draft.input.refs.structure.path),reaction=await json(draft.input.refs.reaction.path);
 for(const ref of Object.values(draft.input.refs))await verify(ref);for(const ref of draft.input.implementation)await verify(ref);
 const tools={...job.tools,layoutInspectorPath:path.join(ev,'inspect_presentation_render_layout_v001.ts')};
 const build=adapter({...tools,processObserver:{run(){throw Error('props only');}}}).buildProps;
 const rows=states.map(s=>{let props=build(s.element,plan,prior.registry),calibration=null;
  if(s.element.visualState.background){const old=prior.stateRecords.find(r=>r.captionId===s.captionId&&r.state===s.state);assert(old?.calibration);const plain=structuredClone(old.props);delete plain.renderVisibleCenterCorrectionPx;same(props,plain);props=structuredClone(old.props);calibration=old.calibration;}return {...s,props,calibration};});
 const implementation=await Promise.all([fileURLToPath(import.meta.url),process.execPath,...Object.values(tools),...inventory.entryPoints.map(r=>r.path)].map(async p=>bind(await realpath(p))));
 await verify(reaction.audio);await verify(reaction.normalBackground);
 return {inventoryRef,inventory,draft,recipe,selection,plan,rows,tools,implementation,registry:prior.registry,palette,reaction};
}
export function originalSourceArgumentsV001(i,output) {const r=i.recipe;assert.notEqual(output,i.inventory.source.path);return ['-hide_banner','-nostdin','-v','error','-n','-copyts','-ss',String(r.seekSeconds),'-t',String(r.boundedEndSeconds-r.seekSeconds),'-i',i.inventory.source.path,'-t',String(r.boundedEndSeconds),'-i',i.inventory.source.path,'-map','0:v:0','-map','1:a:0','-vf',r.videoFilter,'-af',r.audioFilter,'-c:v','ffv1','-level','3','-pix_fmt','yuv420p','-fps_mode','passthrough','-c:a','pcm_f32le','-ar','44100','-ac','2','-map_metadata','-1','-f','nut',output];}
function closeArgs(i,source,output){const r=i.recipe,c=r.crop;const f=`[0:v]split=3[a][b][c];[a]trim=end_frame=${r.closeStart},setpts=PTS-STARTPTS[pre];[b]trim=start_frame=${r.closeStart}:end_frame=${r.closeEnd},setpts=PTS-STARTPTS,crop=${c.width}:${c.height}:${c.left}:${c.top}:exact=1,scale=1920:1080:flags=lanczos,setsar=1[zoom];[c]trim=start_frame=${r.closeEnd}:end_frame=210,setpts=PTS-STARTPTS[post];[pre][zoom][post]concat=n=3:v=1:a=0[v]`;
 return ['-hide_banner','-nostdin','-v','error','-n','-i',source,'-filter_complex',f,'-map','[v]','-map','0:a:0','-c:v','ffv1','-level','3','-pix_fmt','yuv420p','-c:a','copy','-map_metadata','-1','-f','nut',output];}
const run=(t,a,o,label)=>child(t,a,{...(o?{processObserver:o,observationLabel:label}:{})});
const capture=async(t,a,o,label)=>(await run(t,a,o,label)).stdout.toString('utf8');
async function frameHashes(file,t,o){const s=await capture(t.ffmpegPath,['-v','error','-i',file,'-map','0:v:0','-an','-pix_fmt','yuv420p','-f','framemd5','-'],o,'local-frame-hash');return s.split('\n').filter(s=>s&&!s.startsWith('#')).map(s=>s.split(',').at(-1).trim());}
async function sourceFrameHashes(i,o){const r=i.recipe,s=await capture(i.tools.ffmpegPath,['-v','error','-copyts','-ss',String(r.seekSeconds),'-t',String(r.boundedEndSeconds-r.seekSeconds),'-i',i.inventory.source.path,'-map','0:v:0','-an','-vf',r.videoFilter,'-pix_fmt','yuv420p','-f','framemd5','-'],o,'original-source-independent-frames');return s.split('\n').filter(s=>s&&!s.startsWith('#')).map(s=>s.split(',').at(-1).trim());}
async function pcm(file,t,o){return (await capture(t.ffmpegPath,['-v','error','-i',file,'-map','0:a:0','-vn','-c:a','pcm_f32le','-f','hash','-hash','sha256','-'],o,'local-pcm')).trim();}
async function timing(file,t,o){const s=JSON.parse(await capture(t.ffprobePath,['-v','error','-select_streams','v:0','-show_streams','-show_frames','-show_entries','stream=time_base:frame=best_effort_timestamp','-of','json',file],o,'local-clock'));assert.equal(s.frames.length,210);const[n,d]=s.streams[0].time_base.split('/').map(BigInt);s.frames.forEach((f,k)=>assert.equal(BigInt(f.best_effort_timestamp)*n*30n,BigInt(k)*d));return {frames:210,ptsSha256:hash(s)};}
function bounds(plan,a){assert(a.alphaMax>0);const b=a.alphaBounds,s=plan.canvas.safeAreaPx;assert(b&&b.left>=s.left&&b.top>=s.top&&b.right<=plan.canvas.width-s.right&&b.bottom<=plan.canvas.height-s.bottom,'actual alpha exceeds unchanged safe area');}
function options(i,rows,bg,output,o){return {baseMediaPath:bg,plan:i.plan,overlayRecords:rows.map(r=>({element:r.element,pngPath:r.png.path})),audioMediaPath:i.reaction.audio.path,renderRange:range,expectedFrameCount:210,serializePngAndFilters:true,outputPath:output,ffmpegPath:i.tools.ffmpegPath,...(o?{processObserver:o}:{})};}
export async function runOriginalLocalV001(destination,reuseDirectory=null){assert(path.resolve(destination).startsWith(area+path.sep));await mkdir(destination);const start=performance.now(),startedAt=new Date().toISOString(),o=observer({observationDirectory:path.join(destination,'processes')}),spaces=[await space()],times={};let session;
 const log=async phase=>{console.log(phase);await appendFile(path.join(destination,'progress.jsonl'),JSON.stringify({phase,at:new Date().toISOString()})+'\n');};
 try{const i=await originalLocalInputsV001();const inputRef=await save(path.join(destination,'inputs.json'),{inventoryRef:i.inventoryRef,recipe:i.recipe,selection:i.selection,plan:i.plan,rows:i.rows,implementation:i.implementation,outlineChoice:null});
  let reuse=null;if(reuseDirectory){assert(path.resolve(reuseDirectory).startsWith(area+path.sep));const p=path.resolve(reuseDirectory),old=await json(path.join(p,'inputs.json'));
   const {implementation:oldImpl,...oldInputs}=old,{implementation:newImpl,...newInputs}=await json(inputRef.path);same(oldInputs,newInputs);
   const snapshot=await bind(path.join(p,'execution-source.mjs'));same(snapshot.fileSha256,oldImpl[0].fileSha256);for(const r of oldImpl.slice(1))await verify(r);
   const source=await bind(path.join(p,'source.nut')),closed=await bind(path.join(p,'close.nut'));same((await json(path.join(p,'failure.json'))).status,'incomplete');
   reuse={input:await bind(path.join(p,'inputs.json')),snapshot,source,closed,reason:'TSX IPC sandbox denied after verified source/background; native QC not run'};
  }
  await log('source-background');spaces.push(await space());const bg=reuse?.source.path??path.join(destination,'source.nut'),bs=performance.now(),sourceArgs=originalSourceArgumentsV001(i,bg);if(!reuse)await run(i.tools.ffmpegPath,sourceArgs,o,'original-local-source');times.sourceSeconds=reuse?null:(performance.now()-bs)/1000;
  same(await pcm(bg,i.tools,o),await pcm(i.reaction.normalBackground.path,i.tools,o),'source-origin PCM differs from preserved local input');await timing(bg,i.tools,o);
  const closed=reuse?.closed.path??path.join(destination,'close.nut'),cropArguments=closeArgs(i,bg,closed);if(!reuse)await run(i.tools.ffmpegPath,cropArguments,o,'original-local-close');
  const old=await frameHashes(bg,i.tools,o),now=await frameHashes(closed,i.tools,o);same(old,await sourceFrameHashes(i,o),'original source pixels differ');same(now.flatMap((h,k)=>h===old[k]?[]:[k]),Array.from({length:82},(_,k)=>63+k));same(await pcm(bg,i.tools,o),await pcm(closed,i.tools,o));await timing(closed,i.tools,o);
  await log('original-caption-raster');const ls=performance.now();const layoutIn=path.join(destination,'layout-input.json'),layoutOut=path.join(destination,'layout-output.json');await save(layoutIn,{canvas:i.plan.canvas,overlays:i.rows.map(r=>r.props)});await child(i.tools.tsxPath,[i.tools.layoutInspectorPath,layoutIn,layoutOut],{processObserver:o,observationLabel:'original-layout',env:{NODE_PATH:path.join(root,'runner/node_modules')}});const layout=await json(layoutOut);same(layout.status,'passed');same(layout.violations,[]);
  await mkdir(path.join(destination,'overlays'));session=overlaySession({repositoryRoot:root,entryPoint:path.join(ev,'presentation_renderer_entry_v001.tsx'),publicDir:path.join(root,'runner/public'),...i.tools,processObserver:o});const rows=[];
  for(const [n,r]of i.rows.entries()){const output=path.join(destination,'overlays',n+'.png');await session.render(r.props,output);const observed=await png({instructionId:r.captionId,pngPath:output,...i.tools,processObserver:o});bounds(i.plan,observed);rows.push({...r,png:await bind(output),alpha:observed});}times.rasterSeconds=(performance.now()-ls)/1000;
  spaces.push(await space());await log('local-body-and-replay');const videos=[];
  for(const series of ['normal','repeat']){let renderedRows=rows;
   if(series==='repeat'){renderedRows=[];for(const[n,r]of rows.entries()){const output=path.join(destination,'overlays',n+'-repeat.png');await session.render(r.props,output,{series:'repeat'});const ref=await bind(output);same(ref.fileSha256,r.png.fileSha256);renderedRows.push({...r,png:ref});}}
   const output=path.join(destination,series+'.mp4'),args=options(i,renderedRows,closed,output,o),begin=performance.now();await compose(args);const observation=await media(output,{...i.tools,processObserver:o});same(observation.video,{codecName:'h264',width:1920,height:1080,fps:30,frameCount:210});const clock=await timing(output,i.tools,o),sound=await audio({audioPath:output,logicalSampleCount:308700,sampleRate:44100,...i.tools});same(sound,await audio({audioPath:i.reaction.audio.path,logicalSampleCount:308700,sampleRate:44100,...i.tools}));videos.push({series,video:await bind(output),rows:renderedRows,command:compositeArgs(args),observation,clock,audio:sound,seconds:(performance.now()-begin)/1000});}
  await session.close();session=null;same(videos[0].video.fileSha256,videos[1].video.fileSha256);for(const r of i.implementation)await verify(r);await verify(i.inventory.source);spaces.push(await space());
  return save(path.join(destination,'completion.json'),{schemaVersion:'original-resolution-local-v001',status:'media-verified-native-qc-pending',inputRef,rows,videos,reuse,source:await bind(bg),closed:await bind(closed),sourceArguments:sourceArgs,cropArguments,layoutRef:await bind(layoutOut),frameChecks:{normal:hash(old),closed:hash(now),changedFrames:82,sourcePcm:await pcm(bg,i.tools,o)},startedAt,endedAt:new Date().toISOString(),seconds:(performance.now()-start)/1000,times,spaces,processTimings:o.getPerformance(),nativeQc:'not-executed',outlineChoice:null,humanQuality:'not-reviewed'});
 }catch(e){await save(path.join(destination,'failure.json'),{status:'incomplete',message:e.message,stack:e.stack,startedAt,times,spaces});throw e;}finally{await session?.close();}}
export async function readOriginalLocalV001(file){const ref=await bind(file),c=await json(file);same(c.schemaVersion,'original-resolution-local-v001');same(c.status,'media-verified-native-qc-pending');same(c.nativeQc,'not-executed');same(c.outlineChoice,null);same(c.humanQuality,'not-reviewed');await verify(c.inputRef);const saved=await json(c.inputRef.path),i=await originalLocalInputsV001();same(saved,{inventoryRef:i.inventoryRef,recipe:i.recipe,selection:i.selection,plan:i.plan,rows:i.rows,implementation:i.implementation,outlineChoice:null});
 for(const r of [c.source,c.closed,c.layoutRef])await verify(r);same(c.sourceArguments,originalSourceArgumentsV001(i,c.source.path));same(c.cropArguments,closeArgs(i,c.source.path,c.closed.path));same((await json(c.layoutRef.path)).violations,[]);same(c.videos.map(v=>v.series),['normal','repeat']);
 if(c.reuse){for(const r of [c.reuse.input,c.reuse.snapshot,c.reuse.source,c.reuse.closed])await verify(r);same(c.reuse.snapshot.fileSha256,(await json(c.reuse.input.path)).implementation[0].fileSha256);same(c.source,c.reuse.source);same(c.closed,c.reuse.closed);}
 const old=await frameHashes(c.source.path,i.tools),now=await frameHashes(c.closed.path,i.tools);same(old,await sourceFrameHashes(i));same(now.flatMap((h,k)=>h===old[k]?[]:[k]),Array.from({length:82},(_,k)=>63+k));same(c.frameChecks,{normal:hash(old),closed:hash(now),changedFrames:82,sourcePcm:await pcm(c.source.path,i.tools)});same(c.frameChecks.sourcePcm,await pcm(i.reaction.normalBackground.path,i.tools));same(c.frameChecks.sourcePcm,await pcm(c.closed.path,i.tools));
 for(const v of c.videos){await verify(v.video);same(v.rows.length,i.rows.length);for(const [n,r]of v.rows.entries()){const {png:ref,alpha,...rest}=r;same(rest,i.rows[n]);await verify(ref);const bytes=await readFile(ref.path);same([bytes.readUInt32BE(16),bytes.readUInt32BE(20)],[1920,1080]);same(alpha,await png({instructionId:r.captionId,pngPath:ref.path,...i.tools}));bounds(i.plan,alpha);}same(v.command,compositeArgs(options(i,v.rows,c.closed.path,v.video.path)));same(v.observation,await media(v.video.path,i.tools));same(v.clock,await timing(v.video.path,i.tools));same(v.audio,await audio({audioPath:v.video.path,logicalSampleCount:308700,sampleRate:44100,...i.tools}));}
 same(c.videos[0].video.fileSha256,c.videos[1].video.fileSha256);await verify(ref);return {status:'media-evidence-verified-native-qc-pending',frames:210,captions:6,changedBackgroundFrames:82,replayByteIdentical:true,outlineChoice:null};}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){const [cmd,target,reuse]=process.argv.slice(2);const result=cmd==='run'?await runOriginalLocalV001(path.resolve(target),reuse??null):cmd==='read'?await readOriginalLocalV001(path.resolve(target)):assert.fail('run/read');console.log(JSON.stringify(result,null,2));}
