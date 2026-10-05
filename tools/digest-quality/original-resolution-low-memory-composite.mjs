/** Finite, sequential YUV compositor for original-resolution Digest media.
 * The existing renderer owns all overlay expressions; this module only scopes
 * its inputs and replaces its per-range encoder with one continuous encoder. */
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {createHash} from 'node:crypto';
import {mkdir,lstat} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {buildPresentationCompositeArgumentsV001} from '../../evals/clip_composition/render_presentation_v002.mjs';
import {canonicalJson} from '../../evals/clip_composition/presentation_caption_contract_v002.mjs';
import {validateDigestCaptionVisibilitySelectionV001,validateDigestCaptionVisibilityCompositionV001}
  from '../../evals/clip_composition/presentation_renderer_qc_v002.mjs';
import {EXECUTION_AREA,json,loadExecutionInputV001,executionRecordsV001,exclusiveExecutionDirectoryV001} from './original-resolution-execution-input.mjs';
import {bindDigestStructureFileV001 as bind,verifyDigestStructureFileV001 as verify,saveDigestStructureFileV001 as save} from './digest-structure-evidence.mjs';

const self=fileURLToPath(import.meta.url);
const FRAME_BYTES=1920*1080*3/2;
// Historical saved-trial clock only; the formal entry never uses this default.
export const FULL_FRAMES=17613;
export const DEFAULT_MAX_FRAMES=210; // The existing seven-second trial length.
const FULL_BACKGROUND=path.join(EXECUTION_AREA,'full-production-001/background/background.nut');
const canonicalSha256=value=>createHash('sha256').update(canonicalJson(value)).digest('hex');

function visibilityCompositionV001(selection,segments){
  if(selection===null)return null;
  return {schemaVersion:'digest-caption-visibility-composition-v001',
    selectionCanonicalSha256:canonicalSha256(selection),
    rendererPlanCanonicalSha256:selection.rendererPlanCanonicalSha256,
    adoptionBinding:selection.adoptionBinding,manifestBinding:selection.manifestBinding,
    shownInstructionIds:selection.entries.filter(row=>row.decision==='show').map(row=>row.instructionId),
    suppressedInstructionIds:selection.entries.filter(row=>row.decision==='suppress').map(row=>row.instructionId),
    counts:selection.counts,
    rangeEvidence:segments.map(segment=>({...segment.range,
      shownInstructionIds:segment.shownInstructionIds,graphSha256:segment.graphSha256}))};
}

export function partitionFramesV001(start,end,maxFrames=DEFAULT_MAX_FRAMES){
  assert(Number.isInteger(start)&&Number.isInteger(end)&&start>=0&&end>start&&end<=FULL_FRAMES);
  assert(Number.isInteger(maxFrames)&&maxFrames>0&&maxFrames<=DEFAULT_MAX_FRAMES);
  const ranges=[];
  for(let at=start;at<end;at+=maxFrames)ranges.push({startFrame:at,endFrameExclusive:Math.min(at+maxFrames,end)});
  assert.equal(ranges[0].startFrame,start);
  assert.equal(ranges.at(-1).endFrameExclusive,end);
  for(let i=1;i<ranges.length;i++)assert.equal(ranges[i-1].endFrameExclusive,ranges[i].startFrame);
  assert.equal(ranges.reduce((n,r)=>n+r.endFrameExclusive-r.startFrame,0),end-start);
  return ranges;
}

/** Keep the original graph byte for byte except numeric PNG input indexes.
 * The renderer emits no filter reference for a finite state unused in a range. */
