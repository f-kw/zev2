/** Opt-in, one-caption real-media continuation probe. Preserves all existing inputs.
 * This verifies the staged renderer, not whole-Digest quality or adoption. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdir,mkdtemp,readFile,writeFile} from 'node:fs/promises';
import {spawn} from 'node:child_process';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {deriveReadabilityOrchestrationDrawingViewV001,restoreOrchestrationDrawingViewEvidenceV001,
 exportOrchestrationDrawingViewEvidenceV001} from './presentation_orchestration_v001.mjs';
import {renderEditedOrchestrationV001,buildEditedOrchestrationDrawingRulesRefV001} from './presentation_orchestration_edited_render_v001.mjs';
const root=path.resolve(new URL('../../',import.meta.url).pathname),self=fileURLToPath(import.meta.url);
const json=async file=>JSON.parse(await readFile(file,'utf8'));
const save=(file,value)=>writeFile(file,JSON.stringify(value,null,2)+'\n',{flag:'wx'});
const ref=async file=>{const bytes=await readFile(file);return{path:file,bytes:bytes.length,fileSha256:createHash('sha256').update(bytes).digest('hex')}};
if(process.argv[2]==='--worker'){
 const options=await json(process.argv[3]),mode=process.argv[4];let captured;
 try{
  const result=await renderEditedOrchestrationV001({...options,nativeQcExecutionControl:{
   beforeStart:async event=>{captured=event.checkpointRef;assert(captured?.fileSha256);if(mode==='stop')throw Object.assign(new Error('deliberate small-test interruption'),
    {code:'READABILITY_CAPACITY_INTERRUPTED',capacityObservation:{phase:'before-native',status:'test-interrupted',checkpointRef:captured}})},
   beforeHeavyBatch:async()=>{},afterSample:async()=>{}},onProgress:event=>process.stdout.write(JSON.stringify({phase:event.phase})+'\n')});
  assert.equal(mode,'resume');assert.equal(result.status,'passed');
  assert.equal(result.continuation.reusedCompletedBody,true);assert.equal(result.continuation.reusedPassedExactReplay,true);
  assert(!result.processTimings.records?.some(row=>['video-composite','exact-replay-encode'].includes(row.label)));
  await save(path.join(options.evidenceDirectory,'probe-success.json'),{status:'passed',candidateVideo:result.candidateVideo,
   finalQc:result.finalQc.status,expectedFrameCount:result.expectedFrameCount,processTimings:result.processTimings,
   continuation:result.continuation,completedFrameQcStatus:result.completedFrameQc.status});
 }catch(error){
  if(mode!=='stop'||error.code!=='READABILITY_CAPACITY_INTERRUPTED')throw error;
  assert.deepEqual(error.capacityObservation.checkpointRef,captured);assert.deepEqual(error.checkpointRef,captured);
  await save(path.join(options.evidenceDirectory,'probe-interrupted.json'),{status:'interrupted',checkpointRef:captured,code:error.code});
 }
}else{
 test('real one-caption candidate saves body/replay, interrupts, resumes in another process and publishes with final QC',
 {skip:process.env.ZEV_RUN_BEFORE_NATIVE_MEDIA_TEST!=='1'},async()=>{
  const directory=await mkdtemp(path.join(root,'runtime/artifacts/caption-readability-native-resume-test-'));
  const outputParent=path.join(root,'evals/clip_composition/outputs/presentation/stage4-editing-'+path.basename(directory));await mkdir(outputParent);
  const read=relative=>json(path.join(root,relative));
  const view=deriveReadabilityOrchestrationDrawingViewV001({version:'candidate-readability-v001',
   view:restoreOrchestrationDrawingViewEvidenceV001(await read('runtime/artifacts/digest-new-material-20260926-v001/presentation/drawing-evidence.json')),
   meaning:await read('runtime/artifacts/digest-new-material-20260926-v001/caption-attempt-003/meaning-input.json'),
   evidence:await read('runtime/artifacts/caption-readability-20260928-preview-v006/readability-evidence.json'),
   savedResolution:await read('runtime/artifacts/caption-readability-20260928-preview-v006/readability-resolution.json')});
  const drawingPath=path.join(directory,'drawing-evidence.json');await save(drawingPath,exportOrchestrationDrawingViewEvidenceV001(view));
  const first=view.resolvedPlan.elements[0];assert.equal(first.startFrame,0);assert(first.endFrameExclusive>=40);
  const options={drawingEvidenceRef:await ref(drawingPath),outputDirectory:path.join(outputParent,'output'),
   evidenceDirectory:path.join(directory,'body-attempt'),range:{startFrame:10,endFrameExclusive:40},
   backgroundReuseProofPath:path.join(root,'runtime/artifacts/digest-new-material-20260926-v001/presentation/background/proof.json'),
   backgroundReuseDecoderRef:await ref('/opt/homebrew/Cellar/ffmpeg/8.0.1_1/bin/ffmpeg'),
   nativeAssetReuse:path.join(directory,'native-assets'),
   drawingRulesRef:await buildEditedOrchestrationDrawingRulesRefV001({candidateVersion:'candidate-readability-v001',
    backgroundReuseDecoderRef:await ref('/opt/homebrew/Cellar/ffmpeg/8.0.1_1/bin/ffmpeg')})};
  const launch=async(mode,args)=>{
   const input=path.join(directory,mode+'-options.json');await save(input,args);
   await new Promise((resolve,reject)=>{const child=spawn(process.execPath,[self,'--worker',input,mode],{cwd:root,stdio:['ignore','pipe','pipe']});
    let out='',err='';child.stdout.on('data',b=>{out+=b;process.stdout.write(b)});child.stderr.on('data',b=>{err+=b});
    child.once('error',reject);child.once('close',async code=>{await save(path.join(directory,mode+'-process.json'),{code,out,err});
     code===0?resolve():reject(new Error(err||out));});});
  };
  await launch('stop',options);
  const stopped=await json(path.join(options.evidenceDirectory,'probe-interrupted.json'));
  const checkpoint=await json(stopped.checkpointRef.path),renderer=await json(checkpoint.rendererCheckpointRef.path);
  const before=await ref(renderer.state.workVideo),replayBefore=await ref(renderer.replayRef.path);
  await launch('resume',{...options,evidenceDirectory:path.join(directory,'native-attempt'),resumeFromCheckpointRef:stopped.checkpointRef});
  const success=await json(path.join(directory,'native-attempt/probe-success.json'));
  assert.equal(success.candidateVideo.fileSha256,before.fileSha256);assert.deepEqual(await ref(renderer.replayRef.path),replayBefore);
  const timings=success.processTimings;
  assert(!JSON.stringify(timings).includes('video-composite'));assert(!JSON.stringify(timings).includes('exact-replay-encode'));
  await save(path.join(directory,'verification.json'),{status:'passed',scope:'one caption, 30 frames; full Digest not verified',
   checkpointRef:stopped.checkpointRef,finalQc:success.finalQc,media:success.candidateVideo,
   reusedBodySha256:before.fileSha256,replayRef:replayBefore,newBodyEncodesOnResume:0,newReplayEncodesOnResume:0});
  process.stdout.write(JSON.stringify({mediaProbe:'passed',directory,outputParent})+'\n');
 });
}
