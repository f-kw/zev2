/** Saved-material local evidence only. No product defaults, new inference or frozen reader bypass. */
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir,realpath} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {createReadStream} from 'node:fs';
import {execFileSync} from 'node:child_process';
import path from 'node:path';
import {canonicalSha256} from '../../../tools/digest-quality/clock.mjs';
import {buildCaptionReadabilityPlanV001,restoreCaptionReadabilityPlanV001,captionReadabilityMeasurementContextSha256V001} from '../../../tools/digest-quality/caption-readability-plan.mjs';
import {measureDigestStructureNewCaptionWidthsV001} from '../../../tools/digest-quality/digest-structure-new-captions.mjs';
import {indexExplicitLinesV001} from '../../../evals/clip_composition/presentation_renderer_text_layout_v001.mjs';
import {frameBoundaryWithVideoOffsetV001,sourceEndFrameBoundaryWithVideoOffsetV001} from '../../../evals/clip_composition/presentation_base_media_timeline_v004.mjs';
import {validatePresentationBaseMediaSegmentPlanV002} from '../../../evals/clip_composition/presentation_base_media_build_v003.mjs';
import {buildPresentationDevProxyStructureBaseV001,readPresentationDevProxyStructureBaseV001} from '../../../evals/clip_composition/presentation_dev_proxy_structure_background_v001.mjs';
import {createPresentationDevProxyOverlaySessionV001} from '../../../evals/clip_composition/presentation_dev_proxy_overlay_session_v001.mjs';
import {assertPresentationDevProxyAlphaBoundsV001} from '../../../evals/clip_composition/presentation_dev_proxy_render_v001.mjs';
import {createPresentationRendererProcessObserverV001} from '../../../evals/clip_composition/presentation_renderer_process_observation_v001.mjs';
import {buildPresentationRendererOverlayAdapterV001,composePresentationMediaV001} from '../../../evals/clip_composition/render_presentation_v002.mjs';
import {inspectOverlayPngWithToolV001,inspectRenderedMediaWithToolsV001} from '../../../evals/clip_composition/presentation_renderer_qc_v002.mjs';
import {inspectOrchestrationEncodedAudioV001} from '../../../evals/clip_composition/presentation_orchestration_background_v001.mjs';
const root=process.cwd(),out=path.join(root,'runtime/artifacts/selection-structure-improvement-20260930-v001'),old=path.join(root,'runtime/artifacts/digest-new-material-20260926-v001');
const json=async f=>JSON.parse(await readFile(f,'utf8')),hash=b=>createHash('sha256').update(b).digest('hex');
const bind=async f=>{const h=createHash('sha256');for await(const chunk of createReadStream(f))h.update(chunk);return {path:path.resolve(f),fileSha256:h.digest('hex')}};
const save=async(f,v)=>{await writeFile(f,JSON.stringify(v,null,2)+'\n',{flag:'wx'});return bind(f)};
const verify=async r=>assert.equal((await bind(path.isAbsolute(r.path)?r.path:path.join(root,r.path))).fileSha256,r.fileSha256,'bound bytes changed');
const seal=b=>({...b,canonicalSha256:canonicalSha256(b)}),clone=structuredClone;
const tools={ffmpegPath:await realpath('/opt/homebrew/bin/ffmpeg'),ffprobePath:await realpath('/opt/homebrew/bin/ffprobe'),imageMagickPath:await realpath('/opt/homebrew/bin/magick'),remotionPath:path.join(root,'runner/node_modules/@remotion/cli/remotion-cli.js'),chromiumPath:path.join(root,'runner/node_modules/.remotion/chrome-headless-shell/mac-arm64/chrome-headless-shell-mac-arm64/chrome-headless-shell')};
const registry=await json(path.join(root,'evals/clip_composition/registries/presentation/normal-landscape-preset-registry-v001/preset-registry.json'));
const inp=await json(path.join(out,'local-input.json')),transcript=await json(path.join(old,'transcript.json')),inspection=await json(path.join(old,'base-attempt-002/source-media-inspection.json'));
const template=await json(path.join(root,'runtime/artifacts/caption-readability-20260928-preview-v005/unsplit-core-plan.json'));
const style=clone(template.elements[0]);style.visualState.textStyle.borderWidthPx=8;style.visualState.textStyle.glowWidthPx=4;
const props=buildPresentationRendererOverlayAdapterV001({...tools,processObserver:{run(){throw Error('props only')}}}).buildProps;
const stage=process.argv[2];const only=process.argv[3];
async function prepared(window){
 const fragments=window.ranges.map(([a,b])=>transcript.segments.filter(s=>a<=s.id&&s.id<=b));
 const m=inspection.media,res=validatePresentationBaseMediaSegmentPlanV002(fragments.map(x=>({sourceStartMs:x[0].startMs,sourceEndMs:x.at(-1).endMs})),{fps:m.fps,decodedFrameCount:m.decodedFrameCount,logicalFrameCount:m.logicalFrameCount,presentationOffsetMs:m.videoClock.presentationOffsetMs},m.audioClock);assert.equal(res.status,'passed');
 const plan={...clone(template),elements:[]},captions=[],measurementRequests=[];
 for(const [i,rows]of fragments.entries()){
  const seg=res.mappings[i],id=window.id+'-'+(i+1),offset=seg.outputStartFrame-seg.sourceStartFrame30;
  const atoms=rows.map(s=>({atomId:'source-'+s.id,text:s.text,startFrame:offset+frameBoundaryWithVideoOffsetV001(s.startMs,m.videoClock.presentationOffsetMs),endFrameExclusive:offset+sourceEndFrameBoundaryWithVideoOffsetV001(s.endMs,{inputFrameRate:'60/1',decodedFrameCount:m.decodedFrameCount,videoPresentationOffsetMs:m.videoClock.presentationOffsetMs}),sourceStartMs:s.startMs,sourceEndMs:s.endMs,timelineSegmentId:seg.segmentId}));
  assert.equal(atoms[0].startFrame,seg.outputStartFrame);assert.equal(atoms.at(-1).endFrameExclusive,seg.outputEndFrame);atoms.forEach((a,j)=>{assert(a.startFrame<=a.endFrameExclusive);assert(!j||a.startFrame>=atoms[j-1].endFrameExclusive)});
  const text=rows.map(s=>s.text).join(''),parent={...clone(style),instructionId:id,text,indexedLines:indexExplicitLinesV001([text]).indexedLines,startFrame:seg.outputStartFrame,endFrameExclusive:seg.outputEndFrame,displayFrameCount:seg.outputEndFrame-seg.outputStartFrame,sourceStartMs:rows[0].startMs,sourceEndMs:rows.at(-1).endMs,timelineSegmentId:seg.segmentId,targetProvenance:{targetRefId:window.id,targetType:'semantic-caption',sourceAtomIds:atoms.map(a=>a.atomId)}};
  plan.elements.push(parent);
  const decision=inp.semanticDecisions.find(s=>s.sourceFragmentRange[0]===rows[0].id&&s.sourceFragmentRange[1]===rows.at(-1).id);
  let parts;if(decision)parts=decision.parts;else{
   const existing=(await json(path.join(root,'runtime/artifacts/caption-readability-20260928-preview-v005/readability-resolution.json'))).normalPlan.elements.filter(e=>e.sourceStartMs>=rows[0].startMs&&e.sourceEndMs<=rows.at(-1).endMs);
   parts=existing.map(e=>e.text);assert.equal(parts.join(''),text,'old caption source coverage differs');
  }
  assert.equal(parts.join(''),text);let chars=0;const ends=new Map([[0,0]]);atoms.forEach((a,j)=>{chars+=[...a.text].length;ends.set(chars,j+1)});let cur=0;
  const boundaries=parts.slice(0,-1).map(part=>{cur+=[...part].length;const at=ends.get(cur);assert(at>0&&at<atoms.length);return {atomEndIndexExclusive:at,frame:atoms[at].startFrame,kind:'semantic',reason:decision?.reason??'既存の保存字幕の意味分割を元動画対応で再利用',required:false}});
  const points=[0,...boundaries.map(b=>b.atomEndIndexExclusive),atoms.length],spans=[];
  for(let a=0;a<points.length;a++)for(let b=a+1;b<points.length;b++){
   const start=points[a],end=points[b],txt=atoms.slice(start,end).map(s=>s.text).join(''),key=id+':'+start+':'+end;
   measurementRequests.push({key,props:props({...parent,text:txt,indexedLines:indexExplicitLinesV001([txt]).indexedLines},plan,registry)});spans.push({key,startAtomIndex:start,endAtomIndexExclusive:end});
  }
  captions.push({captionId:id,atoms,boundaries,spans});
 }
 captions.forEach(c=>c.measurementContextSha256=captionReadabilityMeasurementContextSha256V001(plan,c.captionId));
 return seal({schemaVersion:'selection-improvement-local-prepared-v001',window,normalPlan:plan,captions,measurementRequests,mappings:res.mappings,clockId:canonicalSha256(res),bindings:[await bind(path.join(out,'local-input.json')),await bind(path.join(old,'transcript.json')),await bind(path.join(old,'base-attempt-002/source-media-inspection.json')),await bind(path.join(root,'docs/reports/selection-structure-improvement-20260930/local-verification-v001.mjs'))]});
}
async function fonts(w){
 const dir=path.join(out,'local-'+inp.artifactVersion+'-'+w.id);await mkdir(dir,{recursive:true});const p=await prepared(w);let prior;try{prior=await json(path.join(dir,'prepared.json'))}catch(e){if(e.code!=='ENOENT')throw e}if(prior)assert.deepEqual(p,prior);else await save(path.join(dir,'prepared.json'),p);
 let measured;try{measured=await json(path.join(dir,'font-widths.json'));assert.equal(measured.preparedSha256,p.canonicalSha256);for(const r of measured.refs)await verify(r)}catch(e){if(e.code!=='ENOENT')throw e;measured=await measureDigestStructureNewCaptionWidthsV001({prepared:p,repositoryRoot:root,chromiumPath:tools.chromiumPath});await save(path.join(dir,'font-widths.json'),measured)}if(stage==='measure'){console.log(w.id,'measured',measured.rows.length);return}
 const widths=new Map(measured.rows.map(r=>[r.key,r.fullWidthPx]));const evidence={schemaVersion:'caption-readability-evidence-v001',sourcePlanSha256:canonicalSha256(p.normalPlan),clockId:p.clockId,maxWidthPx:p.normalPlan.canvas.width-p.normalPlan.canvas.safeAreaPx.left-p.normalPlan.canvas.safeAreaPx.right,captions:p.captions.map(c=>({captionId:c.captionId,measurementContextSha256:c.measurementContextSha256,atoms:c.atoms,boundaries:c.boundaries,effect:{kind:'normal'},measurements:c.spans.map(s=>({startAtomIndex:s.startAtomIndex,endAtomIndexExclusive:s.endAtomIndexExclusive,singleLineWidthPx:widths.get(s.key),twoLine:null}))}))};
 const resolution=buildCaptionReadabilityPlanV001({normalPlan:p.normalPlan,evidence});await save(path.join(dir,'readability.json'),{evidence,resolution});console.log(w.id,resolution.summary);
}
async function render(w){
 const dir=path.join(out,'local-'+inp.artifactVersion+'-'+w.id),p=await json(path.join(dir,'prepared.json')),readability=await json(path.join(dir,'readability.json'));assert.deepEqual(p,await prepared(w));const plan=restoreCaptionReadabilityPlanV001({normalPlan:p.normalPlan,...readability,saved:readability.resolution}).normalPlan;
 const base=await buildPresentationDevProxyStructureBaseV001({sourceRef:await bind(path.join(old,'source/source-video.mp4')),sourceInspectionRef:await bind(path.join(old,'base-attempt-002/source-media-inspection.json')),segments:p.mappings,profileId:'dev-proxy-540p-v001',tools,outputDirectory:path.join(dir,'base')});console.log(w.id,'base ready');
 const observer=createPresentationRendererProcessObserverV001({observationDirectory:path.join(dir,'processes')});
 const built=plan.elements.map(e=>props(e,plan,registry));await save(path.join(dir,'layout-input.json'),{canvas:plan.canvas,overlays:built});
 await observer.run(process.execPath,['--import',path.join(root,'runner/node_modules/tsx/dist/loader.mjs'),path.join(root,'evals/clip_composition/inspect_presentation_render_layout_v001.ts'),path.join(dir,'layout-input.json'),path.join(dir,'layout-output.json')],{observationLabel:'local-layout',env:{...process.env,NODE_PATH:path.join(root,'runner/node_modules')}});
 const layout=await json(path.join(dir,'layout-output.json'));assert.equal(layout.status,'passed',JSON.stringify(layout.violations));
 await mkdir(path.join(dir,'overlays'));const session=createPresentationDevProxyOverlaySessionV001({repositoryRoot:root,entryPoint:path.join(root,'evals/clip_composition/presentation_renderer_entry_v001.tsx'),publicDir:path.join(root,'runner/public'),...tools,processObserver:observer,profileId:'dev-proxy-540p-v001'});const records=[],alpha=[];
 try{for(const [i,e]of plan.elements.entries()){
  const pngPath=path.join(dir,'overlays',i+'.png');await session.render(built[i],pngPath);
  alpha.push(assertPresentationDevProxyAlphaBoundsV001({element:e,canvas:plan.canvas,profileId:'dev-proxy-540p-v001',observation:await inspectOverlayPngWithToolV001({instructionId:e.instructionId,pngPath,imageMagickPath:tools.imageMagickPath,processObserver:observer,observationLabelPrefix:'local-alpha'})}));records.push({element:e,pngPath});
 }}finally{await session.close()}
 const count=p.mappings.at(-1).outputEndFrame,audio=path.join(dir,'audio.m4a'),video=path.join(dir,'development-proxy.mp4');
 await observer.run(tools.ffmpegPath,['-hide_banner','-v','error','-n','-i',base.mediaRef.path,'-vn','-c:a','aac','-ar','44100','-ac','2','-movie_timescale','30',audio],{observationLabel:'local-audio'});
 const audioClock=await inspectOrchestrationEncodedAudioV001({audioPath:audio,logicalSampleCount:count*1470,sampleRate:44100,...tools});
 await composePresentationMediaV001({baseMediaPath:base.mediaRef.path,plan:{...plan,canvas:{...plan.canvas,width:960,height:540}},overlayRecords:records,expectedFrameCount:count,outputPath:video,...tools,processObserver:observer,serializePngAndFilters:true,audioMediaPath:audio});
 const media=await inspectRenderedMediaWithToolsV001(video,{...tools,processObserver:observer});assert.deepEqual(media.video,{codecName:'h264',width:960,height:540,fps:30,frameCount:count});
 const outputAudio=await inspectOrchestrationEncodedAudioV001({audioPath:video,logicalSampleCount:count*1470,sampleRate:44100,...tools});assert.equal(outputAudio.packetPayloadSha256,audioClock.packetPayloadSha256);
 const frames=JSON.parse(execFileSync(tools.ffprobePath,['-v','error','-select_streams','v:0','-show_frames','-show_entries','frame=best_effort_timestamp_time','-of','json',video],{encoding:'utf8',maxBuffer:32e6})).frames;assert.equal(frames.length,count);frames.forEach((f,i)=>assert(Math.abs(Number(f.best_effort_timestamp_time)-i/30)<0.000001));
 await observer.run(tools.ffmpegPath,['-hide_banner','-v','error','-i',video,'-f','null','-'],{observationLabel:'local-complete-decode'});
 const points=[0,count-1,...p.mappings.slice(1).flatMap(s=>[s.outputStartFrame-1,s.outputStartFrame])];await mkdir(path.join(dir,'frames'));for(const frame of points)await observer.run(tools.ffmpegPath,['-hide_banner','-v','error','-n','-i',video,'-vf',`select=eq(n\\,${frame})`,'-frames:v','1',path.join(dir,'frames',frame+'.png')],{observationLabel:'local-join-frame'});
 const complete={schemaVersion:'selection-improvement-local-completion-v001',status:'local-technical-passed',window:w,preparedRef:await bind(path.join(dir,'prepared.json')),readabilityRef:await bind(path.join(dir,'readability.json')),baseManifestRef:base.manifestRef,mediaRef:await bind(video),audioRef:await bind(audio),layoutRef:await bind(path.join(dir,'layout-output.json')),tools,captionCount:plan.elements.length,alpha,outputMedia:media,inputAudioClock:audioClock,outputAudioClock:outputAudio,frameClock:{count,firstPtsSeconds:0,rate:30,allObservedPtsMatch:true},joinFrames:await Promise.all(points.map(f=>bind(path.join(dir,'frames',f+'.png')))),humanQuality:'not-evaluated',fullNativeQc:'not-run',outlineChoice:null,technicalOutlineInput:'A=8/4'};await save(path.join(dir,'completion.json'),complete);console.log(w.id,'finished',count,'frames',plan.elements.length,'captions');
}
async function reread(w){
 const dir=path.join(out,'local-'+inp.artifactVersion+'-'+w.id),c=await json(path.join(dir,'completion.json')),p=await json(c.preparedRef.path);assert.deepEqual(p,await prepared(w));for(const r of [...p.bindings,c.preparedRef,c.readabilityRef,c.mediaRef,c.audioRef,c.layoutRef,...c.joinFrames])await verify(r);
 const measured=await json(path.join(dir,'font-widths.json'));for(const r of measured.refs)await verify(r);
 const r=await json(c.readabilityRef.path);restoreCaptionReadabilityPlanV001({normalPlan:p.normalPlan,evidence:r.evidence,saved:r.resolution});
 await readPresentationDevProxyStructureBaseV001({manifestRef:c.baseManifestRef,profileId:'dev-proxy-540p-v001',tools,verification:'independent-observation'});
 const media=await inspectRenderedMediaWithToolsV001(c.mediaRef.path,tools);assert.deepEqual(media,c.outputMedia);const a=await inspectOrchestrationEncodedAudioV001({audioPath:c.mediaRef.path,logicalSampleCount:c.frameClock.count*1470,sampleRate:44100,...tools});assert.deepEqual(a,c.outputAudioClock);
 await save(path.join(dir,'independent-reread.json'),{status:'passed',processId:process.pid,completionRef:await bind(path.join(dir,'completion.json')),mediaRef:c.mediaRef,independentSourceClockAndPcm:true,readabilityRecomputed:true,encodedAudioReobserved:true,humanQuality:'not-evaluated'});console.log(w.id,'reread passed');
}
for(const w of inp.windows.filter(w=>!only||w.id===only)){if(['fonts','measure'].includes(stage))await fonts(w);else if(stage==='render')await render(w);else if(stage==='reread')await reread(w);else throw Error('unknown stage')}
