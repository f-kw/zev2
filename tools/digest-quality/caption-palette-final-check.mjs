/** Cross-media check after separate-process saved-output readers. */
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import path from 'node:path';
import {bindDigestStructureFileV001 as bind,verifyDigestStructureFileV001 as verify} from './digest-structure-evidence.mjs';
const base=path.resolve('runtime/artifacts/caption-palette-20260929-v001');
const json=async p=>JSON.parse(await readFile(p,'utf8'));
const names=['yellow','cyan','override','normal','reset'];const records={};
for(const name of names){
 const run=await json(path.join(base,`reread-${name}-result.json`));assert.equal(run.status,'passed');
 assert.equal(run.result.status,'development-proxy-palette-ready');
 const c=run.result.completion;await verify(run.result.completionRef);await verify(c.outputVideo);records[name]=c;
}
const initial=records.cyan,reset=records.reset;
assert.equal(initial.outputVideo.fileSha256,reset.outputVideo.fileSha256,'Reset MP4 must return byte-exactly');
assert.equal(initial.outputVideo.bytes,reset.outputVideo.bytes);
const target='new-material-digest-20260926-v001-instruction-instruction-000197-readability-02';
const edited=['cyan','override','normal','reset'];let unchangedOverlays=0;
for(const name of edited){
 const c=records[name];assert.deepEqual(c.range,initial.range);assert.deepEqual(c.outputVideoClock,initial.outputVideoClock);
 assert.deepEqual(c.outputAudioClock,initial.outputAudioClock);assert.equal(c.localMedia.rangePcmSha256,initial.localMedia.rangePcmSha256);
 for(let i=0;i<c.stateRecords.length;i++){
  const row=c.stateRecords[i],before=initial.stateRecords[i];assert.equal(row.captionId,before.captionId);
  if(row.captionId!==target){assert.deepEqual(row.props,before.props);assert.equal(row.png.fileSha256,before.png.fileSha256);unchangedOverlays++;}
 }
}
const targetRows=Object.fromEntries(edited.map(n=>[n,records[n].stateRecords.find(r=>r.captionId===target)]));
assert.equal(targetRows.cyan.props.presentationColorRange.fontColor,'#87CEFA');
assert.equal(targetRows.override.props.presentationColorRange.fontColor,'#FFD65A');
assert.equal(targetRows.normal.props.presentationColorRange,undefined);
assert.deepEqual(targetRows.reset.props,targetRows.cyan.props);
const raw=p=>execFileSync(initial.tools.imageMagickPath,[p,'-depth','8','rgba:-'],{maxBuffer:8*1024*1024});
const bytes=Object.fromEntries(edited.map(n=>[n,raw(targetRows[n].png.path)]));assert(bytes.cyan.equals(bytes.reset));
const pixelChecks={};
for(const [name,hex] of [['cyan','#87CEFA'],['override','#FFD65A'],['normal',targetRows.normal.props.visualState.textStyle.fontColor]]){
 const a=bytes[name],b=bytes.cyan,rgb=[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16));let alphaDifferences=0,changedPixels=0,colorPixels=0;
 for(let i=0;i<a.length;i+=4){if(a[i+3]!==b[i+3])alphaDifferences++;if(!a.subarray(i,i+4).equals(b.subarray(i,i+4)))changedPixels++;
 if(a[i+3]===255&&rgb.every((v,j)=>a[i+j]===v))colorPixels++;}
 assert.equal(alphaDifferences,0);assert(colorPixels>0);if(name!=='cyan')assert(changedPixels>0);
 pixelChecks[name]={alphaDifferences,changedPixels,colorPixels,color:hex};
}
const mediaFrames=[];
for(const name of edited){
 const png=path.join(base,`media-${name}-frame-75.png`);
 execFileSync(initial.tools.ffmpegPath,['-hide_banner','-nostdin','-v','error','-n','-i',records[name].outputVideo.path,'-vf','select=eq(n\\,75)','-frames:v','1',png]);
 mediaFrames.push({name,frame:75,sourceFrame:initial.range.startFrame+75,png:await bind(png)});
}
assert.equal(mediaFrames[0].png.fileSha256,mediaFrames[3].png.fileSha256);
assert.notEqual(mediaFrames[0].png.fileSha256,mediaFrames[1].png.fileSha256);
assert.notEqual(mediaFrames[1].png.fileSha256,mediaFrames[2].png.fileSha256);
const preserved=await json(path.join(base,'preserved-verification.json'));
// Verify every stored file reference recursively; includes old media/code bindings.
const refs=[];function collect(v){if(!v||typeof v!=='object')return;if(typeof v.path==='string'&&typeof v.fileSha256==='string')refs.push(v);else Object.values(v).forEach(collect);}
collect(preserved);assert(refs.length>0);for(const ref of refs)await verify(ref);
const result={status:'passed',observedAt:new Date().toISOString(),targetCaptionId:target,
 resetVideoByteIdentical:true,resetVideo:reset.outputVideo,originalVideo:initial.outputVideo,
 unchangedNonTargetOverlayComparisons:unchangedOverlays,pixelChecks,mediaFrames,
 commonRange:initial.range,frameCount:initial.outputMedia.video.frameCount,audioClock:initial.outputAudioClock,
 independentReads:await Promise.all(names.map(n=>bind(path.join(base,`reread-${n}-result.json`)))),
 preservedInputReferencesChecked:refs.length,preservedVerificationRef:await bind(path.join(base,'preserved-verification.json')),
 media:await Promise.all(names.map(async name=>({name,video:records[name].outputVideo,completion:await bind(path.join(base,'clips',name,'completion.json'))}))),
 humanQuality:'not-evaluated',final1080pQc:'not-run',productionDefaultChanged:false};
await writeFile(path.join(base,'final-verification.json'),JSON.stringify(result,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({status:result.status,resetVideoByteIdentical:true,pixelChecks,preservedInputReferencesChecked:refs.length}));