export function producerArgumentsV001({baseMediaPath,plan,records,scopeStart,range,fullFrameCount,maxFrames,
  graphFullFrameCount=FULL_FRAMES}){
  assert(range.startFrame>=scopeStart&&range.endFrameExclusive<=scopeStart+fullFrameCount);
  assert(range.endFrameExclusive-range.startFrame<=maxFrames);
  const active=records.filter(r=>r.element.startFrame<range.endFrameExclusive&&r.element.endFrameExclusive>range.startFrame);
  const original=buildPresentationCompositeArgumentsV001({baseMediaPath,plan,overlayRecords:active,
    expectedFrameCount:range.endFrameExclusive-range.startFrame,serializePngAndFilters:true,
    renderRange:{...range,fullFrameCount:graphFullFrameCount}});
  const graphIndex=original.indexOf('-filter_complex'),originalGraph=original[graphIndex+1];
  const inputs=[];
  for(let i=0;i<graphIndex;i++)if(original[i]==='-i')inputs.push(original[i+1]);
  assert.equal(inputs[0],baseMediaPath);
  const used=new Set([...originalGraph.matchAll(/\[(\d+):v\]/g)].map(m=>Number(m[1])));
  const map=new Map([[0,0]]),kept=[];
  for(let i=1;i<inputs.length;i++)if(used.has(i)){map.set(i,kept.length+1);kept.push(inputs[i]);}
  const graph=originalGraph.replace(/\[(\d+):v\]/g,(_,number)=>{
    const next=map.get(Number(number));assert.notEqual(next,undefined);return `[${next}:v]`;
  });
  const args=['-hide_banner','-loglevel','error','-y','-filter_complex_threads','1',
    '-ss',String((range.startFrame-scopeStart)/plan.canvas.fps),'-i',baseMediaPath];
  for(const png of kept)args.push('-threads','1','-loop','1','-framerate',String(plan.canvas.fps),'-i',png);
  args.push('-filter_complex',graph,'-map','[video]','-frames:v',String(range.endFrameExclusive-range.startFrame),
    '-c:v','rawvideo','-pix_fmt','yuv420p','-f','rawvideo','pipe:1');
  return {args,captionCount:active.length,stateCount:kept.length,inputCount:kept.length+1,
    pngPaths:kept,range,graphSha256:createHash('sha256').update(graph).digest('hex')};
}

/** One expressly permitted Normal candidate with saved typography settings. Admission and saved-plan
 * bindings remain the caller's responsibility; this entry refuses ranges,
 * finite effects and missing/reordered records. The complete output clock must
 * be explicitly supplied by that caller; it is never inferred from captions. */
