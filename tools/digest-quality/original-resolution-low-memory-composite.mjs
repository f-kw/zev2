/** Finite, sequential YUV compositor for the fixed original-resolution Digest.
 * The existing renderer owns all overlay expressions; this module only scopes
 * its inputs and replaces its per-range encoder with one continuous encoder. */
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {createHash} from 'node:crypto';
import {mkdir} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {buildPresentationCompositeArgumentsV001} from '../../evals/clip_composition/render_presentation_v002.mjs';
import {EXECUTION_AREA,json,loadExecutionInputV001,executionRecordsV001,exclusiveExecutionDirectoryV001} from './original-resolution-execution-input.mjs';
import {bindDigestStructureFileV001 as bind,verifyDigestStructureFileV001 as verify,saveDigestStructureFileV001 as save} from './digest-structure-evidence.mjs';

const self=fileURLToPath(import.meta.url);
const FRAME_BYTES=1920*1080*3/2;
export const FULL_FRAMES=17613;
export const DEFAULT_MAX_FRAMES=210; // The existing seven-second trial length.
const FULL_BACKGROUND=path.join(EXECUTION_AREA,'full-production-001/background/background.nut');

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
export function producerArgumentsV001({baseMediaPath,plan,records,scopeStart,range,fullFrameCount,maxFrames}){
  assert(range.startFrame>=scopeStart&&range.endFrameExclusive<=scopeStart+fullFrameCount);
  assert(range.endFrameExclusive-range.startFrame<=maxFrames);
  const active=records.filter(r=>r.element.startFrame<range.endFrameExclusive&&r.element.endFrameExclusive>range.startFrame);
  const original=buildPresentationCompositeArgumentsV001({baseMediaPath,plan,overlayRecords:active,
    expectedFrameCount:range.endFrameExclusive-range.startFrame,serializePngAndFilters:true,
    renderRange:{...range,fullFrameCount:FULL_FRAMES}});
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

function start(ffmpeg,args,stdio){
  const child=spawn(ffmpeg,args,{stdio});let stderr='';child.stderr.on('data',b=>{stderr+=b.toString();});
  const closed=new Promise((resolve,reject)=>{child.once('error',reject);child.once('close',(code,signal)=>resolve({code,signal,stderr}));});
  return {child,closed};
}

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
