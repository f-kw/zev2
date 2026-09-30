/** Independent reader for the fixed full-Digest low-memory execution. */
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {restoreExecutionInputV001,executionRecordsV001,executionCodeRefsV001,json} from './original-resolution-execution-input.mjs';
import {executionBackgroundArgumentsV001,verifyExecutionBackgroundV001} from './original-resolution-execution-background.mjs';
import {executionComposeOptionsV001} from './original-resolution-execution.mjs';
import {producerArgumentsV001,partitionFramesV001,FULL_FRAMES,DEFAULT_MAX_FRAMES} from './original-resolution-low-memory-composite.mjs';
import {buildPresentationCompositeArgumentsV001} from '../../evals/clip_composition/render_presentation_v002.mjs';
import {inspectRenderedMediaWithToolsV001} from '../../evals/clip_composition/presentation_renderer_qc_v002.mjs';
import {inspectOrchestrationEncodedAudioV001} from '../../evals/clip_composition/presentation_orchestration_background_v001.mjs';
import {representativeClockV001} from './original-resolution-representative-media.mjs';
import {restoreIntegratedNativeQcInputV003} from './integrated-native-qc-input-v003.mjs';
import {scopeOrchestrationPlanV001} from '../../evals/clip_composition/presentation_orchestration_render_scope_v001.mjs';
import {readPresentationQcEvidenceV001} from '../../evals/clip_composition/presentation_qc_evidence_store_v001.mjs';
import {verifyPresentationNativeSampleReceiptsV001} from '../../evals/clip_composition/presentation_native_qc_streaming_v001.mjs';
import {validatePresentationNativeFrameQcInspectionsV001,validatePresentationNativeFrameQcScopeV001} from '../../evals/clip_composition/presentation_native_frame_qc_integrated_v003.mjs';
import {bindDigestStructureFileV001 as bind,verifyDigestStructureFileV001 as verify} from './digest-structure-evidence.mjs';

const same=(a,b)=>assert.deepEqual(a,b);
export async function readLowMemoryFullMediaV001(ref,{decode=false}={}){
  await verify(ref);const c=await json(ref.path),x=await restoreExecutionInputV001(c.inputRef);
  assert.equal(c.schemaVersion,'original-resolution-execution-media-v001');
  assert.equal(c.status,'media-verified-native-qc-pending');same(c.scope,x.interval);same(c.preparationRef,x.preparationRef);
  assert.equal(c.outlineChoice,null);assert.equal(c.humanQuality,'not-reviewed');
  for(const r of [c.background.background,c.background.graph,c.audioRef,...c.videos.map(v=>v.video)])await verify(r);
  const bg=executionBackgroundArgumentsV001(x,c.background.graph.path,c.background.background.path);
  same(c.background.command,bg.args);assert.equal(await readFile(c.background.graph.path,'utf8'),bg.graph);
  same(c.videos.map(v=>v.series),['normal','repeat']);
  assert.equal(c.videos[0].video.fileSha256,c.videos[1].video.fileSha256);
  for(const v of c.videos){
    const receipt=v.lowMemoryComposite;
    assert.equal(receipt.schemaVersion,'original-resolution-low-memory-composite-v001');
    same(receipt.scope,x.interval);assert.equal(receipt.maxFrames,DEFAULT_MAX_FRAMES);
    same(receipt.output,v.video);assert.equal(receipt.rawYuvBytes,FULL_FRAMES*1920*1080*3/2);
    const ranges=partitionFramesV001(0,FULL_FRAMES,DEFAULT_MAX_FRAMES);
    assert.equal(ranges.length,84);same(receipt.segments.map(s=>s.range),ranges);
    const records=executionRecordsV001(x.plan,x.rows,{repeat:v.series==='repeat'});
    for(let i=0;i<ranges.length;i++){
      const wanted=producerArgumentsV001({baseMediaPath:c.background.background.path,plan:x.plan,records,
        scopeStart:0,range:ranges[i],fullFrameCount:FULL_FRAMES,maxFrames:DEFAULT_MAX_FRAMES});
      same(receipt.segments[i],{...wanted,bytes:(ranges[i].endFrameExclusive-ranges[i].startFrame)*1920*1080*3/2,exitCode:0});
    }
    assert.equal(receipt.maximumProcesses,2);assert.equal(receipt.maximumCaptions,8);
    assert.equal(receipt.maximumStates,21);assert.equal(receipt.maximumInputs,22);
    assert.equal(receipt.encoderArgs.at(-1),v.video.path);
    assert.equal(v.commandRole,'renderer-specification-for-existing-native-qc');
    assert.equal(v.executionKind,'low-memory-sequential');
    same(v.command,buildPresentationCompositeArgumentsV001(executionComposeOptionsV001(x,c,v.series,v.video.path)));
    if(decode){
      same(v.observation.video,{codecName:'h264',width:1920,height:1080,fps:30,frameCount:FULL_FRAMES});
      same(v.observation,await inspectRenderedMediaWithToolsV001(v.video.path,x.i.tools));
      same(v.clock,await representativeClockV001(x.i,x.interval,v.video.path));
      same(v.audio,await inspectOrchestrationEncodedAudioV001({audioPath:v.video.path,logicalSampleCount:FULL_FRAMES*1470,sampleRate:44100,...x.i.tools}));
    }
  }
  if(decode){same(c.background.verification,await verifyExecutionBackgroundV001(x,c.background.background.path));same(c.background.clock,await representativeClockV001(x.i,x.interval,c.background.background.path));}
  await verify(ref);return c;
}

export async function readLowMemoryFullQcV001(file,{decode=true}={}){
  const ref=await bind(file),c=await json(file);
  assert.equal(c.schemaVersion,'original-resolution-execution-qc-v001');
  assert.equal(c.outlineChoice,null);assert.equal(c.humanQuality,'not-reviewed');
  for(const r of [c.preparedRef,c.mediaRef,c.nativeRef,...c.implementation])await verify(r);
  same(c.implementation,await executionCodeRefsV001());
  const p=await json(c.preparedRef.path),v=await restoreIntegratedNativeQcInputV003(await json(p.inputRef.path));
  assert.equal(c.scopeId,p.scopeId);same(c.mediaRef,p.mediaRef);
  const plan=scopeOrchestrationPlanV001(v.resolvedPlan,v.renderRange);
  const q=await readPresentationQcEvidenceV001(c.nativeRef.path,{expectedFileSha256:c.nativeRef.fileSha256});
  same(q.evidence.orchestrationInput,await json(p.inputRef.path));
  await validatePresentationNativeFrameQcScopeV001({plan,evidence:q.evidence,renderRange:v.renderRange});
  const checked=await validatePresentationNativeFrameQcInspectionsV001({plan,inspections:q.inspections,renderRange:v.renderRange});
  same(checked.violations,q.violations);same(c.violations,q.violations);
  assert.equal(c.status,checked.violations.length?'native-failed':'technical-passed');
  assert.equal(c.samples,q.evidence.samples.length);
  const retained=await verifyPresentationNativeSampleReceiptsV001({samples:q.evidence.samples});
  await readLowMemoryFullMediaV001(c.mediaRef,{decode});await verify(ref);
  return {status:c.status,scopeId:c.scopeId,samples:c.samples,violations:c.violations,retained};
}