export async function runFormalLowMemoryCompositeV001(input){
  assert(input&&typeof input==='object'&&!Array.isArray(input));
  const allowed=['baseMediaPath','plan','overlayRecords','expectedFrameCount','expectedOverlayCount','outputPath','ffmpegPath',
    'maxFrames','processObserver','resourceCheck','visibilitySelection'];
  assert(Object.keys(input).every(key=>allowed.includes(key)),'unsupported formal composite options');
  const {baseMediaPath,plan,overlayRecords,expectedFrameCount,expectedOverlayCount,outputPath,ffmpegPath,
    maxFrames=DEFAULT_MAX_FRAMES,processObserver,resourceCheck,visibilitySelection=null}=input;
  assert.equal(process.env.ZEV_FULL_SUPERVISED,'1','SUPERVISOR_REQUIRED');
  assert(Number.isSafeInteger(expectedFrameCount)&&expectedFrameCount>0
    &&Number.isSafeInteger(expectedFrameCount*FRAME_BYTES),'explicit complete frame clock required');
  assert(plan&&typeof plan==='object'&&!Array.isArray(plan)
    &&plan.canvas&&Array.isArray(plan.elements)&&Array.isArray(overlayRecords),'complete Normal plan and records required');
  assert.equal(plan.canvas.width,1920);assert.equal(plan.canvas.height,1080);assert.equal(plan.canvas.fps,30);
  // The qualified caller obtains counts from the explicitly admitted plan.
  // Never infer its complete clock, overlay count or permission from whichever
  // records reached this function.
  assert(Number.isSafeInteger(expectedOverlayCount)&&expectedOverlayCount>0
    &&expectedOverlayCount<=expectedFrameCount,'approved candidate overlay count required');
  assert.equal(plan.elements.length,expectedOverlayCount);assert.equal(overlayRecords.length,expectedOverlayCount);
  assert(Number.isSafeInteger(maxFrames)&&maxFrames>0&&maxFrames<=DEFAULT_MAX_FRAMES);
  for(const value of [baseMediaPath,outputPath,ffmpegPath])assert(typeof value==='string'&&path.isAbsolute(value));
  assert.notEqual(path.resolve(baseMediaPath),path.resolve(outputPath));
  assert.equal(typeof resourceCheck,'function','formal resource gate is required');
  assert.equal(typeof processObserver?.observeOperation,'function','formal operation observer is required');
  const ids=new Set();
  for(const [index,record] of overlayRecords.entries()){
    assert.deepEqual(record.element,plan.elements[index],'record order or saved element changed');
    const element=record.element;
    assert(typeof element.instructionId==='string'&&!ids.has(element.instructionId));ids.add(element.instructionId);
    assert(Number.isSafeInteger(element.startFrame)&&element.startFrame>=0
      &&Number.isSafeInteger(element.endFrameExclusive)&&element.endFrameExclusive>element.startFrame
      &&element.endFrameExclusive<=expectedFrameCount);
    assert.equal(element.displayFrameCount,element.endFrameExclusive-element.startFrame);
    assert(!Object.hasOwn(element,'presentationMotion')&&!Object.hasOwn(element,'presentationPulse')
      &&!Object.hasOwn(record,'motionStates')&&!Object.hasOwn(record,'pulseStates'),'only Normal records');
    assert(typeof record.pngPath==='string'&&path.isAbsolute(record.pngPath));
  }
  // A qualified caller supplies adoption authority. Keep every logical record
  // above, including suppressed captions; only the physical overlay inputs are
  // selected here. Snapshot the explicit decisions before any asynchronous work.
  const selection=visibilitySelection===null?null:structuredClone(visibilitySelection);
  assert.equal(validateDigestCaptionVisibilitySelectionV001({plan,selection,
    manifestBinding:selection?.manifestBinding}).status,'passed','invalid caption visibility selection');
  const visibleRecords=selection===null?overlayRecords
    :overlayRecords.filter((_record,index)=>selection.entries[index].decision==='show');
  try{await lstat(outputPath);assert.fail('formal output already exists');}
  catch(error){if(error.code!=='ENOENT')throw error;}
  const ranges=[];
  for(let at=0;at<expectedFrameCount;at+=maxFrames)
    ranges.push({startFrame:at,endFrameExclusive:Math.min(at+maxFrames,expectedFrameCount)});
  const commands=ranges.map(range=>{
    const command=producerArgumentsV001({baseMediaPath,plan,records:visibleRecords,
      scopeStart:0,range,fullFrameCount:expectedFrameCount,graphFullFrameCount:expectedFrameCount,maxFrames});
    if(selection===null)return command;
    const shownInstructionIds=visibleRecords.filter(record=>record.element.startFrame<range.endFrameExclusive
      &&record.element.endFrameExclusive>range.startFrame).map(record=>record.element.instructionId);
    assert.equal(shownInstructionIds.length,command.captionCount);
    return {...command,shownInstructionIds};
  });
  assert.equal(commands.reduce((n,c)=>n+c.range.endFrameExclusive-c.range.startFrame,0),expectedFrameCount);
  const encoderArgs=['-hide_banner','-loglevel','error','-n','-f','rawvideo','-pixel_format','yuv420p',
    '-video_size','1920x1080','-framerate','30','-i','pipe:0','-i',baseMediaPath,
    '-map','0:v:0','-map','1:a:0','-vf','setsar=1/1','-frames:v',String(expectedFrameCount),
    '-c:v','libx264','-preset','fast','-crf','20','-pix_fmt','yuv420p','-c:a','copy',
    '-movie_timescale','30','-movflags','+faststart',outputPath];
  // YUV travels through pipes only. Before each finite unit, conservatively
  // reserve its uncompressed bytes for encoded growth; the supervisor also
  // watches actual free space each second. No full raw-YUV file is allocated.
  const allocationBytes=Math.min(maxFrames,expectedFrameCount)*FRAME_BYTES;
  return processObserver.observeOperation({observationLabel:'formal-low-memory-composite',
    operationKind:'sequential-stream-composite',input:{baseMediaPath,expectedFrameCount,outputPath,
      ffmpegPath,maxFrames,expectedOverlayCount,visibilitySelection:selection,
      visibilityComposition:visibilityCompositionV001(selection,commands),
      encoderArgs,segments:commands.map(c=>({...c,args:c.args}))}},async()=>{
    await resourceCheck({stage:'body',newBytes:allocationBytes});
    const create=(args,stdio)=>{
      // No detached child: both streams remain in the supervisor-owned PGID.
      const child=spawn(ffmpegPath,args,{stdio,detached:false});const errors=[],stderr=[];
      child.stderr.on('data',block=>stderr.push(block));child.on('error',error=>errors.push(String(error.message)));
      const closed=new Promise(resolve=>child.once('close',(code,signal)=>resolve({code,signal,errors,
        stderr:Buffer.concat(stderr).toString('utf8')})));
      return {child,closed};
    };
    const encoder=create(encoderArgs,['pipe','ignore','pipe']);
    let encoderInputError=null;encoder.child.stdin.on('error',error=>{encoderInputError=error;});
    const digest=createHash('sha256');let bytes=0;const segments=[];let active=null;
    const closeOwn=async stream=>{
      if(!stream)return;
      if(stream.child.exitCode===null&&stream.child.signalCode===null)stream.child.kill('SIGKILL');
      await stream.closed;
    };
    try{
      for(const command of commands){
        const nextFrames=command.range.endFrameExclusive-command.range.startFrame;
        await resourceCheck({stage:'composite-range',newBytes:nextFrames*FRAME_BYTES});
        if(encoderInputError)throw encoderInputError;
        assert.equal(encoder.child.exitCode,null,'encoder exited before all frames');
        active=create(command.args,['ignore','pipe','pipe']);let segmentBytes=0;
        for await(const block of active.child.stdout){
          segmentBytes+=block.length;bytes+=block.length;digest.update(block);
          assert(segmentBytes<=(command.range.endFrameExclusive-command.range.startFrame)*FRAME_BYTES);
          if(encoderInputError)throw encoderInputError;
          if(!encoder.child.stdin.write(block))await new Promise((resolve,reject)=>{
            const clean=()=>{encoder.child.stdin.off('drain',drained);encoder.child.stdin.off('error',failed);
              encoder.child.off('close',ended);};
            const drained=()=>{clean();resolve();};const failed=error=>{clean();reject(error);};
            const ended=()=>{clean();reject(new Error('encoder closed during stream write'));};
            encoder.child.stdin.once('drain',drained);encoder.child.stdin.once('error',failed);
            encoder.child.once('close',ended);
          });
        }
        const result=await active.closed;active=null;
        assert.equal(result.code,0,`formal producer failed: ${result.stderr}`);
        assert.equal(result.signal,null);assert.deepEqual(result.errors,[]);
        assert.equal(segmentBytes,(command.range.endFrameExclusive-command.range.startFrame)*FRAME_BYTES);
        segments.push({...command,bytes:segmentBytes,exitCode:result.code,signal:result.signal});
      }
      encoder.child.stdin.end();const result=await encoder.closed;
      assert.equal(result.code,0,`formal encoder failed: ${result.stderr}`);
      assert.equal(result.signal,null);assert.deepEqual(result.errors,[]);
      if(encoderInputError)throw encoderInputError;
      assert.equal(bytes,expectedFrameCount*FRAME_BYTES);
      for(let index=1;index<segments.length;index++)
        assert.equal(segments[index-1].range.endFrameExclusive,segments[index].range.startFrame);
      const visibilityComposition=visibilityCompositionV001(selection,segments);
      assert.equal(validateDigestCaptionVisibilityCompositionV001({plan,selection,composition:visibilityComposition,
        expectedFrameCount}).status,'passed','invalid completed caption visibility composition');
      return {schemaVersion:'digest-formal-low-memory-composite-v001',status:'completed',
        scope:{startFrame:0,endFrameExclusive:expectedFrameCount,frameCount:expectedFrameCount},maxFrames,expectedOverlayCount,
        visibilityComposition,
        segments,maximumCaptions:Math.max(...segments.map(s=>s.captionCount)),
        maximumStates:Math.max(...segments.map(s=>s.stateCount)),
        maximumInputs:Math.max(...segments.map(s=>s.inputCount)),maximumProcesses:2,
        rawYuvStorage:'pipe-only',rawYuvBytes:bytes,rawYuvSha256:digest.digest('hex'),
        frameBytes:FRAME_BYTES,frameCoverage:'complete-contiguous-once',encoderArgs,output:await bind(outputPath)};
    }catch(error){await closeOwn(active);await closeOwn(encoder);throw error;}
  });
}

