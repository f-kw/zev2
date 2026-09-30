/** Independent direct-render and encoded-media comparison for saved short trials. */
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {buildPresentationCompositeArgumentsV001} from '../../evals/clip_composition/render_presentation_v002.mjs';
import {loadExecutionInputV001,executionRecordsV001} from './original-resolution-execution-input.mjs';
import {saveDigestStructureFileV001 as save,verifyDigestStructureFileV001 as verify} from './digest-structure-evidence.mjs';

const self=fileURLToPath(import.meta.url),FRAME_BYTES=1920*1080*3/2;
const json=async p=>JSON.parse(await readFile(p,'utf8'));
async function digestCommand(binary,args){
  const child=spawn(binary,args,{stdio:['ignore','pipe','pipe']});const hash=createHash('sha256');let bytes=0,stderr='';
  const closed=new Promise((resolve,reject)=>{child.once('error',reject);child.once('close',(code,signal)=>resolve({code,signal}));});
  child.stderr.on('data',b=>{stderr+=b.toString();});
  for await(const chunk of child.stdout){bytes+=chunk.length;hash.update(chunk);}
  const result=await closed;
  assert.equal(result.code,0,stderr);assert.equal(result.signal,null);
  return {bytes,sha256:hash.digest('hex')};
}
async function probe(binary,file){
  const child=spawn(binary,['-v','error','-show_entries','stream=index,codec_name,codec_type,width,height,r_frame_rate,nb_frames,time_base,duration_ts,extradata_size','-show_entries','format=duration,size','-of','json',file],{stdio:['ignore','pipe','pipe']});
  const closed=new Promise((resolve,reject)=>{child.once('error',reject);child.once('close',(code,signal)=>resolve({code,signal}));});
  let output='',stderr='';for await(const block of child.stdout)output+=block.toString();for await(const block of child.stderr)stderr+=block.toString();
  const result=await closed;
  assert.equal(result.code,0,stderr);return JSON.parse(output);
}
export async function compareLowMemoryTrialV001(lowPath,outputPath){
  const low=await json(lowPath),old=await json(low.sourceCompletion.path),x=await loadExecutionInputV001(low.scope.id);
  assert.deepEqual(low.scope,x.interval);await verify(low.sourceCompletion);
  const rows=[];
  for(const v of low.videos){
    await verify(v.output);await verify(v.existing);
    const records=executionRecordsV001(x.plan,x.rows,{repeat:v.series==='repeat'});
    const original=buildPresentationCompositeArgumentsV001({baseMediaPath:old.background.background.path,plan:x.plan,
      overlayRecords:records,expectedFrameCount:x.interval.frameCount,serializePngAndFilters:true,renderRange:x.interval.range});
    const map=original.indexOf('-map');assert(map>0);
    const oldYuv=await digestCommand(x.i.tools.ffmpegPath,[...original.slice(0,map),'-map','[video]',
      '-frames:v',String(x.interval.frameCount),'-c:v','rawvideo','-pix_fmt','yuv420p','-f','rawvideo','pipe:1']);
    const decode=file=>digestCommand(x.i.tools.ffmpegPath,['-hide_banner','-loglevel','error','-i',file,
      '-map','0:v:0','-fps_mode','passthrough','-pix_fmt','yuv420p','-f','rawvideo','pipe:1']);
    const aac=file=>digestCommand(x.i.tools.ffmpegPath,['-hide_banner','-loglevel','error','-i',file,
      '-map','0:a:0','-c:a','copy','-f','adts','pipe:1']);
    const pcm=file=>digestCommand(x.i.tools.ffmpegPath,['-hide_banner','-loglevel','error','-i',file,
      '-map','0:a:0','-f','s16le','-acodec','pcm_s16le','-ar','44100','-ac','2','pipe:1']);
    const oldDecoded=await decode(v.existing.path),newDecoded=await decode(v.output.path);
    const oldAac=await aac(v.existing.path),newAac=await aac(v.output.path),referenceAac=await aac(old.audioRef.path);
    const oldPcm=await pcm(v.existing.path),newPcm=await pcm(v.output.path),referencePcm=await pcm(old.audioRef.path);
    const oldProbe=await probe(x.i.tools.ffprobePath,v.existing.path),newProbe=await probe(x.i.tools.ffprobePath,v.output.path);
    rows.push({series:v.series,rangeCount:v.segments.length,
      originalRawYuv:oldYuv,newRawYuv:{bytes:v.rawYuvBytes,sha256:v.rawYuvSha256},
      rawYuvEqual:oldYuv.bytes===v.rawYuvBytes&&oldYuv.sha256===v.rawYuvSha256,
      oldDecoded,newDecoded,decodedEqual:oldDecoded.sha256===newDecoded.sha256&&oldDecoded.bytes===newDecoded.bytes,
      expectedRawBytes:x.interval.frameCount*FRAME_BYTES,oldAac,newAac,referenceAac,
      aacEqual:oldAac.sha256===newAac.sha256&&oldAac.bytes===newAac.bytes,
      aacMatchesReference:newAac.sha256===referenceAac.sha256&&newAac.bytes===referenceAac.bytes,
      oldPcm,newPcm,referencePcm,pcmEqual:oldPcm.sha256===newPcm.sha256&&oldPcm.bytes===newPcm.bytes,
      pcmMatchesReference:newPcm.sha256===referencePcm.sha256&&newPcm.bytes===referencePcm.bytes,
      oldProbe,newProbe,mp4ByteEqual:v.output.fileSha256===v.existing.fileSha256});
  }
  return save(outputPath,{schemaVersion:'original-resolution-low-memory-comparison-v001',scope:x.interval,
    sourceCompletion:low.sourceCompletion,trialCompletion:lowPath,rows,outlineChoice:null,humanQuality:'not-reviewed'});
}
if(process.argv[1]&&path.resolve(process.argv[1])===self){console.log(JSON.stringify(await compareLowMemoryTrialV001(path.resolve(process.argv[2]),path.resolve(process.argv[3]))));}
