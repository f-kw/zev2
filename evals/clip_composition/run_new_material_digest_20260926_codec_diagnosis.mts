/** Run-specific independent diagnosis authorized by the advisor on 2026-09-27. No QC pass flags are rewritten. */
import assert from 'node:assert/strict';
import {readFile, writeFile, mkdir, realpath} from 'node:fs/promises';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import path from 'node:path';
import {ROOT,ARTIFACTS} from './run_new_material_digest_20260926.mts';
import {fileSha256V002} from './presentation_renderer_qc_v002.mjs';
import {buildPresentationCompositeArgumentsV001} from './render_presentation_v002.mjs';
const root=path.join(ROOT,ARTIFACTS,'presentation');
const work=path.join(ROOT,'evals/clip_composition/outputs/presentation/.new-material-digest-20260926-first-draft-v001.presentation-renderer-v002-work-JdfNbP');
const out=path.join(root,'codec-diagnosis-000103-v001');
const read=async(p:string)=>JSON.parse(await readFile(p,'utf8'));
const save=async(n:string,v:any)=>writeFile(path.join(out,n),JSON.stringify(v,null,2)+'\n',{flag:'wx'});
const bind=async(p:string)=>({path:p,fileSha256:await fileSha256V002(p)});
const ffmpeg='/opt/homebrew/Cellar/ffmpeg/8.0.1_1/bin/ffmpeg',ffprobe='/opt/homebrew/Cellar/ffmpeg/8.0.1_1/bin/ffprobe',magick='/opt/homebrew/bin/magick';
const processes:any[]=[];
async function run(label:string,command:string,args:string[]){
 const startedAt=new Date().toISOString(),start=performance.now();
 try{const result=await promisify(execFile)(command,args,{encoding:'buffer',maxBuffer:128*1024*1024});
 await writeFile(path.join(out,label+'.stdout'),result.stdout,{flag:'wx'});await writeFile(path.join(out,label+'.stderr'),result.stderr,{flag:'wx'});
 processes.push({label,command,args,startedAt,endedAt:new Date().toISOString(),elapsedSeconds:(performance.now()-start)/1000,code:0});return result.stdout;
 }catch(e){processes.push({label,command,args,startedAt,endedAt:new Date().toISOString(),elapsedSeconds:(performance.now()-start)/1000,error:String(e)});throw e;}
}
async function main(){
 await mkdir(out);const startedAt=new Date().toISOString(),start=performance.now();
 try{
 const replay=await read(path.join(work,'scratch/exact-replay-result.json')),e=replay.evidence;
 assert.equal(replay.status,'passed');assert.deepEqual(replay.violations,[]);
 const plan=await read(path.join(work,'scratch/native-qc-preparation/plan.json'));
 const prep=await read(path.join(work,'scratch/native-qc-preparation/preparation.json'));
 const actual=await read(path.join(root,'render-processes/2841-video-composite/request.json'));
 const timing=await read(path.join(root,'render-processes/2841-video-composite/timing.json'));assert.equal(timing.code,0);
 const full=buildPresentationCompositeArgumentsV001({...e.compositorInput,plan,overlayRecords:prep.records});
 assert.deepEqual(full,e.compositorArguments);assert.deepEqual(actual.args.slice(0,-3),full);
 assert.deepEqual(actual.args.slice(-3,-1),['-movflags','+faststart']);
 const video=actual.args.at(-1),videoRef=await bind(video);assert.equal(videoRef.fileSha256,'11611ff2071aa21325eb672094b90f5c495b77af311aa409a460c69e7cb16b8a');
 const replayVideo=e.replay.path;assert.equal(await fileSha256V002(replayVideo),videoRef.fileSha256);
 const toolRef=e.inputManifest.refs.find((r:any)=>r.role==='tool:ffmpeg');assert.equal(await fileSha256V002(ffmpeg),toolRef.fileSha256);
 const alias='/opt/homebrew/bin/ffmpeg';assert.equal(await realpath(alias),await realpath(ffmpeg));assert.equal(await fileSha256V002(alias),toolRef.fileSha256);
 const version=await run('version-real',ffmpeg,['-version']),aliasVersion=await run('version-alias',alias,['-version']);assert(version.equals(aliasVersion));
 await save('tool-identity.json',{status:'passed',originalReplayPath:ffmpeg,originalNativePath:alias,realPath:await realpath(alias),fileSha256:toolRef.fileSha256,version:version.toString()});
 const target=7801,t=prep.records[102],previous=prep.records[101];assert(t.element.instructionId.endsWith('000103'));assert.equal(t.pngSha256,previous.pngSha256);
 const active=prep.records.map((r:any,index:number)=>({index,record:r})).filter(({record:r}:any)=>r.element.startFrame<=target&&target<r.element.endFrameExclusive);
 assert.equal(active.length,1);assert.equal(active[0].index,102);
 const graph=full[full.indexOf('-filter_complex')+1];
 await save('render-graph-proof.json',{status:'passed',target,videoRef,executedRequest:await bind(path.join(root,'render-processes/2841-video-composite/request.json')),builderExactlyMatchesExecutedArguments:true,
 captions:[previous,t].map((r:any)=>({instructionId:r.element.instructionId,startFrame:r.element.startFrame,endFrameExclusive:r.element.endFrameExclusive,pngPath:r.pngPath,pngSha256:r.pngSha256})),
 activeLayers:active.map(({index,record:r}:any)=>({order:index,instructionId:r.element.instructionId,pngSha256:r.pngSha256})),targetPngActiveLayerCount:1,
 relevantExecutedFilters:graph.split(';').filter((s:string)=>/\[(?:overlay10[12]|video10[234])\]/.test(s))});
 const keys=JSON.parse((await run('keyframes',ffprobe,['-v','error','-select_streams','v:0','-skip_frame','nokey','-show_entries','frame=pts_time,pict_type','-of','json',video])).toString()).frames.map((f:any)=>Math.round(Number(f.pts_time)*30));
 const startFrame=keys.filter((f:number)=>f<=target).at(-1),future=keys.filter((f:number)=>f>target);
 // Include the following complete GOP so the target's future references/lookahead are not flushed at its boundary.
 const endFrameExclusive=future[1];assert(startFrame<target&&target<future[0]&&future[0]<endFrameExclusive);
 const range={startFrame,endFrameExclusive,fullFrameCount:e.expectedFrameCount},count=endFrameExclusive-startFrame;
 await save('window.json',{...range,targetFrame:target,localTargetFrame:target-startFrame,observedKeyframes:[startFrame,...future.slice(0,2)],rationale:'直前の実keyframeから、target後の次GOPまで。孤立静止画ではなく同じ時間窓・codec optionsでE/Dを比較。windowはencoder履歴全体の再現ではない。'});
 const background=path.join(out,'background.nut');
 await run('window-background',ffmpeg,['-hide_banner','-loglevel','error','-n','-ss',String(startFrame/30),'-i',e.compositorInput.baseMediaPath,'-vf',`trim=end_frame=${count},setpts=PTS-STARTPTS`,'-an','-frames:v',String(count),'-c:v','ffv1','-level','3',background]);
 const records=prep.records.filter((r:any)=>r.element.startFrame<endFrameExclusive&&r.element.endFrameExclusive>startFrame);
 const duplicate={...t,element:{...t.element,instructionId:t.element.instructionId+'-diagnostic-duplicate'}};
 const duplicateRecords=records.flatMap((r:any)=>r.element.instructionId===t.element.instructionId?[r,duplicate]:[r]);
 const images:any={};
 for(const [label,rs] of [['expected',records],['duplicate',duplicateRecords]] as const){
 const args=buildPresentationCompositeArgumentsV001({baseMediaPath:background,plan,overlayRecords:rs,expectedFrameCount:count,serializePngAndFilters:true,renderRange:range});
 const mp4=path.join(out,label+'.mp4');await run(label+'-encode',ffmpeg,[...args,'-movflags','+faststart',mp4]);
 const png=path.join(out,label+'.png');await run(label+'-frame',ffmpeg,['-hide_banner','-loglevel','error','-n','-i',mp4,'-vf',`select=eq(n\\,${target-startFrame})`,'-frames:v','1',png]);images[label]=png;
 }
 const inspection=await read(path.join(root,'qc-resume-attempt-002/failure-inspection-000103.json')),sample=inspection.nativeFrameQc.samples[0];assert.equal(sample.frame,target);
 const backgroundPng=path.join(out,'window-target-background.png');
 await run('background-target-frame',ffmpeg,['-hide_banner','-loglevel','error','-n','-i',background,'-vf',`select=eq(n\\,${target-startFrame})`,'-frames:v','1',backgroundPng]);
 const localBaseRgb=await run('local-background-rgb',magick,[backgroundPng,'-alpha','off','-depth','8','rgb:-']);
 const originalBaseRgb=await run('original-background-rgb',magick,[sample.baseFrame.path,'-alpha','off','-depth','8','rgb:-']);
 assert(localBaseRgb.equals(originalBaseRgb));
 await save('window-alignment-proof.json',{status:'passed',targetFrame:target,localFrame:target-startFrame,
 windowBackgroundRgbEqualsOriginalBaseFrame:true,originalBaseFrame:sample.baseFrame});
 const crop=sample.crop,completed=await readFile(sample.completedRgb.path);assert.equal(await fileSha256V002(sample.completedRgb.path),sample.completedRgb.fileSha256);
 const distances:any={};
 for(const label of ['expected','duplicate']){
 const rgb=await run(label+'-rgb',magick,[images[label],'-crop',`${crop.width}x${crop.height}+${crop.left}+${crop.top}`,'+repage','-alpha','off','-depth','8','rgb:-']);
 assert.equal(rgb.length,completed.length);let distance=0;for(let i=0;i<rgb.length;i++)distance+=Math.abs(rgb[i]-completed[i]);distances[label]=distance;
 }
 assert.equal(await fileSha256V002(video),videoRef.fileSha256);
 const resolved=distances.expected<distances.duplicate;
 await save('result.json',{status:resolved?'resolved':'unresolved',resolution:resolved?'codec-domain false positive resolved':null,distances,uniqueMinimum:resolved?'expected':null,
 originalNativeFailurePreserved:true,originalNativeDistances:{expected:1345125,duplicate:1344947},nativeQcPassed:423,nativeQcSamples:424,
 originalVideo:videoRef,wholeReplayByteIdentityMaintained:true,activePngLayers:1,window:range,
 toolIdentity:await bind(path.join(out,'tool-identity.json')),renderGraphProof:await bind(path.join(out,'render-graph-proof.json')),completedReference:sample.completedRgb,
 diagnosticFiles:await Promise.all(['expected.mp4','duplicate.mp4','expected.png','duplicate.png'].map(n=>bind(path.join(out,n)))),noProductionVideoChanges:true,
 note:'比較対象は相談役が指定した正しい1回描画Eと同じPNGの二重描画D。既存native failureを合格へ書き換えない。'});
 await save('execution.json',{status:'completed',startedAt,endedAt:new Date().toISOString(),elapsedSeconds:(performance.now()-start)/1000,processes});console.log(JSON.stringify({resolved,distances}));
 }catch(error){await save('execution.json',{status:'failed',startedAt,endedAt:new Date().toISOString(),elapsedSeconds:(performance.now()-start)/1000,processes,error:String(error)});throw error;}
}
await main();