function start(ffmpeg,args,stdio){
  const child=spawn(ffmpeg,args,{stdio});let stderr='';child.stderr.on('data',b=>{stderr+=b.toString();});
  const closed=new Promise((resolve,reject)=>{child.once('error',reject);child.once('close',(code,signal)=>resolve({code,signal,stderr}));});
  return {child,closed};
}

/** History-only saved trial; next-video callers use the explicit formal entry. */
export async function runLowMemoryCompositeV001({x,background,audioRef,outputPath,maxFrames=DEFAULT_MAX_FRAMES,
  repeat=false,backgroundStartFrame=x.interval.start,backgroundFrameCount=x.interval.frameCount}){
  assert.equal(x.plan.canvas.fps,30);
  assert.equal(x.interval.frameCount,x.interval.end-x.interval.start);
  const records=executionRecordsV001(x.plan,x.rows,{repeat});
  const ranges=partitionFramesV001(x.interval.start,x.interval.end,maxFrames);
  const commands=ranges.map(range=>producerArgumentsV001({baseMediaPath:background.path,plan:x.plan,records,
    scopeStart:backgroundStartFrame,range,fullFrameCount:backgroundFrameCount,maxFrames}));
  const encoderArgs=['-hide_banner','-loglevel','error','-y','-f','rawvideo','-pixel_format','yuv420p',
    '-video_size','1920x1080','-framerate','30','-i','pipe:0','-i',audioRef.path,
    '-map','0:v:0','-map','1:a:0','-vf','setsar=1/1','-frames:v',String(x.interval.frameCount),
    '-c:v','libx264','-preset','fast','-crf','20','-pix_fmt','yuv420p','-c:a','copy',
    '-movie_timescale','30','-movflags','+faststart',outputPath];
  const encoder=start(x.i.tools.ffmpegPath,encoderArgs,['pipe','ignore','pipe']);
  encoder.child.stdin.on('error',()=>{});
  const digest=createHash('sha256');let bytes=0;const results=[];
  try{
    for(const command of commands){
      const producer=start(x.i.tools.ffmpegPath,command.args,['ignore','pipe','pipe']);
      let segmentBytes=0;
      try{
        for await(const block of producer.child.stdout){
          segmentBytes+=block.length;bytes+=block.length;digest.update(block);
          if(!encoder.child.stdin.write(block))await new Promise((resolve,reject)=>{
            const drained=()=>{encoder.child.stdin.off('error',failed);resolve();};
            const failed=error=>{encoder.child.stdin.off('drain',drained);reject(error);};
            encoder.child.stdin.once('drain',drained);encoder.child.stdin.once('error',failed);
          });
        }
        const result=await producer.closed;
        assert.equal(result.code,0,`producer failed: ${result.stderr}`);
        assert.equal(result.signal,null);
        assert.equal(segmentBytes,(command.range.endFrameExclusive-command.range.startFrame)*FRAME_BYTES);
        results.push({...command,bytes:segmentBytes,exitCode:result.code});
      }catch(error){producer.child.kill('SIGKILL');await producer.closed;throw error;}
    }
    encoder.child.stdin.end();const result=await encoder.closed;
    assert.equal(result.code,0,`encoder failed: ${result.stderr}`);assert.equal(result.signal,null);
    assert.equal(bytes,x.interval.frameCount*FRAME_BYTES);
    return {schemaVersion:'original-resolution-low-memory-composite-v001',scope:x.interval,
      maxFrames,segments:results,maximumCaptions:Math.max(...results.map(r=>r.captionCount)),
      maximumStates:Math.max(...results.map(r=>r.stateCount)),maximumInputs:Math.max(...results.map(r=>r.inputCount)),
      maximumProcesses:2,rawYuvBytes:bytes,rawYuvSha256:digest.digest('hex'),encoderArgs,
      output:await bind(outputPath)};
  }catch(error){encoder.child.kill('SIGKILL');await encoder.closed;throw error;}
}

