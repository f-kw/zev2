import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdir,mkdtemp,readFile,writeFile,rm,readdir} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import path from 'node:path';
import {canonicalJson} from './presentation_caption_contract_v002.mjs';
import {AUTO_PRESENTATION_RULES_REF_V008} from './presentation_auto_effects_v001.mjs';
import {createOrchestrationContextV001,createOrchestrationJudgmentInputV001,fixOrchestrationJudgmentV001,
  resolveOrchestrationDrawingViewV001,exportOrchestrationDrawingViewEvidenceV001} from './presentation_orchestration_v001.mjs';
import {createOrchestrationRenderScopeV001} from './presentation_orchestration_render_scope_v001.mjs';
import {inspectPresentationExactReplayQcV001} from './presentation_exact_replay_qc_v001.mjs';
import {PRESENTATION_INTEGRITY_STATE_QC_METHOD_V001} from './presentation_integrity_state_qc_v001.mjs';
import {acquirePresentationOutputReservationV002,buildPresentationRenderApplicationResultsV002,
  readPresentationBeforeNativeCheckpointV001,resumeValidatedPresentationDrawAndQcV001,
  inspectPresentationCompletedFrameQcV001} from './render_presentation_v002.mjs';
const hash=b=>createHash('sha256').update(b).digest('hex'), json=v=>JSON.stringify(v,null,2)+'\n';
const canonical=v=>hash(canonicalJson(v));
const root=path.resolve(new URL('../../',import.meta.url).pathname);
const ref=async file=>{const bytes=await readFile(file);return{path:file,bytes:bytes.length,fileSha256:hash(bytes)}};
// Synthetic, file-bound execution evidence verifies continuation mechanics only.
// No encoded media quality, native image inspection or final QC is claimed here.
async function fixture(t){
 const directory=await mkdtemp(path.join(root,'evals/clip_composition/outputs/presentation/.native-resume-unit-'));
 t.after(()=>rm(directory,{recursive:true,force:true}));
 const save=async(name,value)=>{const file=path.join(directory,name);await writeFile(file,value);const bound=await ref(file);return{path:bound.path,fileSha256:bound.fileSha256}};
 const plan={schemaVersion:'presentation-output-common-core-plan-v001',canvas:{width:1920,height:1080,fps:30},elements:[{
  instructionId:'caption-1',kind:'speech-caption',text:'固定字幕',indexedLines:[{lineIndex:0,text:'固定字幕'}],
  presetId:'normal',requestedPresetId:'normal',appliedPresetId:'normal',registryVersion:'normal-v001',stateId:'normal',
  startFrame:0,endFrameExclusive:12,displayFrameCount:12,visualState:{textStyle:{fontAssetId:'synthetic-font',fontSizePx:96,
    fontColor:'#FFFDF8',borderColor:'#111827',borderWidthPx:8,glowWidthPx:12},
  position:{preset:'bottom-center',alignment:'center',offsetXPercent:0,offsetYPercent:-6},background:null,transitionId:'quick-fade-4f-v001'}}]};
 plan.elements.push({...structuredClone(plan.elements[0]),instructionId:'caption-2',startFrame:15,endFrameExclusive:27});
 const planBytes=json(plan),planRef=await save('normal.json',planBytes),mediaRef=await save('source.mp4','synthetic source');
 const timeline={schemaVersion:'presentation-base-media-timeline-v003',baseMedia:{frameRate:'30/1',expectedFrameCount:30,fileSha256:mediaRef.fileSha256},
  segments:[{segmentId:'segment-1',outputStartFrame:0,outputEndFrame:15,sourceStartFrame30:0,sourceEndFrame30:15},{segmentId:'segment-2',outputStartFrame:15,outputEndFrame:30,sourceStartFrame30:100,sourceEndFrame30:115}]};
 const timelineBytes=json(timeline),timelineRef=await save('timeline.json',timelineBytes);
 const pulseTimingEvidence={schemaVersion:'auto-presentation-pulse-timing-v001',sourceRef:await save('audio-source.mp4','audio source'),
  candidatesRef:await save('candidates.json','candidates'),peaksRef:await save('peaks.json','peaks'),sampleRate:16000,sampleCount:16000,
  candidates:[{candidateId:'event-1',peakIds:['peak-1']}],peaks:[{peakId:'peak-1',startSample:100,endSampleExclusive:500,peakSample:200}]};
 const decisionInputBytes=json({schemaVersion:'presentation-focus-decision-input-v005',pulseTimingEvidence});
 const decisionInputRef=await save('native-binding.json',decisionInputBytes);
 const source={digestRef:{version:'synthetic-resume-v001',sha256:hash('digest')},planRef,timelineRef,mediaRef,planBytes,timelineBytes,
  playbackSampleRate:44100,observationSampleRate:16000,captionContext:{baselineRef:{...planRef,canonicalSha256:canonical(plan)},
  decisionInputRef,renderingRulesRef:structuredClone(AUTO_PRESENTATION_RULES_REF_V008),pulseTimingEvidence},decisionInputBytes};
 const context=createOrchestrationContextV001(source);
 const input=createOrchestrationJudgmentInputV001({context,evidence:{productionPurpose:'保存再開の機械検証。',
  captions:plan.elements.map(e=>({captionId:e.instructionId,text:e.text,contextId:e.instructionId,startFrame:e.startFrame,endFrameExclusive:e.endFrameExclusive,eligiblePulsePeakIds:[]})),
  contexts:plan.elements.map(e=>({contextId:e.instructionId,description:'固定文脈'})),observations:[],
  audioEvidence:{sourceRef:pulseTimingEvidence.sourceRef,candidatesRef:pulseTimingEvidence.candidatesRef,sampleRate:16000,sampleCount:16000},
  audioCandidates:[{candidateId:'event-1',startSample:100,endSampleExclusive:500,constituentPeakIds:['peak-1']}]}});
 const state=fixOrchestrationJudgmentV001({context,input,replyBytes:json({schemaVersion:'presentation-orchestration-judgment-v002',inputSha256:input.inputSha256,
  completion:'complete',captions:plan.elements.map(e=>({captionId:e.instructionId,status:'resolved',semanticRole:'normal',allowedPresets:[{preset:'normal'}],reason:'本文を維持。',evidenceIds:[e.instructionId]})),connections:context.connectionIds.map(connectionId=>({connectionId,status:'resolved',semanticRole:'continuation',allowedPresets:['normal-cut'],reason:'既存接続維持。',evidenceIds:[connectionId]}))})});
 const view=resolveOrchestrationDrawingViewV001({context,state}),scope=createOrchestrationRenderScopeV001(view);
 const outputDirectory=path.join(directory,'output'),reservation=await acquirePresentationOutputReservationV002(outputDirectory);
 const workDirectory=await mkdtemp(path.join(directory,'.output.presentation-renderer-v002-work-'));
 const stagingDirectory=path.join(workDirectory,'publish'),scratchDirectory=path.join(workDirectory,'scratch');
 await mkdir(path.join(stagingDirectory,'overlays'),{recursive:true});await mkdir(scratchDirectory);
 const workVideo=path.join(stagingDirectory,'presentation-rendered-v002.mp4');await writeFile(workVideo,'completed synthetic media');
 const pngPath=path.join(stagingDirectory,'overlays','caption.png');await writeFile(pngPath,'synthetic PNG');
 const element=view.resolvedPlan.elements[0],props={text:element.text},pngSha256=hash('synthetic PNG');
 const records=view.resolvedPlan.elements.map(element=>({element,fileStem:element.instructionId,pngPath,pngSha256,props,inspection:{instructionId:element.instructionId,
  overlaySha256:pngSha256,appliedOverlayPropsCanonicalSha256:canonical(props)}}));
 const background=await save('background.mp4','synthetic background'),audio=await save('background.aac','synthetic audio');
 const toolPaths={ffmpegPath:process.execPath,ffprobePath:process.execPath,imageMagickPath:process.execPath};
 const calls=[];
 const observer={async run(command,args){calls.push(args);let out;
  if(args.length===1&&args[0]==='-version')out='mock-version\n';
  else if(args.includes('-progress')){await writeFile(args.at(-1),'completed synthetic media',{flag:'wx'});out='frame=30\nprogress=end\n'}
  else if(args[args.indexOf('-select_streams')+1]==='v')out=json({streams:[{index:0,codec_type:'video',codec_name:'h264',width:1920,height:1080,
   pix_fmt:'yuv420p',r_frame_rate:'30/1',avg_frame_rate:'30/1',nb_frames:'30',time_base:'1/15360',start_pts:0,duration_ts:15360}]});
  else throw Error('unexpected mocked replay process');
  return{code:0,signal:null,stdout:Buffer.from(out),stderr:Buffer.alloc(0)}}};
 const replay=await inspectPresentationExactReplayQcV001({plan:view.resolvedPlan,records,baseMediaPath:background.path,completedMediaPath:workVideo,
  expectedFrameCount:30,scratchDirectory:path.join(scratchDirectory,'exact-replay-qc'),ffmpegPath:process.execPath,ffprobePath:process.execPath,
  serializePngAndFilters:true,processObserver:observer});
 assert.equal(replay.status,'passed');
 const replayPath=path.join(scratchDirectory,'exact-replay-result.json');await writeFile(replayPath,json(replay));
 const checkpoint={schemaVersion:'presentation-before-native-checkpoint-v001',stage:'body-and-exact-replay-verified',finalQcComplete:false,
  presetRegistry:{version:'synthetic'},toolPaths,replayRef:await ref(replayPath),state:{outputDirectory,reservation,workDirectory,stagingDirectory,scratchDirectory,
   cleanupWarnings:[],overlayRecords:records,applicationResults:buildPresentationRenderApplicationResultsV002(records),baseExpectedAudio:{present:false},
   completedExpectedAudio:{present:true},outputMedia:{video:{frameCount:30}},workVideo,plan:view.resolvedPlan,expectedFrameCount:30,
   presentationTimeline:null,timelineAudio:null,baseMediaPath:background.path,serializePngAndFilters:true,runCounterfactualQc:true,
   counterfactualQcMethod:PRESENTATION_INTEGRITY_STATE_QC_METHOD_V001,orchestrationInput:exportOrchestrationDrawingViewEvidenceV001(view),
   orchestrationBackground:{projectionSha256:view.projection.projectionSha256,displayFrameCount:30,video:background,audio},audioMediaPath:audio.path,renderRange:null}};
 const checkpointPath=path.join(scratchDirectory,'before-native-checkpoint.json');await writeFile(checkpointPath,json(checkpoint));
 return{directory,view,checkpoint,checkpointPath,records,replay,workVideo,pngPath,calls,scope,
  args:{checkpointRef:await ref(checkpointPath),outputDirectory,presetRegistry:checkpoint.presetRegistry,toolPaths,orchestrationDrawingView:view}};
}
test('saved body/replay reopens at the native boundary without a media process or PNG draw',async t=>{
 const f=await fixture(t),previous=await readFile(f.workVideo),events=[];let checkpointRef;
 const result=await resumeValidatedPresentationDrawAndQcV001({...f.args,
  overlayAdapter:{renderStill(){assert.fail('no redraw')},renderLineMask(){assert.fail('no redraw')}},
  processObserver:{run(){assert.fail('no replay or media process before capacity gate')}},
  onBeforeNativeCheckpoint:async event=>{checkpointRef=event.checkpointRef;events.push('saved')},
  nativeQcExecutionControl:{beforeStart:async()=>{events.push('gate');assert(checkpointRef);throw Object.assign(new Error('capacity gate'),
    {code:'READABILITY_CAPACITY_INTERRUPTED',capacityObservation:{phase:'before-native',status:'interrupted'}})}}});
 assert.deepEqual(events,['saved','gate']);assert.equal(result.exitCode,2);assert.equal(result.failure.code,'READABILITY_CAPACITY_INTERRUPTED');
 assert.equal(result.failure.capacityObservation.phase,'before-native');
 assert.deepEqual(await readFile(f.workVideo),previous);
 const saved=JSON.parse(await readFile(checkpointRef.path));assert.deepEqual(saved.replayRef,f.checkpoint.replayRef);
 assert(!(await readdir(path.dirname(checkpointRef.path))).includes('native-qc-preparation'));
 assert.equal((await readPresentationBeforeNativeCheckpointV001({...f.args,checkpointRef})).stage,'body-and-exact-replay-verified');
});
test('same saved body/replay is validated in a separate Node process',async t=>{
 const f=await fixture(t);const config=path.join(f.directory,'reader.json');
 await writeFile(config,json({...f.args,orchestrationDrawingView:undefined,orchestrationInput:exportOrchestrationDrawingViewEvidenceV001(f.view)}));
 const module=new URL('./render_presentation_v002.mjs',import.meta.url).href;
 const orchestration=new URL('./presentation_orchestration_v001.mjs',import.meta.url).href;
 const code=`import{readFileSync}from'node:fs';import{readPresentationBeforeNativeCheckpointV001 as read}from ${JSON.stringify(module)};
 import{restoreOrchestrationDrawingViewEvidenceV001 as restore}from ${JSON.stringify(orchestration)};
 const c=JSON.parse(readFileSync(process.argv[1]));c.orchestrationDrawingView=restore(c.orchestrationInput);const s=await read(c);console.log(s.stage);`;
 const child=spawnSync(process.execPath,['--input-type=module','-e',code,config],{encoding:'utf8'});
 assert.equal(child.status,0,child.stderr);assert.equal(child.stdout.trim(),'body-and-exact-replay-verified');
});
test('changed checkpoint, completed movie, physical PNG or source plan refuses native continuation',async t=>{
 const f=await fixture(t);
 for(const file of [f.checkpointPath,f.workVideo,f.pngPath,f.view.sourceRefs.planRef.path]){
  const original=await readFile(file);await writeFile(file,Buffer.concat([original,Buffer.from(' changed')]));
  await assert.rejects(()=>readPresentationBeforeNativeCheckpointV001(f.args),/saved draw resume/);await writeFile(file,original);
 }
});
test('incomplete replay, altered display plan, changed drawing rules and already-published output are rejected',async t=>{
 const f=await fixture(t),replayPath=f.checkpoint.replayRef.path;
 const writeCheckpoint=async value=>{await writeFile(f.checkpointPath,json(value));return{...f.args,checkpointRef:await ref(f.checkpointPath)}};
 const incomplete=structuredClone(f.checkpoint);incomplete.stage='composite-running';
 await assert.rejects(async()=>readPresentationBeforeNativeCheckpointV001(await writeCheckpoint(incomplete)),/boundary/);
 const changed=structuredClone(f.checkpoint);changed.state.plan.elements[0].text='変更';
 await assert.rejects(async()=>readPresentationBeforeNativeCheckpointV001(await writeCheckpoint(changed)),/plan or QC scope/);
 const missing=structuredClone(f.checkpoint);await writeFile(replayPath,json({...f.replay,status:'failed'}));missing.replayRef=await ref(replayPath);
 await assert.rejects(async()=>readPresentationBeforeNativeCheckpointV001(await writeCheckpoint(missing)),/not complete/);
 await writeFile(replayPath,json(f.replay));const args=await writeCheckpoint(f.checkpoint);
 await assert.rejects(()=>readPresentationBeforeNativeCheckpointV001({...args,presetRegistry:{version:'other'}}),/registry/);
 await mkdir(f.args.outputDirectory);
 await assert.rejects(()=>readPresentationBeforeNativeCheckpointV001(args),/already published/);
});