export async function runSavedTrialV001(scopeId,sourceCompletion,directory,maxFrames=DEFAULT_MAX_FRAMES,
  useFullBackground=false){
  assert.notEqual(scopeId,'full','full execution awaits the next audit');
  await exclusiveExecutionDirectoryV001(directory);
  const old=await json(sourceCompletion),x=await loadExecutionInputV001(scopeId);
  assert.deepEqual(old.scope,x.interval);assert.equal(old.status,'media-verified-native-qc-pending');
  for(const ref of [old.background.background,old.audioRef,...old.videos.map(v=>v.video)])await verify(ref);
  const background=useFullBackground?await bind(FULL_BACKGROUND):old.background.background;
  await mkdir(directory);
  const videos=[];
  for(const [series,repeat] of [['normal',false],['repeat',true]]){
    const result=await runLowMemoryCompositeV001({x,background,audioRef:old.audioRef,
      outputPath:path.join(directory,series+'.mp4'),maxFrames,repeat,
      backgroundStartFrame:useFullBackground?0:x.interval.start,
      backgroundFrameCount:useFullBackground?FULL_FRAMES:x.interval.frameCount});
    videos.push({series,...result,existing:old.videos.find(v=>v.series===series).video});
  }
  assert.equal(videos[0].output.fileSha256,videos[1].output.fileSha256);
  return save(path.join(directory,'completion.json'),{schemaVersion:'original-resolution-low-memory-trial-v001',
    status:'encoded-comparison-pending',sourceCompletion:await bind(sourceCompletion),implementation:await bind(self),
    scope:x.interval,maxFrames,background,useFullBackground,videos,outlineChoice:null,humanQuality:'not-reviewed'});
}

export async function planFullLowMemoryV001(outputPath){
  const x=await loadExecutionInputV001('full');
  assert.equal(x.interval.frameCount,FULL_FRAMES);assert.equal(x.rows.length,307);
  const records=executionRecordsV001(x.plan,x.rows),ranges=partitionFramesV001(0,FULL_FRAMES);
  const commands=ranges.map(range=>producerArgumentsV001({baseMediaPath:FULL_BACKGROUND,plan:x.plan,
    records,scopeStart:0,range,fullFrameCount:FULL_FRAMES,maxFrames:DEFAULT_MAX_FRAMES}));
  const rows=commands.map(c=>({range:c.range,captionCount:c.captionCount,stateCount:c.stateCount,
    inputCount:c.inputCount,pngPaths:c.pngPaths,graphSha256:c.graphSha256}));
  assert.equal(rows.reduce((sum,r)=>sum+r.range.endFrameExclusive-r.range.startFrame,0),FULL_FRAMES);
  assert(rows.every(r=>r.stateCount<307));
  return save(outputPath,{schemaVersion:'original-resolution-low-memory-plan-v001',scope:x.interval,
    backgroundPath:FULL_BACKGROUND,maximumFramesPerSegment:DEFAULT_MAX_FRAMES,
    segmentCount:rows.length,maximumCaptions:Math.max(...rows.map(r=>r.captionCount)),
    maximumStates:Math.max(...rows.map(r=>r.stateCount)),maximumInputs:Math.max(...rows.map(r=>r.inputCount)),
    segments:rows,fullBody:'not-started',outlineChoice:null,humanQuality:'not-reviewed'});
}

if(process.argv[1]&&path.resolve(process.argv[1])===self){
  const [cmd,scope,source,out,max]=process.argv.slice(2);
  if(cmd==='trial')console.log(JSON.stringify(await runSavedTrialV001(scope,path.resolve(source),path.resolve(out),max?Number(max):DEFAULT_MAX_FRAMES,process.argv[7]==='full-background')));
  else if(cmd==='plan')console.log(JSON.stringify(await planFullLowMemoryV001(path.resolve(scope))));
  else assert.fail('trial/plan');
}
